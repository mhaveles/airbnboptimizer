'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function WaitingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const airbnbUrl = searchParams.get('url');
    const email = searchParams.get('email');

    if (!airbnbUrl) {
      router.push('/');
      return;
    }

    // Simulate progress bar (since Make responds synchronously)
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev; // Stop at 90% until we get response
        return prev + 10;
      });
    }, 3000); // Update every 3 seconds

    // Call Make.com webhook
    const callMakeWebhook = async () => {
      try {
        const response = await fetch('https://hook.us2.make.com/pveeaemxf16qf49huq98532vegvbu2sn', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            airbnbUrl,
            ...(email && { email }),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to process your request');
        }

        // Get response as text first to handle potential JSON parsing issues
        let responseText = await response.text();

        let data;
        try {
          // Try to parse the JSON response
          data = JSON.parse(responseText);
        } catch (parseError) {
          // If JSON parsing fails, try to fix common JSON issues
          console.error('JSON parse error:', parseError);
          console.log('Original response:', responseText);

          try {
            // Attempt to fix the JSON by properly escaping newlines and special characters
            // Extract the status and recommendations fields
            const statusMatch = responseText.match(/"status"\s*:\s*"([^"]+)"/);
            const status = statusMatch ? statusMatch[1] : 'success';

            // Find the recommendations value (between "recommendations": " and the closing ")
            let recommendations = '';
            const recsStartIndex = responseText.indexOf('"recommendations"');

            if (recsStartIndex !== -1) {
              // Find the opening quote after "recommendations":
              const valueStart = responseText.indexOf('"', recsStartIndex + 17);
              if (valueStart !== -1) {
                // Find the last closing brace to work backwards
                const lastBrace = responseText.lastIndexOf('}');
                // Extract everything between the opening quote and before the last }
                const recsSection = responseText.substring(valueStart + 1, lastBrace);
                // Remove the trailing quote and whitespace
                recommendations = recsSection.replace(/"\s*$/, '').trim();
              }
            }

            if (recommendations) {
              data = {
                status: status,
                recommendations: recommendations
              };
              console.log('Successfully extracted recommendations');
            } else {
              throw new Error('Unable to parse response from server. Please try again.');
            }
          } catch (extractError) {
            console.error('Extraction error:', extractError);
            throw new Error('Unable to parse response from server. Please try again.');
          }
        }

        // Complete the progress bar
        setProgress(100);

        // Wait a moment to show 100%, then navigate to results
        setTimeout(() => {
          const params = new URLSearchParams({
            recommendations: data.recommendations || '',
            ...(email && { email }),
          });
          router.push(`/results?${params.toString()}`);
        }, 500);

      } catch (err) {
        clearInterval(progressInterval);
        console.error('Error details:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    };

    callMakeWebhook();

    return () => clearInterval(progressInterval);
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-6xl">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900">Oops!</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-airbnb-red hover:bg-[#E00007] text-white font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            Try Again
          </button>
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
            Our AI is reviewing your Airbnb listing to provide personalized recommendations
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
          This usually takes 30-60 seconds
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
