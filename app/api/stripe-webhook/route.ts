import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getTable } from '@/lib/airtable';
import { serializeError } from '@/lib/error-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getStripe() {
  const secretKey = process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Stripe secret key is not configured');
  }
  return new Stripe(secretKey, {
    apiVersion: '2025-11-17.clover',
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    const stripe = getStripe();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Stripe webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Only handle checkout.session.completed
    if (event.type !== 'checkout.session.completed') {
      return NextResponse.json({ received: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const recordId = session.metadata?.recordId;
    const sessionId = session.id;

    if (!recordId) {
      console.error('No recordId in Stripe session metadata');
      return NextResponse.json(
        { error: 'No recordId in metadata' },
        { status: 400 }
      );
    }

    // Update Airtable: mark as paid and store Stripe session ID
    const table = getTable();
    await table.update(recordId, {
      Status: 'paid_webhook2_triggered',
      Stripe_Session_ID: sessionId,
    });

    console.log(`Stripe webhook processed: recordId=${recordId}, sessionId=${sessionId}`);

    return NextResponse.json({
      success: true,
      record_id: recordId,
      stripe_session_id: sessionId,
    });
  } catch (error: unknown) {
    const message = serializeError(error);
    console.error('Error in /api/stripe-webhook:', message, error);
    return NextResponse.json(
      {
        error: 'Webhook handler failed',
        message,
      },
      { status: 500 }
    );
  }
}
