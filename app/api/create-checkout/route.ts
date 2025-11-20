import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recordId, email } = body;

    if (!recordId) {
      return NextResponse.json(
        { error: 'Record ID is required' },
        { status: 400 }
      );
    }

    console.log('Creating checkout session for recordId:', recordId);

    // Get the origin for success/cancel URLs
    const origin = request.headers.get('origin') || 'http://localhost:3000';

    // Create Stripe checkout session with recordId in metadata
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Full Optimized Airbnb Description',
              description: 'AI-generated, professionally optimized listing description',
            },
            unit_amount: 999, // $9.99 in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/complete?id=${recordId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/results?recordId=${recordId}`,
      metadata: {
        airtable_record_id: recordId,
      },
      ...(email && { customer_email: email }),
    });

    console.log('Checkout session created:', session.id);
    console.log('Metadata:', session.metadata);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
