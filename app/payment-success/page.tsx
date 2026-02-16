'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const POLL_INTERVAL = 3000; // Poll every 3 seconds
const TIMEOUT_MS = 60000; // 60 second timeout
const MAX_POLLS = TIMEOUT_MS / POLL_INTERVAL; // 20 polls

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const recordId = searchParams.get('recordId');

  const [premiumDescription, setPremiumDescription] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!sessionId && !recordId) {
      setError('No session ID or record ID found. Please try again.');
      setIsLoading(false);
      return;
    }

    // Fire-and-forget: trigger paid description generation
    // The Stripe webhook sets status to "paid_webhook2_triggered",
    // this call runs the AI pipeline and saves results to Airtable.
    // We don't await — polling below will detect the result.
    if (recordId) {
      fetch('/api/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId }),
      }).catch((err) => {
        console.error('Failed to trigger description generation:', err);
      });
    }

    let pollCount = 0;
    let intervalId: NodeJS.Timeout | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    // Progress bar animation - increment every 3 seconds to match polling
    const progressIncrement = 90 / MAX_POLLS; // Reach 90% by max polls
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + progressIncrement;
        return newProgress >= 90 ? 90 : newProgress;
      });
    }, POLL_INTERVAL);

    // Set up timeout
    timeoutId = setTimeout(() => {
      if (intervalId) clearInterval(intervalId);
      clearInterval(progressInterval);
      setIsLoading(false);
      setError('timeout');
      setProgress(100);
    }, TIMEOUT_MS);

    const pollDescription = async () => {
      try {
        pollCount++;
        console.log(`Polling attempt ${pollCount}/${MAX_POLLS}`);

        let response;
        let data;

        // If we have recordId, use /api/get-record (more reliable)
        // Otherwise fall back to polling by session_id
        if (recordId) {
          console.log('Polling with recordId:', recordId);
          response = await fetch(`/api/get-record?recordId=${encodeURIComponent(recordId)}`);
          data = await response.json();

          // Check if premiumDescription exists in the response
          if (data.success && data.premiumDescription) {
            console.log('Premium description found via recordId!');

            if (intervalId) clearInterval(intervalId);
            if (timeoutId) clearTimeout(timeoutId);
            clearInterval(progressInterval);

            setPremiumDescription(data.premiumDescription);
            setProgress(100);
            setIsLoading(false);
            return;
          }
        } else if (sessionId) {
          console.log('Polling with session_id:', sessionId);
          response = await fetch(`/api/poll-description?session_id=${encodeURIComponent(sessionId)}`);
          data = await response.json();

          console.log('Poll response:', data);

          if (data.success && data.hasDescription && data.description) {
            // Found the description!
            console.log('Premium description found via session_id!');

            if (intervalId) clearInterval(intervalId);
            if (timeoutId) clearTimeout(timeoutId);
            clearInterval(progressInterval);

            setPremiumDescription(data.description);
            setProgress(100);
            setIsLoading(false);
            return;
          }
        }

        // Check if we've reached max polls
        if (pollCount >= MAX_POLLS) {
          console.log('Max polls reached');
          if (intervalId) clearInterval(intervalId);
          if (timeoutId) clearTimeout(timeoutId);
          clearInterval(progressInterval);
          setIsLoading(false);
          setError('timeout');
          setProgress(100);
        }

      } catch (err) {
        console.error('Error polling for description:', err);

        // Check if we've reached max polls
        if (pollCount >= MAX_POLLS) {
          if (intervalId) clearInterval(intervalId);
          if (timeoutId) clearTimeout(timeoutId);
          clearInterval(progressInterval);
          setIsLoading(false);
          setError('timeout');
          setProgress(100);
        }
      }
    };

    // Start polling immediately
    pollDescription();

    // Set up interval for subsequent polls
    intervalId = setInterval(pollDescription, POLL_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
      clearInterval(progressInterval);
    };
  }, [sessionId, recordId]);

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
          {isLoading && !premiumDescription && !error && (
            <>
              <p className="text-lg text-gray-600 mb-6">
                Your premium description is being generated...
              </p>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-4">
                <div
                  className="bg-airbnb-red h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Progress Percentage */}
              <p className="text-sm text-gray-500 mb-8">
                {Math.round(progress)}% complete
              </p>
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
          {error === 'timeout' && !premiumDescription && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mb-8">
              <p className="text-yellow-900 text-base font-medium mb-2">
                Your description is taking a bit longer than usual.
              </p>
              <p className="text-yellow-800 text-sm">
                We&apos;ll email it to you within 15 minutes.
              </p>
            </div>
          )}

          {/* Other Errors */}
          {error && error !== 'timeout' && !premiumDescription && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-8">
              <p className="text-red-900 text-base font-medium mb-2">
                {error}
              </p>
              <p className="text-red-800 text-sm">
                We&apos;ll email your description to you shortly.
              </p>
            </div>
          )}

          {/* 3-Pack Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800 text-sm">
              <strong>Bought the 3-pack?</strong> Email your other listing URLs to{' '}
              <a
                href="mailto:airbnboptimizerr@gmail.com"
                className="text-airbnb-red hover:underline font-medium"
              >
                airbnboptimizerr@gmail.com
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
            href="mailto:airbnboptimizerr@gmail.com"
            className="text-airbnb-red hover:underline"
          >
            airbnboptimizerr@gmail.com
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
