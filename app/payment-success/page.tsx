'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
            Airbnb<span className="text-airbnb-red">Optimizer</span>
          </h1>
        </div>

        {/* Success Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          {/* Success Icon */}
          <div className="text-6xl mb-6">🎉</div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Payment Successful!
          </h2>

          <p className="text-lg text-gray-600 mb-6">
            Your premium description is being generated...
          </p>

          {/* Loading Spinner */}
          <div className="flex justify-center mb-8">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-airbnb-red"></div>
          </div>

          {/* 3-Pack Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800 text-sm">
              <strong>Bought the 3-pack?</strong> Email your other listing URLs to{' '}
              <a
                href="mailto:support@airbnboptimizer.com"
                className="text-airbnb-red hover:underline font-medium"
              >
                support@airbnboptimizer.com
              </a>{' '}
              and we&apos;ll send your descriptions within 24 hours.
            </p>
          </div>

          {/* Session ID (for debugging) */}
          {sessionId && (
            <p className="text-xs text-gray-400 mb-6">
              Order ID: {sessionId.slice(-8)}
            </p>
          )}

          {/* Back to Home */}
          <Link
            href="/"
            className="inline-block bg-airbnb-red hover:bg-[#E00007] text-white font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            Optimize Another Listing
          </Link>
        </div>

        {/* Support Note */}
        <p className="text-center text-sm text-gray-500 mt-8">
          Questions? Contact us at{' '}
          <a
            href="mailto:support@airbnboptimizer.com"
            className="text-airbnb-red hover:underline"
          >
            support@airbnboptimizer.com
          </a>
        </p>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-2xl text-gray-600">Loading...</div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
