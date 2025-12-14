import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Force Node.js runtime (not Edge) to ensure env vars are available
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Airtable record ID validation
function isValidRecordId(recordId: string): boolean {
  return recordId.startsWith('rec') && recordId.length >= 10;
}

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
    console.log('=== Get Record Request Started ===');

    // Get recordId from query params
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('recordId');

    console.log('Request params:', { recordId: recordId || 'none' });

    // Validate recordId
    if (!recordId || typeof recordId !== 'string') {
      console.error('Missing or invalid recordId');
      return NextResponse.json(
        { error: 'Record ID is required' },
        { status: 400 }
      );
    }

    if (!isValidRecordId(recordId)) {
      console.error('Invalid recordId format:', recordId);
      return NextResponse.json(
        { error: 'Invalid record ID format' },
        { status: 400 }
      );
    }

    // Get Airtable configuration
    const base = getAirtable();
    const tableName = process.env.AIRTABLE_TABLE_NAME || 'Listings';

    console.log('Airtable config:', {
      baseId: process.env.AIRTABLE_BASE_ID,
      tableName,
      recordId,
    });

    // Fetch the record
    try {
      const record = await base(tableName).find(recordId);
      console.log('Record found:', record.id);

      // Extract the recommendations field (stored in 'Freemium AI Response' field)
      const recommendations = record.get('Freemium AI Response') as string | undefined;

      // Also extract Premium_Description if it exists
      const premiumDescription = record.get('Premium_Description') as string | undefined;

      if (!recommendations && !premiumDescription) {
        console.warn('Record found but no Freemium AI Response or Premium_Description field');
        return NextResponse.json(
          { error: 'No content found for this record' },
          { status: 404 }
        );
      }

      console.log('Content found:', {
        hasRecommendations: !!recommendations,
        hasPremiumDescription: !!premiumDescription,
        recommendationsLength: recommendations?.length,
        premiumDescriptionLength: premiumDescription?.length
      });
      console.log('=== Get Record Request Completed ===');

      return NextResponse.json({
        success: true,
        recordId: record.id,
        recommendations: recommendations,
        premiumDescription: premiumDescription,
        email: record.get('Email') as string | undefined,
      });

    } catch (error) {
      console.error('Record not found:', error);
      return NextResponse.json(
        { error: 'Record not found. Please try analyzing your listing again.' },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('=== Get Record Error ===');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        error: 'Failed to fetch record',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
