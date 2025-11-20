import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    console.log('Received Stripe event:', event.type);

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      // Extract the Airtable record ID from metadata
      const airtableRecordId = session.metadata?.airtable_record_id;

      if (!airtableRecordId) {
        console.error('No airtable_record_id found in session metadata');
        return NextResponse.json(
          { error: 'Missing record ID in metadata' },
          { status: 400 }
        );
      }

      console.log('Payment completed for record:', airtableRecordId);
      console.log('Session ID:', session.id);
      console.log('Customer email:', session.customer_email);

      // Call Webhook 2 (Make.com) to generate full description
      try {
        const makeWebhookUrl = process.env.MAKE_WEBHOOK_2_URL || 'https://hook.us2.make.com/YOUR_WEBHOOK_2_URL';

        const webhookResponse = await fetch(makeWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recordId: airtableRecordId,
            stripeSessionId: session.id,
            customerEmail: session.customer_email,
            paymentStatus: 'completed',
          }),
        });

        console.log('Webhook 2 response status:', webhookResponse.status);

        if (!webhookResponse.ok) {
          console.error('Webhook 2 call failed');
        }
      } catch (webhookError) {
        console.error('Error calling Webhook 2:', webhookError);
        // Don't fail the Stripe webhook even if Make.com fails
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
