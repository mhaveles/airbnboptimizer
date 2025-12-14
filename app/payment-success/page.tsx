'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const TIMEOUT_MS = 60000; // 60 second timeout

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [premiumDescription, setPremiumDescription] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID found. Please try again.');
      setIsLoading(false);
      return;
    }

    // Create abort controller for timeout
    abortControllerRef.current = new AbortController();

    // Set up timeout
    const timeoutId = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsLoading(false);
      setError('timeout');
    }, TIMEOUT_MS);

    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev; // Stop at 90% until we get response
        return prev + 10; // Increment by 10% every 6 seconds (60s to reach 90%)
      });
    }, 6000);

    const fetchPremiumDescription = async () => {
      try {
        console.log('Calling Make.com webhook with session_id:', sessionId);

        // Call Make.com webhook with the session_id
        const webhookUrl = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL || 'https://hook.us2.make.com/cayiub7qq8b6n1tkm95tnv5o10169j3j';
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            stripe_session_id: sessionId,
          }),
          signal: abortControllerRef.current?.signal,
        });

        clearTimeout(timeoutId);
        clearInterval(progressInterval);

        if (!response.ok) {
          console.error('Webhook HTTP error:', response.status);
          throw new Error('Failed to process your payment');
        }

        const data = await response.json();
        console.log('Webhook response:', data);

        if (!data.success || !data.record_id) {
          console.error('Invalid webhook response:', data);
          throw new Error('Invalid response from server');
        }

        // Update progress to show we got the record_id
        setProgress(95);

        // Now fetch the Premium_Description from Airtable using the record_id
        console.log('Fetching premium description for record:', data.record_id);
        const recordResponse = await fetch(`/api/get-record?recordId=${data.record_id}`);
        const recordData = await recordResponse.json();

        console.log('Record data:', recordData);

        if (!recordResponse.ok) {
          console.error('Failed to fetch record:', recordData);
          throw new Error(recordData.error || 'Failed to fetch your description');
        }

        if (!recordData.premiumDescription) {
          console.error('No premium description in record');
          setError('Your description is being generated. Please check your email.');
          setIsLoading(false);
          setProgress(100);
          return;
        }

        // Success! Show the description
        setPremiumDescription(recordData.premiumDescription);
        setProgress(100);
        setIsLoading(false);

      } catch (err) {
        clearInterval(progressInterval);
        clearTimeout(timeoutId);

        // Handle abort (timeout)
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('Request timed out');
          setError('timeout');
          setIsLoading(false);
          return;
        }

        console.error('Error fetching premium description:', err);
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        setIsLoading(false);
      }
    };

    fetchPremiumDescription();

    return () => {
      clearInterval(progressInterval);
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
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
                {progress}% complete
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

          {/* Error Messages */}
          {error && !premiumDescription && (
            <div className="mb-8">
              {error === 'timeout' ? (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
                  <p className="text-yellow-900 text-base font-medium mb-2">
                    Your description is taking a bit longer than usual.
                  </p>
                  <p className="text-yellow-800 text-sm">
                    We&apos;ll email it to you within 15 minutes.
                  </p>
                </div>
              ) : (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
                  <p className="text-red-900 text-base font-medium mb-2">
                    {error}
                  </p>
                  <p className="text-red-800 text-sm">
                    We&apos;ll email your description to you shortly.
                  </p>
                </div>
              )}
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
