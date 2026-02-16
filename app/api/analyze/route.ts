import { NextRequest, NextResponse } from 'next/server';
import { getTable } from '@/lib/airtable';
import { startActorRun } from '@/lib/apify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { airbnbUrl, email, email_source, ...utmParams } = await request.json();

    if (!airbnbUrl || typeof airbnbUrl !== 'string') {
      return NextResponse.json(
        { error: 'airbnbUrl is required' },
        { status: 400 }
      );
    }

    // Start the Apify scraper run (async — doesn't wait for completion)
    const { runId, datasetId } = await startActorRun(airbnbUrl);

    // Create the Airtable record with initial data
    const table = getTable();
    const records = await table.create([
      {
        fields: {
          'Listing URL': airbnbUrl,
          Status: 'scraping',
          'Apify Run ID': runId,
          'Apify Dataset ID': datasetId,
          'Date Captured': new Date().toISOString().split('T')[0],
          ...(email && { Email: email }),
          ...(email_source && { email_source }),
          ...Object.fromEntries(
            Object.entries(utmParams).filter(
              ([key]) => key.startsWith('utm_') && typeof utmParams[key] === 'string'
            )
          ),
        },
      },
    ]);

    return NextResponse.json({
      status: 'success',
      recordId: records[0].id,
    });
  } catch (error) {
    console.error('Error in /api/analyze:', error);
    return NextResponse.json(
      {
        error: 'Failed to start analysis',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
