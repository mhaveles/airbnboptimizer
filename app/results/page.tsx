'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  validateRecordId,
  trackError,
  ERROR_MESSAGES,
  type ErrorInfo
} from '@/lib/validation';

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [recommendations, setRecommendations] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [recordId, setRecordId] = useState('');
  const [showEmailOption, setShowEmailOption] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [error, setError] = useState<ErrorInfo | null>(null);

  useEffect(() => {
    const recs = searchParams.get('recommendations');
    const email = searchParams.get('email');
    const recId = searchParams.get('recordId');

    console.log('Results page loaded with params:', {
      hasRecommendations: !!recs,
      email: email || 'none',
      recordId: recId || 'none'
    });

    // Validate recommendations exist
    if (!recs) {
      trackError('missing_recommendations', 'No recommendations in URL params');
      setError(ERROR_MESSAGES.MISSING_RECOMMENDATIONS);
      return;
    }

    // Validate recordId
    const recordIdValidation = validateRecordId(recId);
    if (!recordIdValidation.isValid) {
      console.warn('RecordId validation failed:', recordIdValidation.error);
      trackError('invalid_recordId', recordIdValidation.error || 'Unknown error', {
        recordId: recId || 'null'
      });
      // Don't block the user - just warn that some features may not work
    }

    setRecommendations(recs);
    if (email) {
      setUserEmail(email);
    }
    if (recId) {
      setRecordId(recId);
      console.log('RecordId set in state:', recId);
    } else {
      console.warn('No recordId found in URL parameters - email capture may not work correctly');
    }
  }, [searchParams, router]);

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
      email_source: "Results Page",
    };

    console.log('Submitting email capture with payload:', payload);
    console.log('RecordId value:', recordId || '(empty string)');

    setEmailError(null);

    try {
      // Send email and recordId to Make.com webhook to update the Airtable record
      const response = await fetch('https://hook.us2.make.com/mb8e6o5jacmce62htobb7e81how1ltcu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('Email webhook response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setEmailSent(true);
      setShowEmailOption(false);
    } catch (error) {
      console.error('Error sending email data:', error);
      trackError('email_webhook_failed', error instanceof Error ? error.message : 'Unknown error', {
        recordId: recordId
      });
      // Show error but don't block the user
      setEmailError('Failed to save your email. Please try again.');
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
                    className="bg-airbnb-red hover:bg-[#E00007] text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    Send Email
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmailOption(false);
                      setEmailError(null);
                    }}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors"
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
              <span className="text-3xl">✅</span>
              <div>
                <h4 className="font-bold text-green-900">Email Sent!</h4>
                <p className="text-green-700">
                  Check your inbox at {userEmail}
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
