import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isValidRecordId(recordId: string): boolean {
  return recordId.startsWith('rec') && recordId.length >= 10;
}

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
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('recordId');

    if (!recordId || !isValidRecordId(recordId)) {
      return NextResponse.json(
        { error: 'Valid record ID is required' },
        { status: 400 }
      );
    }

    const base = getAirtable();
    const tableName = process.env.AIRTABLE_TABLE_NAME || 'Listings';

    try {
      const record = await base(tableName).find(recordId);

      const data = {
        success: true,
        recordId: record.id,
        original_title: (record.get('original_title') as string) || '',
        improved_title: (record.get('improved_title') as string) || '',
        original_description: (record.get('original_description') as string) || '',
        improved_description: (record.get('improved_description') as string) || '',
        photo_urls: parseArrayField(record.get('photo_urls')),
        photo_recommendations: (record.get('photo_recommendations') as string) || '',
      };

      return NextResponse.json(data);
    } catch {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch record',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function parseArrayField(value: unknown): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Try comma-separated
      return value.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
}
