'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export default function NotFound() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Track 404 event to Google Analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      const fullUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');

      (window as any).gtag('event', 'page_not_found', {
        page_path: fullUrl,
        page_title: '404 Not Found',
        referrer: document.referrer || 'direct',
      });

      console.log('404 tracked:', fullUrl);
    }
  }, [pathname, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Page Not Found
        </h2>
        <p className="text-gray-600 mb-8">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. The URL might be mistyped or the page may have been moved.
        </p>

        <div className="space-y-4">
          <Link
            href="/"
            className="block w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Go to Homepage
          </Link>

          <Link
            href="/blog"
            className="block w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Browse Blog
          </Link>
        </div>

        <p className="text-sm text-gray-500 mt-8">
          Need help?{' '}
          <a
            href="mailto:airbnboptimizerr@gmail.com"
            className="text-blue-600 hover:underline"
          >
            Contact us
          </a>
        </p>
      </div>
    </div>
  );
}
