import { NextRequest, NextResponse } from 'next/server';
import { getTable } from '@/lib/airtable';
import { runPaidDescriptionPipeline } from '@/lib/ai-paid-description';
import { sendDescriptionEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for two OpenAI calls + email

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

    // Guard: only proceed if status is correct (prevents double-run)
    if (status !== 'paid_webhook2_triggered') {
      // If already completed, return success
      if (status === 'premium_description_completed') {
        return NextResponse.json({
          success: true,
          recordId,
          alreadyCompleted: true,
        });
      }
      return NextResponse.json(
        { error: `Unexpected status: ${status}. Expected paid_webhook2_triggered.` },
        { status: 400 }
      );
    }

    // Build record data for the AI pipeline
    const listingData = {
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

    // Run the two-step AI pipeline
    const { analyzerOutput, description } = await runPaidDescriptionPipeline(listingData);

    // Update Airtable with results
    await table.update(recordId, {
      'Description Prompt': analyzerOutput,
      'Paid Description': description,
      Status: 'premium_description_completed',
    });

    // Send email (non-blocking — don't fail the whole request if email fails)
    const email = record.get('Email') as string | undefined;
    if (email) {
      try {
        await sendDescriptionEmail(email, description);
        console.log(`Description email sent to ${email}`);
      } catch (emailErr) {
        console.error('Failed to send description email:', emailErr);
        // Don't fail — the description is saved in Airtable
      }
    }

    return NextResponse.json({
      success: true,
      recordId,
    });
  } catch (error) {
    console.error('Error in /api/generate-description:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate description',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
