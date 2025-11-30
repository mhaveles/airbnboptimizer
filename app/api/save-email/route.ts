import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Force Node.js runtime (not Edge) to ensure env vars are available
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export async function POST(request: NextRequest) {
  try {
    console.log('=== Save Email Request Started ===');

    // Parse request body
    const { email, recordId } = await request.json();

    console.log('Request payload:', {
      email: email || 'none',
      recordId: recordId || 'none'
    });

    // Validate email
    if (!email || typeof email !== 'string') {
      console.error('Missing or invalid email');
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      console.error('Invalid email format:', email);
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

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

    // First, verify the record exists
    try {
      const record = await base(tableName).find(recordId);
      console.log('Record found:', record.id);
    } catch (error) {
      console.error('Record not found:', error);
      return NextResponse.json(
        { error: 'Record not found. Please try analyzing your listing again.' },
        { status: 404 }
      );
    }

    // Update the record with the email
    try {
      const updatedRecord = await base(tableName).update(recordId, {
        Email: email,
        'Email Source': 'Results Page',
        'Email Captured At': new Date().toISOString(),
      });

      console.log('Email saved successfully for record:', updatedRecord.id);
      console.log('=== Save Email Request Completed ===');

      return NextResponse.json({
        success: true,
        message: 'Email saved successfully'
      });
    } catch (error) {
      console.error('Failed to update record:', error);

      // Check if it's a field error (field doesn't exist)
      if (error instanceof Error && error.message.includes('Unknown field')) {
        return NextResponse.json(
          { error: 'Email field not configured in Airtable. Please contact support.' },
          { status: 500 }
        );
      }

      throw error;
    }
  } catch (error) {
    console.error('=== Save Email Error ===');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        error: 'Failed to save email',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
