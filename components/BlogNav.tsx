import Link from 'next/link';

export default function BlogNav() {
  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="max-w-[800px] mx-auto px-6 py-4">
        <Link
          href="/"
          className="text-2xl font-bold text-[#FF5A5F] hover:text-[#e04e52] transition-colors"
        >
          AirbnbOptimizer
        </Link>
      </div>
    </nav>
  );
}
