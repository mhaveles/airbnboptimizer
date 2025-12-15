import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Force Node.js runtime (not Edge) to ensure env vars are available
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Initialize Airtable
function getAirtable() {
  const apiKey = process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!apiKey) {
    throw new Error('Airtable API key is not configured');
  }

  if (!baseId) {
    throw new Error('Airtable Base ID is not configured');
  }

  return new Airtable({ apiKey }).base(baseId);
}

export async function GET(request: NextRequest) {
  try {
    console.log('=== Poll Description Request Started ===');

    // Get session_id from query params
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    console.log('Request params:', { session_id: sessionId || 'none' });

    // Validate session_id
    if (!sessionId || typeof sessionId !== 'string') {
      console.error('Missing or invalid session_id');
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get Airtable configuration
    const base = getAirtable();
    const tableName = process.env.AIRTABLE_TABLE_NAME || 'Listings';

    console.log('Airtable config:', {
      baseId: process.env.AIRTABLE_BASE_ID,
      tableName,
      session_id: sessionId,
    });

    // Search for a record where Stripe_Session_ID matches
    // Note: Using exact field name "Stripe_Session_ID" to match Airtable
    try {
      const records = await base(tableName)
        .select({
          filterByFormula: `{Stripe_Session_ID} = '${sessionId}'`,
          maxRecords: 1,
        })
        .firstPage();

      if (records.length === 0) {
        console.log('No record found for session_id:', sessionId);
        return NextResponse.json({
          success: false,
          found: false,
          message: 'No record found yet',
        });
      }

      const record = records[0];
      console.log('Record found:', record.id);

      // Extract the Paid Description field
      const premiumDescription = record.get('Paid Description') as string | undefined;

      if (!premiumDescription) {
        console.log('Record found but no Paid Description yet');
        return NextResponse.json({
          success: false,
          found: true,
          hasDescription: false,
          message: 'Record found, but description is still being generated',
        });
      }

      console.log('Premium description found, length:', premiumDescription.length);
      console.log('=== Poll Description Request Completed ===');

      return NextResponse.json({
        success: true,
        found: true,
        hasDescription: true,
        recordId: record.id,
        description: premiumDescription,
        email: record.get('Email') as string | undefined,
      });

    } catch (error) {
      console.error('Error querying Airtable:', error);
      return NextResponse.json(
        {
          error: 'Failed to query Airtable',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('=== Poll Description Error ===');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        error: 'Failed to poll description',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
