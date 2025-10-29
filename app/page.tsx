'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [airbnbUrl, setAirbnbUrl] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!airbnbUrl) return;

    setIsLoading(true);

    // Navigate to waiting page with the URL and email
    const params = new URLSearchParams({
      url: airbnbUrl,
      ...(email && { email }),
    });
    router.push(`/waiting?${params.toString()}`);
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
          Get AI-powered recommendations to improve your listing
        </p>

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
              type="url"
              value={airbnbUrl}
              onChange={(e) => setAirbnbUrl(e.target.value)}
              placeholder="https://www.airbnb.com/rooms/..."
              className="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:border-airbnb-red transition-colors"
              required
            />
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
            disabled={isLoading || !airbnbUrl}
            className="w-full bg-airbnb-red hover:bg-[#E00007] text-white font-semibold py-4 px-8 rounded-lg text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing...' : 'Optimize My Listing'}
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
