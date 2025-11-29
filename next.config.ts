import type { NextConfig } from "next";

// Log environment variables at build time
console.log('=== Build Time Environment Check ===');
console.log('STRIPE_SECRET_KEY exists:', !!process.env.STRIPE_SECRET_KEY);
console.log('NEXT_PUBLIC_STRIPE_SECRET_KEY exists:', !!process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY);
console.log('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY exists:', !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
console.log('All STRIPE env vars:', Object.keys(process.env).filter(k => k.includes('STRIPE')));
console.log('===================================');

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
