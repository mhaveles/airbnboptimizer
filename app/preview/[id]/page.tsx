'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface PreviewData {
  original_title: string;
  improved_title: string;
  original_description: string;
  improved_description: string;
  photo_urls: string[];
  photo_recommendations: string;
}

// Stripe Price ID (same as results page)
const PRICE_ID = 'price_1SWvtDDMcCJIBpshZhhSXytp';

export default function PreviewPage() {
  const params = useParams();
  const router = useRouter();
  const recordId = params.id as string;

  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'optimized'>('current');
  const hasInitialized = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`/api/preview-record?recordId=${recordId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load preview');
      }

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [recordId]);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    if (!recordId || !recordId.startsWith('rec')) {
      setError('Invalid listing ID');
      setLoading(false);
      return;
    }
    fetchData();
  }, [recordId, fetchData]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: PRICE_ID, recordId }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Checkout failed');
      }

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Unable to start checkout. Please try again.');
      setCheckoutLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-3 border-gray-200 border-t-[#FF5A5F] rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm">Loading your listing preview...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">{error}</h2>
          <p className="text-gray-500 text-sm">We couldn&apos;t load this listing preview.</p>
          <button
            onClick={() => router.push('/')}
            className="text-[#FF5A5F] font-medium hover:underline text-sm"
          >
            Go to homepage
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const hasTitle = data.original_title || data.improved_title;
  const hasDescription = data.original_description || data.improved_description;
  const hasPhotos = data.photo_urls.length > 0;

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 group">
            <span className="text-xl font-bold text-gray-900">
              Airbnb<span className="text-[#FF5A5F]">Optimizer</span>
            </span>
          </button>
          <button
            onClick={handleCheckout}
            disabled={checkoutLoading}
            className="bg-[#FF5A5F] hover:bg-[#E00007] disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            {checkoutLoading ? 'Loading...' : 'Get Full Package - $29'}
          </button>
        </div>
      </header>

      {/* Page title */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Your Listing Preview</h1>
        <p className="text-gray-500 mt-1">See how your optimized listing compares to the original</p>
      </div>

      {/* Mobile tab switcher */}
      <div className="md:hidden sticky top-16 z-40 bg-[#F7F7F7] px-4 pb-4">
        <div className="flex bg-gray-200 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('current')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'current'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            Current Listing
          </button>
          <button
            onClick={() => setActiveTab('optimized')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'optimized'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            Optimized
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-12">
        {/* Title comparison */}
        {hasTitle && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Title</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Current Title */}
              <div className={`${activeTab !== 'current' ? 'hidden md:block' : ''}`}>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Current</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 leading-snug">
                    {data.original_title || <span className="text-gray-300 italic">No title provided</span>}
                  </h3>
                </div>
              </div>

              {/* Optimized Title */}
              <div className={`${activeTab !== 'optimized' ? 'hidden md:block' : ''}`}>
                <div className="bg-white rounded-xl border-2 border-[#FF5A5F]/20 p-6 relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[#FF5A5F] uppercase tracking-wider">Optimized</span>
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                    </div>
                    {data.improved_title && (
                      <CopyButton
                        onClick={() => copyToClipboard(data.improved_title, 'title')}
                        copied={copiedField === 'title'}
                      />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 leading-snug">
                    {data.improved_title || <span className="text-gray-300 italic">Not yet generated</span>}
                  </h3>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Description comparison */}
        {hasDescription && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Description</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Current Description */}
              <div className={`${activeTab !== 'current' ? 'hidden md:block' : ''}`}>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Current</span>
                  </div>
                  <div className="text-gray-700 text-[15px] leading-relaxed whitespace-pre-line">
                    {data.original_description || <span className="text-gray-300 italic">No description provided</span>}
                  </div>
                </div>
              </div>

              {/* Optimized Description - styled like Airbnb listing */}
              <div className={`${activeTab !== 'optimized' ? 'hidden md:block' : ''}`}>
                <div className="bg-white rounded-xl border-2 border-[#FF5A5F]/20 p-6 relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[#FF5A5F] uppercase tracking-wider">Optimized</span>
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                    </div>
                    {data.improved_description && (
                      <CopyButton
                        onClick={() => copyToClipboard(data.improved_description, 'description')}
                        copied={copiedField === 'description'}
                      />
                    )}
                  </div>
                  <AirbnbDescriptionPreview text={data.improved_description} />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Photos section */}
        {hasPhotos && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Photos</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              {/* Photo grid - Airbnb style mosaic */}
              <div className="mb-6">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Your Photos</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {data.photo_urls.map((url, i) => (
                    <div
                      key={i}
                      className={`relative overflow-hidden rounded-lg bg-gray-100 ${
                        i === 0 ? 'col-span-2 row-span-2' : ''
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Listing photo ${i + 1}`}
                        className={`w-full object-cover ${i === 0 ? 'h-64 sm:h-80' : 'h-32 sm:h-40'}`}
                        loading={i < 5 ? 'eager' : 'lazy'}
                      />
                      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                        {i + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Photo recommendations */}
              {data.photo_recommendations && (
                <div className="border-t border-gray-100 pt-5">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-[#FF5A5F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <h3 className="text-base font-semibold text-gray-900">Photo Recommendations</h3>
                  </div>
                  <div className="text-gray-700 text-[15px] leading-relaxed whitespace-pre-line">
                    {data.photo_recommendations}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="mb-8">
          <div className="bg-gray-900 rounded-2xl p-8 sm:p-10 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Ready to Boost Your Bookings?
            </h2>
            <p className="text-gray-400 mb-2 max-w-lg mx-auto">
              Get your fully optimized listing — title, description, and photo strategy — ready to copy and paste.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              One extra booking pays for this 10x over.
            </p>
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="bg-[#FF5A5F] hover:bg-[#E00007] disabled:opacity-50 text-white font-semibold px-8 py-3.5 rounded-lg transition-colors text-lg"
            >
              {checkoutLoading ? 'Loading...' : 'Get the Full Package for $29'}
            </button>
            <div className="flex items-center justify-center gap-6 mt-6 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Delivered in 24h
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copy & paste ready
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                SEO optimized
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ─── Subcomponents ─── */

function CopyButton({ onClick, copied }: { onClick: () => void; copied: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
        copied
          ? 'bg-green-50 text-green-600'
          : 'bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-700'
      }`}
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

function AirbnbDescriptionPreview({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);

  if (!text) {
    return <span className="text-gray-300 italic">Not yet generated</span>;
  }

  const lines = text.split('\n');
  const isLong = lines.length > 8 || text.length > 500;
  const displayText = !expanded && isLong ? lines.slice(0, 8).join('\n') : text;

  return (
    <div>
      <div className="text-gray-800 text-[15px] leading-[1.65] whitespace-pre-line font-normal">
        {displayText}
        {!expanded && isLong && '...'}
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-[15px] font-semibold text-gray-900 underline underline-offset-2 hover:text-[#FF5A5F] transition-colors"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}
