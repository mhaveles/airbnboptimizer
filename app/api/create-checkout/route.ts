import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Force Node.js runtime (not Edge) to ensure env vars are available
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getStripe() {
  // SECURITY WARNING: Using NEXT_PUBLIC_ prefix exposes this to client-side
  // This should be STRIPE_SECRET_KEY (without NEXT_PUBLIC_)
  const secretKey = process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error('Stripe secret key environment variable is not set');
  }

  return new Stripe(secretKey, {
    apiVersion: '2025-11-17.clover',
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== Stripe Checkout Request Started ===');

    // Debug: Log all environment variables related to Stripe
    const stripeSecretKey = process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
    console.log('Environment check:', {
      hasNextPublicStripeSecret: !!process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY,
      hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
      finalKeyType: typeof stripeSecretKey,
      finalKeyLength: stripeSecretKey?.length,
      finalKeyPreview: stripeSecretKey
        ? `${stripeSecretKey.slice(0, 7)}...${stripeSecretKey.slice(-4)}`
        : 'UNDEFINED',
      allStripeEnvVars: Object.keys(process.env).filter(key => key.includes('STRIPE')),
      nodeEnv: process.env.NODE_ENV,
    });

    // Check for Stripe secret key
    if (!stripeSecretKey) {
      console.error('Stripe secret key is not set in environment variables');
      console.error('Checked: NEXT_PUBLIC_STRIPE_SECRET_KEY and STRIPE_SECRET_KEY');
      console.error('All env vars:', Object.keys(process.env));
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    const stripe = getStripe();
    const { priceId, recordId, email } = await request.json();

    console.log('Request payload:', { priceId, recordId, email: email || 'none' });

    if (!priceId) {
      console.error('Missing priceId in request');
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      );
    }

    if (!recordId) {
      console.error('Missing recordId in request');
      return NextResponse.json(
        { error: 'Record ID is required' },
        { status: 400 }
      );
    }

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `https://airbnboptimizer.com/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://airbnboptimizer.com/results?recordId=${recordId}`,
      metadata: {
        recordId: recordId,
      },
      expand: ['line_items'],
    };

    // Pre-fill email if provided
    if (email) {
      sessionConfig.customer_email = email;
    }

    console.log('Creating Stripe checkout session with config:', {
      priceId,
      recordId,
      hasEmail: !!email,
    });

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log('Stripe session created successfully:', session.id);
    console.log('=== Stripe Checkout Request Completed ===');

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('=== Stripe Checkout Error ===');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));

    if (error instanceof Stripe.errors.StripeError) {
      console.error('Stripe error type:', error.type);
      console.error('Stripe error code:', error.code);
      console.error('Stripe error details:', error);

      return NextResponse.json(
        {
          error: 'Stripe error',
          message: error.message,
          type: error.type,
          code: error.code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to create checkout session',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
