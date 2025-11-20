'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function CompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [recordId, setRecordId] = useState('');
  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
    const id = searchParams.get('id');
    const stripeSessionId = searchParams.get('session_id');

    console.log('Complete page loaded with params:', {
      recordId: id || 'none',
      sessionId: stripeSessionId || 'none'
    });

    if (id) {
      setRecordId(id);
    }
    if (stripeSessionId) {
      setSessionId(stripeSessionId);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
            Airbnb<span className="text-airbnb-red">Optimizer</span>
          </h1>
        </div>

        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="text-8xl mb-4">🎉</div>
        </div>

        {/* Success Message */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Payment Successful!
          </h2>
          <p className="text-xl text-gray-600 mb-6">
            Thank you for your purchase. Your optimized Airbnb description is being generated.
          </p>

          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-center gap-3 mb-3">
              <span className="text-3xl">✅</span>
              <h3 className="text-xl font-bold text-green-900">What happens next?</h3>
            </div>
            <ul className="text-left text-green-800 space-y-2 max-w-md mx-auto">
              <li className="flex items-start gap-2">
                <span>1.</span>
                <span>Our AI is generating your professionally optimized description</span>
              </li>
              <li className="flex items-start gap-2">
                <span>2.</span>
                <span>You'll receive your new description via email within 5 minutes</span>
              </li>
              <li className="flex items-start gap-2">
                <span>3.</span>
                <span>Copy and paste it directly into your Airbnb listing</span>
              </li>
            </ul>
          </div>

          {recordId && (
            <p className="text-sm text-gray-500 mb-4">
              Reference ID: {recordId}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.push('/')}
            className="bg-airbnb-red hover:bg-[#E00007] text-white font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            Optimize Another Listing
          </button>
        </div>

        {/* Support Note */}
        <p className="text-center text-sm text-gray-500 mt-8">
          Questions? Contact us at support@airbnboptimizer.com
        </p>
      </div>
    </div>
  );
}

export default function CompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-2xl text-gray-600">Loading...</div>
      </div>
    }>
      <CompleteContent />
    </Suspense>
  );
}
