import { NextRequest, NextResponse } from 'next/server';
import { getTable } from '@/lib/airtable';
import { runAnalyzer, runWriter, type ListingRecord } from '@/lib/ai-paid-description';
import { sendDescriptionEmail } from '@/lib/email';
import { serializeError } from '@/lib/error-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function buildListingData(record: any): ListingRecord {
  return {
    Headline: (record.get('Headline') as string) || undefined,
    Description: (record.get('Description') as string) || undefined,
    'SEO heading': (record.get('SEO heading') as string) || undefined,
    'Freemium AI Response': (record.get('Freemium AI Response') as string) || undefined,
    'Overall Rating': record.get('Overall Rating') as number | undefined,
    'Accuracy Rating': record.get('Accuracy Rating') as number | undefined,
    'Communication Rating': record.get('Communication Rating') as number | undefined,
    'Cleanliness Rating': record.get('Cleanliness Rating') as number | undefined,
    'Location Rating': record.get('Location Rating') as number | undefined,
    'Check In Rating': record.get('Check In Rating') as number | undefined,
    'Value Rating': record.get('Value Rating') as number | undefined,
    City: (record.get('City') as string) || undefined,
    'Latitude, Longitude': (record.get('Latitude, Longitude') as string) || undefined,
    'Property Type': (record.get('Property Type') as string) || undefined,
    'Maximum Guests': record.get('Maximum Guests') as number | undefined,
    'Number of Beds': (record.get('Number of Beds') as string) || undefined,
    Bathrooms: (record.get('Bathrooms') as string) || undefined,
    Bedrooms: record.get('Bedrooms') as number | undefined,
  };
}

/**
 * State machine for paid description generation.
 * Each call does at most ONE AI call to fit within Vercel Hobby 10s timeout.
 *
 * States:
 *   "analyzed" (webhook hasn't fired yet) → { status: "waiting_for_payment" }
 *   "paid_webhook2_triggered" → run analyzer → save → status = "paid_description_analyzing"
 *   "paid_description_analyzing" → run writer → save + email → status = "premium_description_completed"
 *   "premium_description_completed" → return description
 */
export async function POST(request: NextRequest) {
  try {
    const { recordId } = await request.json();

    if (!recordId || typeof recordId !== 'string' || !recordId.startsWith('rec')) {
      return NextResponse.json(
        { error: 'Valid recordId is required' },
        { status: 400 }
      );
    }

    const table = getTable();
    const record = await table.find(recordId);
    const status = record.get('Status') as string;

    switch (status) {
      // Stripe webhook hasn't fired yet — tell frontend to wait
      case 'analyzed': {
        return NextResponse.json({ status: 'waiting_for_payment' });
      }

      // Step 1: Run analyzer (one AI call, ~5s)
      case 'paid_webhook2_triggered': {
        const listingData = buildListingData(record);
        const analyzerOutput = await runAnalyzer(listingData);

        await table.update(recordId, {
          'Description Prompt': analyzerOutput,
          Status: 'paid_description_analyzing',
        });

        return NextResponse.json({ status: 'analyzing' });
      }

      // Step 2: Run writer (one AI call, ~3-5s) + send email
      case 'paid_description_analyzing': {
        const analyzerOutput = record.get('Description Prompt') as string;
        if (!analyzerOutput) {
          return NextResponse.json({
            status: 'error',
            message: 'Analyzer output missing',
          });
        }

        const listingData = buildListingData(record);
        const description = await runWriter(analyzerOutput, listingData);

        await table.update(recordId, {
          'Paid Description': description,
          Status: 'premium_description_completed',
        });

        // Send email — don't fail the request if email fails
        const email = record.get('Email') as string | undefined;
        if (email) {
          sendDescriptionEmail(email, description).catch((err) => {
            console.error('Failed to send description email:', err);
          });
        }

        return NextResponse.json({
          status: 'complete',
          description,
        });
      }

      // Already done — return the description
      case 'premium_description_completed': {
        const description = record.get('Paid Description') as string;
        return NextResponse.json({
          status: 'complete',
          description: description || '',
        });
      }

      default: {
        return NextResponse.json({
          status: 'unknown',
          message: `Unexpected status: ${status}`,
        });
      }
    }
  } catch (error: unknown) {
    const message = serializeError(error);
    console.error('Error in /api/generate-description:', message, error);
    return NextResponse.json(
      {
        error: 'Failed to generate description',
        message,
      },
      { status: 500 }
    );
  }
}
