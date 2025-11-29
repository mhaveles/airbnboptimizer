import type { NextConfig } from "next";

// Log environment variables at build time - using console.error to ensure visibility
console.error('=== BUILD TIME ENV CHECK ===');
console.error('STRIPE_SECRET_KEY:', !!process.env.STRIPE_SECRET_KEY);
console.error('NEXT_PUBLIC_STRIPE_SECRET_KEY:', !!process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY);
console.error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:', !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
console.error('All STRIPE keys:', Object.keys(process.env).filter(k => k.includes('STRIPE')));
console.error('NODE_ENV:', process.env.NODE_ENV);
console.error('VERCEL:', process.env.VERCEL);
console.error('Total env vars:', Object.keys(process.env).length);
console.error('============================');

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
