'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUTMParams } from '@/lib/utm';

export default function BlogCTA() {
  const [url, setUrl] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Get stored UTM parameters
    const utmParams = getStoredUTMParams();

    // Build params object
    const params = new URLSearchParams({
      ...(url.trim() && { url: url.trim() }),
      ...utmParams,
    });

    // Navigate to homepage with UTM parameters preserved
    const queryString = params.toString();
    router.push(queryString ? `/?${queryString}` : '/');
  };

  return (
    <div className="mt-16 mb-8 p-8 bg-gradient-to-br from-[#FF5A5F]/5 to-[#FF5A5F]/10 rounded-lg border border-[#FF5A5F]/20">
      <h3 className="text-2xl font-bold text-[#222] mb-4 text-center">
        See what guests might be missing
      </h3>
      <form onSubmit={handleSubmit} className="max-w-md mx-auto">
        <div className="mb-4">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste your Airbnb listing URL"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#FF5A5F] focus:ring-2 focus:ring-[#FF5A5F]/20 transition-all"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-[#FF5A5F] text-white font-semibold py-3 px-6 rounded-lg hover:bg-[#e04e52] transition-colors shadow-sm hover:shadow-md"
        >
          Analyze My Listing
        </button>
      </form>
    </div>
  );
}
