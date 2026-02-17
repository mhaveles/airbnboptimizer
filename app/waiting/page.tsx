'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  trackError,
  ERROR_MESSAGES,
  type ErrorInfo
} from '@/lib/validation';
import { captureUTMParams, getStoredUTMParams } from '@/lib/utm';

const POLL_INTERVAL_MS = 4000; // Poll every 4 seconds
const TIMEOUT_MS = 120000; // 120 second overall timeout

function WaitingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [statusText, setStatusText] = useState('Starting analysis...');
  const abortedRef = useRef(false);

  useEffect(() => {
    // Capture UTM parameters from URL and store in sessionStorage
    captureUTMParams(searchParams);

    const airbnbUrl = searchParams.get('url');
    const email = searchParams.get('email');

    // Get UTM parameters from sessionStorage
    const utmParams = getStoredUTMParams();

    // Validate URL is present
    if (!airbnbUrl) {
      trackError('missing_url', 'No URL provided to waiting page');
      router.push('/?error=missing_url');
      return;
    }

    let timeoutId: NodeJS.Timeout;
    let pollId: NodeJS.Timeout;
    let progressId: NodeJS.Timeout;

    const cleanup = () => {
      abortedRef.current = true;
      clearTimeout(timeoutId);
      clearTimeout(pollId);
      clearInterval(progressId);
    };

    // Overall timeout
    timeoutId = setTimeout(() => {
      cleanup();
      trackError('timeout', 'Analysis request timed out', { url: airbnbUrl });
      setError(ERROR_MESSAGES.TIMEOUT);
    }, TIMEOUT_MS);

    const run = async () => {
      try {
        // Step 1: Initiate the analysis
        setStatusText('Starting analysis...');
        const initResponse = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            airbnbUrl,
            ...(email && { email, email_source: 'Home Page' }),
            ...utmParams,
          }),
        });

        if (!initResponse.ok) {
          const errData = await initResponse.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to start analysis');
        }

        const { recordId, runId, datasetId } = await initResponse.json();
        if (!recordId) {
          throw new Error('No recordId returned from /api/analyze');
        }

        // Step 2: Start polling
        setStatusText('Scraping your listing...');
        setProgress(10);

        const poll = async () => {
          if (abortedRef.current) return;

          try {
            const pollParams = new URLSearchParams({
              recordId,
              ...(runId && { runId }),
              ...(datasetId && { datasetId }),
            });
            const pollResponse = await fetch(
              `/api/poll-status?${pollParams.toString()}`
            );
            const data = await pollResponse.json();

            if (abortedRef.current) return;

            switch (data.status) {
              case 'scraping':
                setStatusText('Scraping your listing...');
                setProgress((prev) => (prev < 70 ? prev + 2 : prev));
                pollId = setTimeout(poll, POLL_INTERVAL_MS);
                break;

              case 'scraped':
                setStatusText('Analyzing your listing with AI...');
                setProgress(75);
                pollId = setTimeout(poll, POLL_INTERVAL_MS);
                break;

              case 'analyzed':
              case 'complete':
                setStatusText('Analysis complete!');
                setProgress(100);
                cleanup();
                setTimeout(() => {
                  const params = new URLSearchParams({
                    ...(email && { email }),
                    recordId,
                  });
                  router.push(`/results?${params.toString()}`);
                }, 500);
                break;

              case 'error':
                cleanup();
                trackError('pipeline_error', data.message || 'Pipeline failed');
                setError({
                  userMessage: 'Something went wrong analyzing your listing. Please try again.',
                  technicalMessage: data.message || 'Pipeline error',
                  action: 'retry',
                });
                break;

              default:
                pollId = setTimeout(poll, POLL_INTERVAL_MS);
                break;
            }
          } catch (pollErr) {
            if (abortedRef.current) return;
            console.error('Poll error:', pollErr);
            pollId = setTimeout(poll, POLL_INTERVAL_MS);
          }
        };

        poll();
      } catch (err) {
        if (abortedRef.current) return;
        cleanup();

        console.error('Error starting analysis:', err);
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';

        if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          trackError('network_error', errorMessage);
          setError(ERROR_MESSAGES.NETWORK_ERROR);
        } else {
          trackError('init_error', errorMessage);
          setError({
            userMessage: errorMessage,
            technicalMessage: errorMessage,
            action: 'retry',
          });
        }
      }
    };

    // Slow progress increment for visual feedback
    progressId = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) return prev;
        return prev + 1;
      });
    }, 2000);

    run();

    return cleanup;
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-6xl">
            {error.action === 'retry' ? '⚠️' : '❌'}
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Oops!
          </h2>
          <p className="text-gray-600">{error.userMessage}</p>
          <div className="space-y-3">
            {error.action === 'retry' && (
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-airbnb-red hover:bg-[#E00007] text-white font-semibold py-3 px-8 rounded-lg transition-colors"
              >
                Try Again
              </button>
            )}
            <button
              onClick={() => router.push('/')}
              className={`w-full font-semibold py-3 px-8 rounded-lg transition-colors ${
                error.action === 'retry'
                  ? 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  : 'bg-airbnb-red hover:bg-[#E00007] text-white'
              }`}
            >
              {error.action === 'retry' ? 'Start Over' : 'Go Back Home'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Logo */}
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
          Airbnb<span className="text-airbnb-red">Optimizer</span>
        </h1>

        {/* Loading Animation */}
        <div className="space-y-4">
          <div className="text-6xl animate-pulse">🔍</div>
          <h2 className="text-2xl font-semibold text-gray-800">
            Analyzing your listing...
          </h2>
          <p className="text-gray-600">
            {statusText}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-airbnb-red h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Progress Percentage */}
        <p className="text-sm text-gray-500">
          {progress}% complete
        </p>

        {/* Estimated Time */}
        <p className="text-xs text-gray-400">
          This usually takes 45-60 seconds
        </p>
      </div>
    </div>
  );
}

export default function WaitingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-2xl text-gray-600">Loading...</div>
      </div>
    }>
      <WaitingContent />
    </Suspense>
  );
}
