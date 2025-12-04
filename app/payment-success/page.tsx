'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [premiumDescription, setPremiumDescription] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    let pollCount = 0;
    const maxPolls = 10; // 10 polls * 3 seconds = 30 seconds
    const pollInterval = 3000; // 3 seconds

    const pollDescription = async () => {
      try {
        console.log(`Polling attempt ${pollCount + 1}/${maxPolls}`);

        const response = await fetch(`/api/poll-description?session_id=${encodeURIComponent(sessionId)}`);
        const data = await response.json();

        if (data.success && data.hasDescription && data.description) {
          // Found the description!
          console.log('Description found!');
          setPremiumDescription(data.description);
          setIsPolling(false);
          return true; // Stop polling
        }

        // Increment poll count
        pollCount++;

        // Check if we've reached the timeout
        if (pollCount >= maxPolls) {
          console.log('Polling timeout reached');
          setIsPolling(false);
          setHasTimedOut(true);
          return true; // Stop polling
        }

        return false; // Continue polling
      } catch (error) {
        console.error('Error polling for description:', error);
        // Continue polling even on error
        pollCount++;
        if (pollCount >= maxPolls) {
          setIsPolling(false);
          setHasTimedOut(true);
          return true;
        }
        return false;
      }
    };

    // Initial poll
    pollDescription();

    // Set up interval for subsequent polls
    const intervalId = setInterval(async () => {
      const shouldStop = await pollDescription();
      if (shouldStop) {
        clearInterval(intervalId);
      }
    }, pollInterval);

    // Cleanup on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [sessionId]);

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

          {/* Loading State */}
          {isPolling && !premiumDescription && (
            <>
              <p className="text-lg text-gray-600 mb-6">
                Your premium description is being generated...
              </p>

              {/* Loading Spinner */}
              <div className="flex justify-center mb-8">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-airbnb-red"></div>
              </div>
            </>
          )}

          {/* Premium Description Display */}
          {premiumDescription && (
            <div className="mb-8">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6 mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-2">
                  <span>✨</span>
                  <span>Your Premium Description</span>
                  <span>✨</span>
                </h3>
                <div className="text-left bg-white rounded-lg p-6 shadow-sm">
                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {premiumDescription}
                  </p>
                </div>
              </div>
              <p className="text-sm text-green-600 font-medium mb-4">
                ✓ Description sent to your email
              </p>
            </div>
          )}

          {/* Timeout Message */}
          {hasTimedOut && !premiumDescription && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mb-8">
              <p className="text-yellow-900 text-base font-medium mb-2">
                Your description is taking a bit longer than usual.
              </p>
              <p className="text-yellow-800 text-sm">
                We&apos;ll email it to you within 15 minutes.
              </p>
            </div>
          )}

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
