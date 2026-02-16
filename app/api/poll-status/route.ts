import { NextRequest, NextResponse } from 'next/server';
import { getTable } from '@/lib/airtable';
import { getRunStatus, fetchDatasetItems } from '@/lib/apify';
import { mapApifyToAirtable, getPromptExtras } from '@/lib/scrape-mapper';
import { runFreemiumAnalysis } from '@/lib/ai-analysis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('recordId');

    if (!recordId || !recordId.startsWith('rec')) {
      return NextResponse.json(
        { error: 'Valid recordId is required' },
        { status: 400 }
      );
    }

    const table = getTable();
    const record = await table.find(recordId);
    const status = record.get('Status') as string;

    switch (status) {
      case 'scraping': {
        const runId = record.get('Apify Run ID') as string;
        if (!runId) {
          return NextResponse.json({ status: 'error', message: 'No Apify run ID found' });
        }

        const apifyStatus = await getRunStatus(runId);

        if (apifyStatus === 'RUNNING' || apifyStatus === 'READY') {
          return NextResponse.json({ status: 'scraping' });
        }

        if (apifyStatus === 'SUCCEEDED') {
          const datasetId = record.get('Apify Dataset ID') as string;
          const items = await fetchDatasetItems(datasetId);

          if (!items || items.length === 0) {
            await table.update(recordId, { Status: 'error' });
            return NextResponse.json({
              status: 'error',
              message: 'Scraper returned no results',
            });
          }

          const item = items[0];
          const fields = mapApifyToAirtable(item);

          // Store the raw Apify item ID for the AI prompt
          const extras = getPromptExtras(item);

          // Update Airtable with all scraped fields
          await table.update(recordId, {
            ...fields,
            Status: 'scraped',
          });

          return NextResponse.json({ status: 'scraped' });
        }

        // FAILED, ABORTED, TIMED-OUT
        await table.update(recordId, { Status: 'error' });
        return NextResponse.json({
          status: 'error',
          message: `Scraper ${apifyStatus.toLowerCase()}`,
        });
      }

      case 'scraped': {
        // Read listing fields from the record for the AI prompt
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

        await table.update(recordId, {
          'Freemium AI Response': analysis,
          Status: 'analyzed',
        });

        return NextResponse.json({ status: 'analyzed', recordId });
      }

      case 'analyzed':
        return NextResponse.json({ status: 'complete', recordId });

      case 'error':
        return NextResponse.json({
          status: 'error',
          message: 'Analysis failed',
        });

      default:
        return NextResponse.json({ status: status || 'unknown' });
    }
  } catch (error) {
    console.error('Error in /api/poll-status:', error);
    return NextResponse.json(
      {
        error: 'Failed to check status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
