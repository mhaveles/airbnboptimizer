import { NextRequest, NextResponse } from 'next/server';
import { getTable } from '@/lib/airtable';
import { startActorRun } from '@/lib/apify';
import { serializeError } from '@/lib/error-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Validate required env vars upfront — gives clear errors on misconfigured deployments
    const missingEnvVars = [
      !process.env.APIFY_API_TOKEN && 'APIFY_API_TOKEN',
      !(process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN) && 'AIRTABLE_API_KEY',
      !process.env.AIRTABLE_BASE_ID && 'AIRTABLE_BASE_ID',
    ].filter(Boolean);

    if (missingEnvVars.length > 0) {
      console.error('Missing env vars:', missingEnvVars);
      return NextResponse.json(
        {
          error: 'Server configuration error',
          message: `Missing environment variables: ${missingEnvVars.join(', ')}`,
        },
        { status: 500 }
      );
    }

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
  } catch (error: unknown) {
    const message = serializeError(error);
    console.error('Error in /api/analyze:', message, error);
    return NextResponse.json(
      {
        error: 'Failed to start analysis',
        message,
      },
      { status: 500 }
    );
  }
}
