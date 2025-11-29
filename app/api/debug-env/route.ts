import { NextResponse } from 'next/server';

export async function GET() {
  const hasStripeSecret = !!process.env.STRIPE_SECRET_KEY;
  const secretPreview = process.env.STRIPE_SECRET_KEY
    ? `${process.env.STRIPE_SECRET_KEY.slice(0, 7)}...${process.env.STRIPE_SECRET_KEY.slice(-4)}`
    : 'NOT SET';

  return NextResponse.json({
    hasStripeSecret,
    secretPreview,
    allEnvVars: Object.keys(process.env).filter(key => key.includes('STRIPE')),
  });
}
