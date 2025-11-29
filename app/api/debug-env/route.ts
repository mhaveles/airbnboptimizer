import { NextResponse } from 'next/server';

export async function GET() {
  const hasStripeSecret = !!process.env.STRIPE_SECRET_KEY;
  const secretPreview = process.env.STRIPE_SECRET_KEY
    ? `${process.env.STRIPE_SECRET_KEY.slice(0, 7)}...${process.env.STRIPE_SECRET_KEY.slice(-4)}`
    : 'NOT SET';

  // Get ALL environment variables (be careful in production!)
  const allEnvKeys = Object.keys(process.env);
  const stripeKeys = allEnvKeys.filter(key => key.includes('STRIPE'));

  return NextResponse.json({
    hasStripeSecret,
    secretPreview,
    stripeKeys,
    totalEnvVars: allEnvKeys.length,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    // Show first 10 env var names to verify SOME are loading
    sampleEnvVars: allEnvKeys.slice(0, 10),
  });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

