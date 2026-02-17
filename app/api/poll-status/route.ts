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
  try {
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('recordId');
    const runId = searchParams.get('runId');
    const datasetId = searchParams.get('datasetId');

    if (!recordId || !recordId.startsWith('rec')) {
      return NextResponse.json(
        { error: 'Valid recordId is required' },
        { status: 400 }
      );
    }

    const table = getTable();
    const record = await table.find(recordId);
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
      const fields = {
        Headline: (record.get('Headline') as string) || '',
        'Property Type': (record.get('Property Type') as string) || '',
        'Amenities List': (record.get('Amenities List') as string) || '',
        'Overall Rating': record.get('Overall Rating') as number | undefined,
        'Latitude, Longitude': (record.get('Latitude, Longitude') as string) || '',
        City: (record.get('City') as string) || '',
        'Maximum Guests': record.get('Maximum Guests') as number | undefined,
        'Number of Beds': (record.get('Number of Beds') as string) || '',
        Bathrooms: (record.get('Bathrooms') as string) || '',
        Bedrooms: record.get('Bedrooms') as number | undefined,
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
        'Superhost Status': (record.get('Superhost Status') as string) || '',
        'Photo Notes': (record.get('Photo Notes') as string) || '',
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
    }

    // If we already have the AI response → done
    if (hasScrapedData && record.get('Freemium AI Response')) {
      return NextResponse.json({ status: 'complete', recordId });
    }

    // No scraped data yet → still scraping, check Apify run status
    if (!runId) {
      return NextResponse.json({ status: 'error', message: 'No runId provided' });
    }

    const apifyStatus = await getRunStatus(runId);

    if (apifyStatus === 'RUNNING' || apifyStatus === 'READY') {
      return NextResponse.json({ status: 'scraping' });
    }

    if (apifyStatus === 'SUCCEEDED') {
      if (!datasetId) {
        return NextResponse.json({ status: 'error', message: 'No datasetId provided' });
      }
      const items = await fetchDatasetItems(datasetId);

      if (!items || items.length === 0) {
        return NextResponse.json({
          status: 'error',
          message: 'Scraper returned no results',
        });
      }

      const item = items[0];
      const scrapedFields = mapApifyToAirtable(item);

      // Save scraped fields to Airtable (don't set Status — no select option for it)
      await table.update(recordId, { ...scrapedFields });

      // Tell client to poll again — next poll will see Headline and run AI
      return NextResponse.json({ status: 'scraped' });
    }

    // FAILED, ABORTED, TIMED-OUT
    return NextResponse.json({
      status: 'error',
      message: `Scraper ${apifyStatus.toLowerCase()}`,
    });
  } catch (error: unknown) {
    const message = serializeError(error);
    console.error('Error in /api/poll-status:', message, error);
    return NextResponse.json(
      {
        error: 'Failed to check status',
        message,
      },
      { status: 500 }
    );
  }
}
