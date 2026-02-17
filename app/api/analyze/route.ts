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

    const body = await request.json();
    const airbnbUrl = body.airbnbUrl;
    const email = body.email;
    const emailSource = body.email_source;

    if (!airbnbUrl || typeof airbnbUrl !== 'string') {
      return NextResponse.json(
        { error: 'airbnbUrl is required' },
        { status: 400 }
      );
    }

    // Start the Apify scraper run (async — doesn't wait for completion)
    const { runId, datasetId } = await startActorRun(airbnbUrl);

    // Create the Airtable record with initial data
    // Note: runId/datasetId are returned to the client (not stored in Airtable)
    // so we don't need extra Airtable columns for them.
    // Only include fields that exist in the Airtable schema.
    const table = getTable();
    const fields: Record<string, string> = {
      'Listing URL': airbnbUrl,
      Status: 'scraping',
      'Date Captured': new Date().toISOString().split('T')[0],
    };
    if (email) fields['Email'] = email;
    if (emailSource) fields['Email Source'] = emailSource;

    const records = await table.create([{ fields }]);

    return NextResponse.json({
      status: 'success',
      recordId: records[0].id,
      runId,
      datasetId,
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
