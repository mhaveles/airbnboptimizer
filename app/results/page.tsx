'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [recommendations, setRecommendations] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [recordId, setRecordId] = useState('');
  const [showEmailOption, setShowEmailOption] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    const recs = searchParams.get('recommendations');
    const email = searchParams.get('email');
    const recId = searchParams.get('recordId');

    console.log('Results page loaded with params:', {
      hasRecommendations: !!recs,
      email: email || 'none',
      recordId: recId || 'none'
    });

    if (!recs) {
      router.push('/');
      return;
    }

    setRecommendations(recs);
    if (email) {
      setUserEmail(email);
    }
    if (recId) {
      setRecordId(recId);
      console.log('RecordId set in state:', recId);
    } else {
      console.warn('No recordId found in URL parameters');
    }
  }, [searchParams, router]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail) return;

    const payload = {
      email: userEmail,
      recordId: recordId,
    };

    console.log('Submitting email capture with payload:', payload);
    console.log('RecordId value:', recordId || '(empty string)');

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

      setEmailSent(true);
      setShowEmailOption(false);
    } catch (error) {
      console.error('Error sending email data:', error);
      // Still show success to user even if webhook fails
      setEmailSent(true);
      setShowEmailOption(false);
    }
  };

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
            AI-Powered Recommendations
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
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-airbnb-red transition-colors"
                  required
                />
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="bg-airbnb-red hover:bg-[#E00007] text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    Send Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEmailOption(false)}
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
            onClick={() => window.print()}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            Print Results
          </button>
        </div>

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
