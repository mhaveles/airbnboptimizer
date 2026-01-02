'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { buildURLWithUTMs } from '@/lib/utm';

export default function BackToHome() {
  const [href, setHref] = useState('/');

  useEffect(() => {
    // Build URL with stored UTM parameters on client side
    setHref(buildURLWithUTMs('/', {}));
  }, []);

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-lg font-semibold text-[#FF5A5F] hover:text-[#e04e52] transition-colors"
    >
      <span>←</span>
      <span>Back to Home</span>
    </Link>
  );
}
