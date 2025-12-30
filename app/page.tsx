'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { trackError } from '@/lib/validation';

// Type declaration for Google Analytics gtag function
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

function HomeContent() {
  const [airbnbUrl, setAirbnbUrl] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [pageError, setPageError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check for error messages in URL params (from redirects)
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      switch (errorParam) {
        case 'missing_url':
          setPageError('Please enter your Airbnb listing URL to get started.');
          break;
        case 'invalid_session':
          setPageError('Your session expired. Please try again.');
          break;
        case 'missing_data':
          setPageError('Something went wrong. Please try analyzing your listing again.');
          break;
        default:
          setPageError('An error occurred. Please try again.');
      }
      // Clear the error from URL without refreshing
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams]);

  // Helper function to track GA4 events with error handling
  const trackEvent = (eventName: string, eventParams?: Record<string, any>) => {
    try {
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', eventName, eventParams);
        console.log(`[GA4 Event] ${eventName}`, eventParams || {});
      } else {
        console.warn('[GA4 Event] gtag not available:', eventName);
      }
    } catch (error) {
      console.error('[GA4 Event] Error tracking event:', eventName, error);
    }
  };

  // Validate Airbnb listing URL - now accepts short links and vanity URLs
  const validateAirbnbUrl = (url: string): boolean => {
    if (!url) return false;

    // Accept standard /rooms/ URLs
    const airbnbRoomsPattern = /^(https?:\/\/)?(www\.)?airbnb\.[a-z.]+\/rooms\/\d+/i;
    if (airbnbRoomsPattern.test(url)) return true;

    // Accept short links
    const shortLinkPattern = /^(https?:\/\/)?(abnb\.me|airbnb\.app\.link|airbnb\.page\.link)\//i;
    if (shortLinkPattern.test(url)) return true;

    // Accept vanity URLs (/h/<slug>)
    const vanityPattern = /^(https?:\/\/)?(www\.)?airbnb\.[a-z.]+\/h\//i;
    if (vanityPattern.test(url)) return true;

    return false;
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setAirbnbUrl(url);

    // Clear error when user starts typing
    if (urlError && url) {
      setUrlError('');
    }

    // Validate if URL is not empty
    if (url && !validateAirbnbUrl(url)) {
      setUrlError('Please enter a valid Airbnb listing URL');
    } else {
      setUrlError('');
    }
  };

  // Track when user enters URL (on blur)
  const handleUrlBlur = () => {
    if (airbnbUrl && validateAirbnbUrl(airbnbUrl)) {
      trackEvent('url_entered', {
        url_type: airbnbUrl.includes('/rooms/') ? 'rooms' :
                  airbnbUrl.includes('abnb.me') || airbnbUrl.includes('airbnb.app.link') ? 'short_link' :
                  airbnbUrl.includes('/h/') ? 'vanity' : 'other'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Track form submission
    trackEvent('results_requested', {
      has_email: !!email,
      url_provided: !!airbnbUrl
    });

    // Validate before submission
    if (!airbnbUrl || !validateAirbnbUrl(airbnbUrl)) {
      setUrlError('Please enter a valid Airbnb listing URL');
      return;
    }

    setIsLoading(true);
    setUrlError('');

    try {
      // Normalize the URL through our API
      const response = await fetch('/api/normalize-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: airbnbUrl }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setUrlError(data.error || 'Unable to process this URL. Please check the link.');
        setIsLoading(false);
        return;
      }

      const normalizedUrl = data.normalizedUrl;
      console.log('URL normalized:', airbnbUrl, '->', normalizedUrl);

      // Update the input field with the normalized URL so user can see it
      setAirbnbUrl(normalizedUrl);

      // Track successful URL submission before redirect
      trackEvent('url_submitted', {
        event_category: 'engagement',
        event_label: 'homepage_form'
      });

      // Navigate to waiting page with the normalized URL and email
      const params = new URLSearchParams({
        url: normalizedUrl,
        ...(email && { email }),
      });
      router.push(`/waiting?${params.toString()}`);

    } catch (error) {
      console.error('Error normalizing URL:', error);
      trackError('url_normalization_failed', error instanceof Error ? error.message : 'Unknown error');
      setUrlError('Failed to process URL. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Logo/Site Name */}
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900">
          Airbnb<span className="text-airbnb-red">Optimizer</span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl text-gray-600">
          Rank higher in Airbnb search. Get more eyes on your listing.
        </p>

        {/* Page Error Message */}
        {pageError && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
            <p className="text-red-700">{pageError}</p>
            <button
              onClick={() => setPageError(null)}
              className="text-red-500 text-sm mt-2 hover:text-red-700"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 mt-12">
          {/* URL Input */}
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-4xl">↓</span>
              <label htmlFor="airbnb-url" className="text-lg text-gray-700 font-medium">
                Enter your Airbnb listing URL
              </label>
            </div>
            <input
              id="airbnb-url"
              type="text"
              value={airbnbUrl}
              onChange={handleUrlChange}
              onBlur={handleUrlBlur}
              placeholder="Paste any Airbnb listing link (abnb.me, /rooms/, etc.)"
              className={`w-full px-6 py-4 text-lg border-2 rounded-lg focus:outline-none transition-colors ${
                urlError
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:border-airbnb-red'
              }`}
              required
            />
            {urlError && (
              <p className="text-red-500 text-sm mt-2 text-left">
                {urlError}
              </p>
            )}
          </div>

          {/* Optional Email Input */}
          <div className="relative">
            <label htmlFor="email" className="block text-left text-sm text-gray-600 mb-2">
              Email (optional - to receive results)
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-6 py-3 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:border-airbnb-red transition-colors"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !airbnbUrl || !!urlError}
            className="w-full bg-airbnb-red hover:bg-[#E00007] text-white font-semibold py-4 px-8 rounded-lg text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Verifying URL...' : 'Optimize My Listing'}
          </button>
        </form>

        {/* Footer Note */}
        <p className="text-sm text-gray-500 mt-8">
          Analysis takes about 30-60 seconds
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-2xl text-gray-600">Loading...</div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
