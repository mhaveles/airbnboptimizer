'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  validateWebhookResponse,
  trackError,
  ERROR_MESSAGES,
  type ErrorInfo
} from '@/lib/validation';
import { captureUTMParams, getStoredUTMParams } from '@/lib/utm';

const TIMEOUT_MS = 120000; // 120 second timeout (Make.com webhook takes ~25 seconds)

function WaitingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Capture UTM parameters from URL and store in sessionStorage
    captureUTMParams(searchParams);

    const airbnbUrl = searchParams.get('url');
    const email = searchParams.get('email');

    // Get UTM parameters from sessionStorage (most reliable source)
    // This ensures we get UTMs even if they're not in the current URL
    const utmParams = getStoredUTMParams();
    console.log('[Waiting Page] UTM params to send to webhook:', utmParams);

    // Validate URL is present
    if (!airbnbUrl) {
      trackError('missing_url', 'No URL provided to waiting page');
      router.push('/?error=missing_url');
      return;
    }

    // Create abort controller for timeout
    abortControllerRef.current = new AbortController();

    // Set up timeout
    const timeoutId = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      trackError('timeout', 'Webhook request timed out', { url: airbnbUrl });
      setError(ERROR_MESSAGES.TIMEOUT);
    }, TIMEOUT_MS);

    // Simulate progress bar to show activity while waiting for webhook
    // Make.com webhook typically takes 24-26 seconds
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) return prev; // Stop at 85% until we get response
        return prev + 5; // Slower progress to match ~25 second webhook time
      });
    }, 3500); // Update every 3.5 seconds (~24 seconds to reach 85%)

    // Call Make.com webhook
    const callMakeWebhook = async () => {
      try {
        const webhookUrl = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL || 'https://hook.us2.make.com/cayiub7qq8b6n1tkm95tnv5o10169j3j';

        // Build webhook payload
        const webhookPayload = {
          airbnbUrl,
          ...(email && { email, email_source: "Home Page" }),
          ...utmParams,
        };
        console.log('[Waiting Page] Sending to webhook:', webhookPayload);

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload),
          signal: abortControllerRef.current?.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          trackError('webhook_http_error', `HTTP ${response.status}`, { url: airbnbUrl });
          throw new Error('Failed to process your request');
        }

        // Get response as text first to handle potential JSON parsing issues
        let responseText = await response.text();
        console.log('Response received, length:', responseText.length);
        console.log('First 500 chars of response:', responseText.substring(0, 500));

        let data;
        try {
          // Try to parse the JSON response
          data = JSON.parse(responseText);
          console.log('JSON parsed successfully');
          console.log('Parsed data keys:', Object.keys(data));

          // Normalize record_id to recordId if needed
          if (data.record_id && !data.recordId) {
            data.recordId = data.record_id;
            console.log('Normalized record_id to recordId:', data.recordId);
          }

          console.log('RecordId from parsed data:', data.recordId || '(not present)');
        } catch (parseError) {
          // If JSON parsing fails, try multiple fallback methods
          console.error('JSON parse error:', parseError);
          console.log('Original response (first 500 chars):', responseText.substring(0, 500));

          try {
            // Method 1: Try to fix common JSON issues by replacing literal newlines
            let fixedJson = responseText
              .replace(/\r\n/g, '\\n')  // Replace Windows newlines
              .replace(/\n/g, '\\n')     // Replace Unix newlines
              .replace(/\r/g, '\\n')     // Replace Mac newlines
              .replace(/\t/g, '\\t');    // Replace tabs

            try {
              data = JSON.parse(fixedJson);
              console.log('JSON fixed and parsed successfully (Method 1)');

              // Normalize record_id to recordId if needed
              if (data.record_id && !data.recordId) {
                data.recordId = data.record_id;
                console.log('Normalized record_id to recordId:', data.recordId);
              }
            } catch (fixError) {
              console.log('Method 1 failed, trying Method 2');

              // Method 2: Manual extraction with improved logic
              const statusMatch = responseText.match(/"status"\s*:\s*"([^"]+)"/);
              const status = statusMatch ? statusMatch[1] : 'success';

              // Extract recordId (check both camelCase and snake_case)
              const recordIdMatch = responseText.match(/"recordId"\s*:\s*"([^"]+)"/) ||
                                   responseText.match(/"record_id"\s*:\s*"([^"]+)"/);
              const recordId = recordIdMatch ? recordIdMatch[1] : undefined;

              // Find recommendations using a more robust approach
              let recommendations = '';

              // Look for the pattern: "recommendations": " ... content ... "
              const recsPattern = /"recommendations"\s*:\s*"([\s\S]*?)"\s*\}/;
              const recsMatch = responseText.match(recsPattern);

              if (recsMatch && recsMatch[1]) {
                recommendations = recsMatch[1];
                console.log('Recommendations extracted using regex pattern');
              } else {
                // Fallback: manual string extraction
                const recsStartIndex = responseText.indexOf('"recommendations"');
                if (recsStartIndex !== -1) {
                  const valueStart = responseText.indexOf('"', recsStartIndex + 17);
                  if (valueStart !== -1) {
                    // Look for the ending quote followed by closing brace
                    let valueEnd = valueStart + 1;

                    // Find the matching closing quote, handling escaped quotes
                    for (let i = valueStart + 1; i < responseText.length; i++) {
                      if (responseText[i] === '\\' && i + 1 < responseText.length) {
                        i++; // Skip escaped character
                        continue;
                      }
                      if (responseText[i] === '"') {
                        // Check if this might be the closing quote
                        const afterQuote = responseText.substring(i + 1, i + 5).trim();
                        if (afterQuote.startsWith('}')) {
                          valueEnd = i;
                          break;
                        }
                      }
                    }

                    recommendations = responseText.substring(valueStart + 1, valueEnd);
                    console.log('Recommendations extracted using manual parsing');
                  }
                }
              }

              if (recommendations) {
                data = {
                  status: status,
                  recommendations: recommendations,
                  ...(recordId && { recordId: recordId })
                };
                console.log('Successfully extracted recommendations (Method 2), length:', recommendations.length);
                if (recordId) console.log('Record ID extracted:', recordId);
              } else {
                console.error('All extraction methods failed');
                trackError('parse_failed', 'Unable to parse webhook response', {
                  responseLength: responseText.length
                });
                throw new Error('Unable to parse response from server. Please try again.');
              }
            }
          } catch (extractError) {
            console.error('Extraction error:', extractError);
            trackError('extraction_failed', 'Failed to extract data from response');
            throw new Error('Unable to parse response from server. Please try again.');
          }
        }

        // Validate the webhook response (only requires status and recordId)
        const validation = validateWebhookResponse(data);
        if (!validation.isValid) {
          console.error('Webhook response validation failed:', validation.error);
          trackError('validation_failed', validation.error || 'Unknown validation error', {
            hasStatus: !!data.status,
            hasRecordId: !!(data.recordId || data.record_id),
          });
          setError(ERROR_MESSAGES.WEBHOOK_INVALID_RESPONSE);
          return;
        }

        // Complete the progress bar
        setProgress(100);

        console.log('Preparing to navigate to results page');
        console.log('Data object:', {
          hasRecordId: !!data.recordId,
          recordId: data.recordId || '(not present)',
          email: email || '(not provided)'
        });

        // Wait a moment to show 100%, then navigate to results
        // Note: We only pass recordId now - recommendations will be fetched from Airtable
        setTimeout(() => {
          const params = new URLSearchParams({
            ...(email && { email }),
            ...(data.recordId && { recordId: data.recordId }),
          });
          console.log('Navigation URL:', `/results?${params.toString()}`);
          console.log('URL params being passed:', {
            email: email || 'none',
            recordId: data.recordId || 'none'
          });
          router.push(`/results?${params.toString()}`);
        }, 500);

      } catch (err) {
        clearInterval(progressInterval);
        clearTimeout(timeoutId);

        // Handle abort (timeout)
        if (err instanceof Error && err.name === 'AbortError') {
          // Already handled by timeout
          return;
        }

        console.error('Error details:', err);
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';

        // Determine error type and set appropriate error info
        if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          trackError('network_error', errorMessage);
          setError(ERROR_MESSAGES.NETWORK_ERROR);
        } else if (errorMessage.includes('parse')) {
          trackError('parse_error', errorMessage);
          setError(ERROR_MESSAGES.WEBHOOK_INVALID_RESPONSE);
        } else {
          trackError('webhook_error', errorMessage);
          setError({
            userMessage: errorMessage,
            technicalMessage: errorMessage,
            action: 'retry',
          });
        }
      }
    };

    callMakeWebhook();

    return () => {
      clearInterval(progressInterval);
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
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
            We&apos;re analyzing your listing to find the highest-impact tweaks. Small changes = big $$$
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
