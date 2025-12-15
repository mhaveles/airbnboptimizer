'use client';

import { useEffect, useState, Suspense, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  validateRecordId,
  trackError,
  ERROR_MESSAGES,
  type ErrorInfo
} from '@/lib/validation';

// Stripe Price IDs (Test Mode)
const PRICE_IDS = {
  single: 'price_1SYxQxDMcCJIBpshnSwSWFTL',
  bundle: 'price_1SYxRWDMcCJIBpshtfa372Vu',
};

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [recommendations, setRecommendations] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [recordId, setRecordId] = useState('');
  const [showEmailOption, setShowEmailOption] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true);
  const emailSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialized = useRef(false);

  const fetchRecommendations = useCallback(async (recId: string) => {
    try {
      setIsLoadingRecommendations(true);
      console.log('Fetching recommendations for recordId:', recId);

      const response = await fetch(`/api/get-record?recordId=${recId}`);
      const data = await response.json();

      console.log('Fetch recommendations response:', response.status, data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load recommendations');
      }

      if (!data.recommendations) {
        throw new Error('No recommendations found');
      }

      setRecommendations(data.recommendations);

      // If email was returned from Airtable, set it
      if (data.email) {
        setUserEmail(prevEmail => prevEmail || data.email);
      }

      setIsLoadingRecommendations(false);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      trackError('fetch_recommendations_failed', error instanceof Error ? error.message : 'Unknown error', {
        recordId: recId
      });
      setError({
        userMessage: 'Unable to load your recommendations. Please try again.',
        technicalMessage: error instanceof Error ? error.message : 'Unknown error',
        action: 'retry',
      });
      setIsLoadingRecommendations(false);
    }
  }, []);

  useEffect(() => {
    // Only run initialization once
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const email = searchParams.get('email');
    const recId = searchParams.get('recordId');

    console.log('Results page loaded with params:', {
      email: email || 'none',
      recordId: recId || 'none'
    });

    // Validate recordId
    const recordIdValidation = validateRecordId(recId);
    if (!recordIdValidation.isValid) {
      console.error('RecordId validation failed:', recordIdValidation.error);
      trackError('invalid_recordId', recordIdValidation.error || 'Unknown error', {
        recordId: recId || 'null'
      });
      setError(ERROR_MESSAGES.INVALID_RECORD_ID);
      setIsLoadingRecommendations(false);
      return;
    }

    // Set email and recordId from URL params
    if (email) {
      setUserEmail(email);
    }
    if (recId) {
      setRecordId(recId);
      console.log('RecordId set in state:', recId);

      // Fetch recommendations from Airtable
      fetchRecommendations(recId);
    } else {
      console.error('No recordId found in URL parameters');
      setError(ERROR_MESSAGES.MISSING_RECORD_ID);
      setIsLoadingRecommendations(false);
    }
  }, [searchParams, fetchRecommendations]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (emailSaveTimeoutRef.current) {
        clearTimeout(emailSaveTimeoutRef.current);
      }
    };
  }, []);

  // Function to actually save the email to Airtable
  const saveEmailToAirtable = useCallback(async (email: string) => {
    // Validate recordId before sending
    if (!recordId) {
      trackError('email_submit_no_recordId', 'Attempted email submit without recordId');
      setEmailError('Unable to save your email. Please try again from the beginning.');
      return;
    }

    const payload = {
      email: email,
      recordId: recordId,
    };

    console.log('Auto-saving email with payload:', payload);

    setEmailLoading(true);

    try {
      // Send email and recordId to our API to update the Airtable record directly
      const response = await fetch('/api/save-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('Email save response:', response.status, data);

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setEmailSaved(true);
      setEmailSent(true);
    } catch (error) {
      console.error('Error saving email:', error);
      trackError('email_save_failed', error instanceof Error ? error.message : 'Unknown error', {
        recordId: recordId
      });
      setEmailError(error instanceof Error ? error.message : 'Failed to save your email. Please try again.');
      setEmailSaved(false);
    } finally {
      setEmailLoading(false);
    }
  }, [recordId]);

  // Debounced email change handler
  const handleEmailChange = (email: string) => {
    // Update email state immediately for responsive UI
    setUserEmail(email);
    setEmailError(null);
    setEmailSaved(false);

    // Clear any existing timeout
    if (emailSaveTimeoutRef.current) {
      clearTimeout(emailSaveTimeoutRef.current);
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      // Don't save if email is invalid
      return;
    }

    // Debounce the save - only save after user stops typing for 500ms
    emailSaveTimeoutRef.current = setTimeout(() => {
      saveEmailToAirtable(email);
    }, 500);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail) return;

    // Validate recordId before sending
    if (!recordId) {
      trackError('email_submit_no_recordId', 'Attempted email submit without recordId');
      setEmailError('Unable to save your email. Please try again from the beginning.');
      return;
    }

    const payload = {
      email: userEmail,
      recordId: recordId,
    };

    console.log('Submitting email capture with payload:', payload);

    setEmailError(null);
    setEmailLoading(true);

    try {
      // Send email and recordId to our API to update the Airtable record directly
      const response = await fetch('/api/save-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('Email save response:', response.status, data);

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setEmailSent(true);
      setShowEmailOption(false);
    } catch (error) {
      console.error('Error saving email:', error);
      trackError('email_save_failed', error instanceof Error ? error.message : 'Unknown error', {
        recordId: recordId
      });
      // Show error but don't block the user
      setEmailError(error instanceof Error ? error.message : 'Failed to save your email. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  // Share functionality
  const getShareUrl = () => {
    if (typeof window === 'undefined') return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}?utm_source=Website+Referral+Button`;
  };

  const handleCopyLink = async () => {
    const shareUrl = getShareUrl();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleShareFacebook = () => {
    const shareUrl = getShareUrl();
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      '_blank',
      'width=600,height=400'
    );
  };

  const handleShareTwitter = () => {
    const shareUrl = getShareUrl();
    const text = 'Just ranked my Airbnb listing higher with @airbnboptimizer 📈 More views = more bookings 💰';
    window.open(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`,
      '_blank',
      'width=600,height=400'
    );
  };

  const handleShareEmail = () => {
    const shareUrl = getShareUrl();
    const subject = 'Check out AirbnbOptimizer';
    const body = `I thought you might find this useful!\n\nAirbnbOptimizer shows you exactly what to fix so your listing ranks higher and books more guests.\n\nCheck it out: ${shareUrl}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleCheckout = async (priceId: string, productType: string) => {
    console.log('=== Frontend: Starting checkout ===');
    console.log('Price ID:', priceId);
    console.log('Record ID:', recordId);
    console.log('Product Type:', productType);

    if (!recordId) {
      alert('Error: No recordId found. Please try again from the beginning.');
      return;
    }

    setCheckoutLoading(productType);

    try {
      const payload = {
        priceId,
        recordId,
        email: userEmail,
      };

      console.log('Sending request to /api/create-checkout with payload:', payload);

      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('Response status:', response.status);

      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        const errorMsg = data.message || data.error || 'Failed to create checkout session';
        console.error('Checkout failed:', errorMsg);
        console.error('Full error data:', data);
        alert(`Checkout failed: ${errorMsg}`);
        throw new Error(errorMsg);
      }

      if (data.url) {
        console.log('Redirecting to Stripe checkout:', data.url);
        window.location.href = data.url;
      } else {
        console.error('No URL returned from checkout API');
        alert('Error: No checkout URL received');
      }
    } catch (error) {
      console.error('=== Frontend: Checkout error ===', error);
      trackError('checkout_failed', error instanceof Error ? error.message : 'Unknown error', {
        recordId,
        priceId,
      });
      setCheckoutLoading(null);
    }
  };

  // Show loading state
  if (isLoadingRecommendations) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-6xl animate-pulse">✨</div>
          <h2 className="text-2xl font-bold text-gray-900">Loading Your Recommendations</h2>
          <p className="text-gray-600">Just a moment...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-6xl">❌</div>
          <h2 className="text-2xl font-bold text-gray-900">Something Went Wrong</h2>
          <p className="text-gray-600">{error.userMessage}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-airbnb-red hover:bg-[#E00007] text-white font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  if (!recommendations) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
            Airbnb<span className="text-airbnb-red">Optimizer</span>
          </h1>
          <p className="text-xl text-gray-600">
            Your personalized recommendations
          </p>
        </div>

        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">✨</div>
        </div>

        {/* Recommendations Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Your Action Plan
          </h2>
          <div className="prose prose-lg max-w-none">
            <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
              {recommendations}
            </div>
          </div>
        </div>

        {/* Email Input Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Enter Your Email to Purchase
          </h2>
          <p className="text-gray-600 mb-4">
            We need your email to send your optimized description and receipt.
          </p>
          <div className="space-y-3">
            <input
              type="email"
              value={userEmail}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-airbnb-red transition-colors"
              required
            />
            {emailLoading && (
              <div className="flex items-center gap-2 text-gray-600">
                <span className="animate-pulse">💾</span>
                <span>Saving email...</span>
              </div>
            )}
            {emailSaved && !emailLoading && (
              <div className="flex items-center gap-2 text-green-600">
                <span>✓</span>
                <span>Email saved! You can now purchase below.</span>
              </div>
            )}
            {emailError && (
              <p className="text-red-500 text-sm">{emailError}</p>
            )}
          </div>
        </div>

        {/* Premium Purchase Section */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-lg p-8 mb-8 text-white">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">
              Get Your Full Optimized Description
            </h2>
            <p className="text-gray-300">
              Rank higher in search results and book more guests with a professionally crafted listing description
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Single Description */}
            <div className="bg-white/10 rounded-lg p-6 border border-white/20">
              <h3 className="text-xl font-bold mb-2">Single Description</h3>
              <p className="text-3xl font-bold mb-4">$29</p>
              <ul className="text-sm text-gray-300 mb-6 space-y-2">
                <li>Full optimized description</li>
                <li>SEO-friendly title suggestions</li>
                <li>Delivered within 24 hours</li>
              </ul>
              <button
                onClick={() => handleCheckout(PRICE_IDS.single, 'single')}
                disabled={!emailSaved || checkoutLoading !== null}
                className="w-full bg-airbnb-red hover:bg-[#E00007] disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {checkoutLoading === 'single' ? 'Loading...' : !emailSaved ? 'Enter Email Above' : 'Buy Full Description - $29'}
              </button>
            </div>

            {/* 3-Pack Bundle */}
            <div className="bg-white/10 rounded-lg p-6 border-2 border-airbnb-red relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-airbnb-red text-white text-xs font-bold px-3 py-1 rounded-full">
                  BEST VALUE
                </span>
              </div>
              <h3 className="text-xl font-bold mb-2">3-Pack Bundle</h3>
              <p className="text-3xl font-bold mb-1">$69</p>
              <p className="text-sm text-green-400 mb-3">Save 20%</p>
              <ul className="text-sm text-gray-300 mb-6 space-y-2">
                <li>3 full optimized descriptions</li>
                <li>SEO-friendly title suggestions</li>
                <li>Delivered within 24 hours</li>
              </ul>
              <button
                onClick={() => handleCheckout(PRICE_IDS.bundle, 'bundle')}
                disabled={!emailSaved || checkoutLoading !== null}
                className="w-full bg-airbnb-red hover:bg-[#E00007] disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {checkoutLoading === 'bundle' ? 'Loading...' : !emailSaved ? 'Enter Email Above' : 'Buy 3-Pack Bundle - $69'}
              </button>
            </div>
          </div>
        </div>

        {/* Email Option Card */}
        {!emailSent && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Want these recommendations in your inbox?
            </h3>

            {!showEmailOption ? (
              <div className="space-y-4">
                <p className="text-gray-600">
                  {userEmail
                    ? `We've already sent these recommendations to ${userEmail}!`
                    : 'Get these recommendations sent to your email for easy reference.'}
                </p>
                {!userEmail && (
                  <button
                    onClick={() => setShowEmailOption(true)}
                    className="bg-airbnb-red hover:bg-[#E00007] text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    Email Me These Results
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => {
                    setUserEmail(e.target.value);
                    setEmailError(null);
                  }}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-airbnb-red transition-colors"
                  required
                />
                {emailError && (
                  <p className="text-red-500 text-sm">{emailError}</p>
                )}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={emailLoading}
                    className="bg-airbnb-red hover:bg-[#E00007] disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    {emailLoading ? 'Saving...' : 'Send Email'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmailOption(false);
                      setEmailError(null);
                    }}
                    disabled={emailLoading}
                    className="bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {emailSent && (
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-3">
              <span className="text-3xl">✓</span>
              <div>
                <h4 className="font-bold text-green-900">Email saved!</h4>
                <p className="text-green-700">
                  We&apos;ll send your results to {userEmail}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.push('/')}
            className="bg-airbnb-red hover:bg-[#E00007] text-white font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            Optimize Another Listing
          </button>
          <button
            onClick={() => setShowShareModal(!showShareModal)}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            Share with a Friend
          </button>
        </div>

        {/* Share Modal */}
        {showShareModal && (
          <div className="mt-6 bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
              Share AirbnbOptimizer
            </h3>
            <p className="text-gray-600 text-center mb-6">
              Help your friends optimize their Airbnb listings!
            </p>

            {/* Copy Link */}
            <div className="mb-6">
              <button
                onClick={handleCopyLink}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <span>{linkCopied ? '✓' : '🔗'}</span>
                {linkCopied ? 'Link Copied!' : 'Copy Link'}
              </button>
            </div>

            {/* Social Share Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleShareFacebook}
                className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <span>📘</span>
                Share on Facebook
              </button>
              <button
                onClick={handleShareTwitter}
                className="w-full bg-[#1DA1F2] hover:bg-[#1A8CD8] text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <span>🐦</span>
                Share on Twitter
              </button>
              <button
                onClick={handleShareEmail}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <span>✉️</span>
                Share via Email
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowShareModal(false)}
              className="w-full mt-4 text-gray-500 hover:text-gray-700 font-medium py-2 transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {/* Privacy Note */}
        <p className="text-center text-sm text-gray-500 mt-8">
          Your privacy matters. We don&apos;t store your listing data or email address.
        </p>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-2xl text-gray-600">Loading...</div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
