'use client';

import { buildURLWithUTMs } from '@/lib/utm';

export default function BackToHome() {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    // Preserve UTM parameters when navigating to homepage
    window.location.href = buildURLWithUTMs('/', {});
  };

  return (
    <a
      href="/"
      onClick={handleClick}
      className="inline-flex items-center gap-2 text-lg font-semibold text-[#FF5A5F] hover:text-[#e04e52] transition-colors cursor-pointer"
    >
      <span>←</span>
      <span>Back to Home</span>
    </a>
  );
}
