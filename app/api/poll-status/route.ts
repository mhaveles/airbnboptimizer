import { NextRequest, NextResponse } from 'next/server';
import { getTable } from '@/lib/airtable';
import { getRunStatus, fetchDatasetItems } from '@/lib/apify';
import { mapApifyToAirtable, getPromptExtras } from '@/lib/scrape-mapper';
import { runFreemiumAnalysis } from '@/lib/ai-analysis';
import { serializeError } from '@/lib/error-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Poll the status of an analysis pipeline.
 *
 * The Airtable "Status" field is a Single Select with pre-existing options
 * from the Make.com era: "analyzed", "paid_webhook2_triggered",
 * "premium_description_completed". We only write those values.
 *
 * Intermediate states are inferred:
 *   - Status is empty + no Headline → still scraping
 *   - Status is empty + has Headline → scraped, needs AI analysis
 *   - Status is "analyzed"          → done
 */
export async function GET(request: NextRequest) {
  // Validate required env vars upfront
  const missingEnvVars = [
    !process.env.APIFY_API_TOKEN && 'APIFY_API_TOKEN',
    !(process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN) && 'AIRTABLE_API_KEY',
    !process.env.AIRTABLE_BASE_ID && 'AIRTABLE_BASE_ID',
    !process.env.OPENAI_API_KEY && 'OPENAI_API_KEY',
  ].filter(Boolean);

  if (missingEnvVars.length > 0) {
    return NextResponse.json(
      { status: 'error', message: `Missing environment variables: ${missingEnvVars.join(', ')}` },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const recordId = searchParams.get('recordId');
  const runId = searchParams.get('runId');
  const datasetId = searchParams.get('datasetId');

  if (!recordId || !recordId.startsWith('rec')) {
    return NextResponse.json(
      { status: 'error', message: 'Valid recordId is required' },
      { status: 400 }
    );
  }

  // Step 1: Fetch record from Airtable
  let table: ReturnType<typeof getTable>;
  let record: { get(field: string): unknown };
  try {
    table = getTable();
    record = await table.find(recordId);
  } catch (error: unknown) {
    return NextResponse.json(
      { status: 'error', message: `Airtable find failed: ${serializeError(error)}` },
      { status: 500 }
    );
  }

  const status = record.get('Status') as string | undefined;

  // Already analyzed — done
  if (status === 'analyzed') {
    return NextResponse.json({ status: 'complete', recordId });
  }

  // Already in paid flow or beyond — also done for freemium purposes
  if (status === 'paid_webhook2_triggered' || status === 'premium_description_completed') {
    return NextResponse.json({ status: 'complete', recordId });
  }

  // Check if we already have scraped data (Headline populated)
  const hasScrapedData = !!record.get('Headline');

  // If we have scraped data but no AI response yet → run AI analysis
  if (hasScrapedData && !record.get('Freemium AI Response')) {
    try {
      const fields = {
        Headline: (record.get('Headline') as string) || '',
        'Property Type': (record.get('Property Type') as string) || '',
        'Amenities List': (record.get('Amenities List') as string) || '',
        'Overall Rating': record.get('Overall Rating') as number | undefined,
        'Latitude, Longitude': (record.get('Latitude, Longitude') as string) || '',
        City: (record.get('City') as string) || '',
        'Maximum Guests': record.get('Maximum Guests') as number | undefined,
        'Number of Beds': (record.get('Number of Beds') as string) || '',
        Bathrooms: record.get('Bathrooms') as number | undefined,
        Bedrooms: (record.get('Bedrooms') as string) || '',
        'Host Name': (record.get('Host Name') as string) || '',
        'Host ID': (record.get('Host ID') as string) || '',
        Description: (record.get('Description') as string) || '',
        'Cover Photo URL': (record.get('Cover Photo URL') as string) || '',
        'Cover Photo Caption': (record.get('Cover Photo Caption') as string) || '',
        'Number of Reviews': record.get('Number of Reviews') as number | undefined,
        'Accuracy Rating': record.get('Accuracy Rating') as number | undefined,
        'Communication Rating': record.get('Communication Rating') as number | undefined,
        'Cleanliness Rating': record.get('Cleanliness Rating') as number | undefined,
        'Location Rating': record.get('Location Rating') as number | undefined,
        'Check In Rating': record.get('Check In Rating') as number | undefined,
        'Value Rating': record.get('Value Rating') as number | undefined,
        'SEO heading': (record.get('SEO heading') as string) || '',
        'Superhost Status': !!record.get('Superhost Status'),
        'Number of Photos': record.get('Number of Photos') as number | undefined,
        'Photo Captions': (record.get('Photo Captions') as string) || '',
      };

      const extras = {
        listingId: (record.get('Host ID') as string) || '',
        hostResponseRate: '',
        hostResponseTime: '',
      };

      const analysis = await runFreemiumAnalysis(fields, extras);

      // "analyzed" exists as a Single Select option in Airtable
      await table.update(recordId, {
        'Freemium AI Response': analysis,
        Status: 'analyzed',
      });

      return NextResponse.json({ status: 'analyzed', recordId });
    } catch (error: unknown) {
      const msg = serializeError(error);
      console.error('AI analysis failed:', msg, error);
      return NextResponse.json(
        { status: 'error', message: `AI analysis failed: ${msg}` },
        { status: 500 }
      );
    }
  }

  // If we already have the AI response → done
  if (hasScrapedData && record.get('Freemium AI Response')) {
    return NextResponse.json({ status: 'complete', recordId });
  }

  // No scraped data yet → still scraping, check Apify run status
  if (!runId) {
    return NextResponse.json({ status: 'error', message: 'No runId provided' });
  }

  // Step 2: Check Apify run status
  let apifyStatus: string;
  try {
    apifyStatus = await getRunStatus(runId);
  } catch (error: unknown) {
    const msg = serializeError(error);
    console.error('Apify getRunStatus failed:', msg, error);
    return NextResponse.json(
      { status: 'error', message: `Apify status check failed: ${msg}` },
      { status: 500 }
    );
  }

  if (apifyStatus === 'RUNNING' || apifyStatus === 'READY') {
    return NextResponse.json({ status: 'scraping' });
  }

  if (apifyStatus === 'SUCCEEDED') {
    if (!datasetId) {
      return NextResponse.json({ status: 'error', message: 'No datasetId provided' });
    }

    // Step 3: Fetch dataset items from Apify
    let items: any[];
    try {
      items = await fetchDatasetItems(datasetId);
    } catch (error: unknown) {
      const msg = serializeError(error);
      console.error('Apify fetchDatasetItems failed:', msg, error);
      return NextResponse.json(
        { status: 'error', message: `Apify dataset fetch failed: ${msg}` },
        { status: 500 }
      );
    }

    // Timing: dataset may not be populated immediately after SUCCEEDED.
    // Return "scraping" so the client retries instead of treating it as a permanent error.
    if (!items || items.length === 0) {
      console.warn('Apify run SUCCEEDED but dataset is empty — will retry on next poll');
      return NextResponse.json({ status: 'scraping' });
    }

    // Step 4: Map Apify data to Airtable fields
    const item = items[0];

    // Debug: log raw photo structure so we can verify field names
    if (Array.isArray(item.photos) && item.photos.length > 0) {
      console.log('[poll-status] Raw Apify photo keys:', Object.keys(item.photos[0]));
      console.log('[poll-status] First 3 photos sample:', JSON.stringify(item.photos.slice(0, 3), null, 2));
    } else {
      console.log('[poll-status] No photos array in Apify response');
    }

    let cleanFields: Record<string, unknown>;
    try {
      const scrapedFields = mapApifyToAirtable(item);
      // Filter out undefined values — Airtable rejects them
      cleanFields = Object.fromEntries(
        Object.entries(scrapedFields).filter(([, v]) => v !== undefined)
      );
    } catch (error: unknown) {
      const msg = serializeError(error);
      console.error('Data mapping failed:', msg, error);
      return NextResponse.json(
        { status: 'error', message: `Data mapping failed: ${msg}` },
        { status: 500 }
      );
    }

    // Step 5: Update Airtable with scraped data (include run/dataset IDs for traceability)
    if (runId) cleanFields['Apify Run ID'] = runId;
    if (datasetId) cleanFields['Request ID'] = datasetId;
    try {
      await table.update(recordId, cleanFields as Record<string, string | number | boolean>);
    } catch (error: unknown) {
      const msg = serializeError(error);
      console.error('Airtable update failed:', msg, error);
      // Include which fields we tried to write for debugging
      const fieldNames = Object.keys(cleanFields).join(', ');
      return NextResponse.json(
        { status: 'error', message: `Airtable update failed: ${msg}. Fields attempted: ${fieldNames}` },
        { status: 500 }
      );
    }

    // Step 6: Run AI analysis immediately with raw Apify data (includes photo URLs)
    try {
      const scrapedFields = mapApifyToAirtable(item);
      const extras = getPromptExtras(item);
      const analysis = await runFreemiumAnalysis(scrapedFields, extras);

      await table.update(recordId, {
        'Freemium AI Response': analysis,
        Status: 'analyzed',
      });

      return NextResponse.json({ status: 'analyzed', recordId });
    } catch (error: unknown) {
      const msg = serializeError(error);
      console.error('AI analysis failed after scrape:', msg, error);
      // Scraped data is saved — client can retry and the existing
      // hasScrapedData path will pick it up (without photo URLs)
      return NextResponse.json({ status: 'scraped' });
    }
  }

  // FAILED, ABORTED, TIMED-OUT
  return NextResponse.json({
    status: 'error',
    message: `Scraper ${apifyStatus.toLowerCase()}`,
  });
}
