'use client';

import { buildURLWithUTMs } from '@/lib/utm';

export default function BlogNav() {
  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    // Preserve UTM parameters when navigating to homepage
    window.location.href = buildURLWithUTMs('/', {});
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="max-w-[800px] mx-auto px-6 py-4">
        <a
          href="/"
          onClick={handleHomeClick}
          className="text-2xl font-bold text-[#FF5A5F] hover:text-[#e04e52] transition-colors cursor-pointer"
        >
          AirbnbOptimizer
        </a>
      </div>
    </nav>
  );
}
