'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { buildURLWithUTMs } from '@/lib/utm';

export default function BlogNav() {
  const [href, setHref] = useState('/');

  useEffect(() => {
    // Build URL with stored UTM parameters on client side
    setHref(buildURLWithUTMs('/', {}));
  }, []);

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="max-w-[800px] mx-auto px-6 py-4">
        <Link
          href={href}
          className="text-2xl font-bold text-[#FF5A5F] hover:text-[#e04e52] transition-colors"
        >
          AirbnbOptimizer
        </Link>
      </div>
    </nav>
  );
}
