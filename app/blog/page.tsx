import { Metadata } from 'next';
import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Blog - AirbnbOptimizer',
  description: 'Tips, guides, and insights for optimizing your Airbnb listing and ranking higher in search results.',
  openGraph: {
    title: 'Blog - AirbnbOptimizer',
    description: 'Tips, guides, and insights for optimizing your Airbnb listing and ranking higher in search results.',
    type: 'website',
  },
};

export default async function BlogPage() {
  const posts = await getAllPosts();

  return (
    <main className="min-h-screen bg-white">
      <div className="w-full max-w-[800px] mx-auto px-6 sm:px-8 py-16">
        <header className="mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Blog</h1>
          <p className="text-xl text-gray-700 leading-relaxed">
            Tips, guides, and insights for optimizing your Airbnb listing
          </p>
        </header>

        {posts.length === 0 ? (
          <p className="text-gray-700 text-lg">No blog posts yet. Check back soon!</p>
        ) : (
          <div className="space-y-12">
            {posts.map((post) => (
              <article key={post.slug} className="border-b border-gray-200 pb-12 last:border-b-0">
                <Link href={`/blog/${post.slug}`} className="group block no-underline">
                  <h2 className="text-3xl font-bold text-gray-900 mb-3 group-hover:!text-[#0066cc] transition-colors">
                    {post.title}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <time dateTime={post.date}>
                      {new Date(post.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </time>
                    <span>by {post.author}</span>
                  </div>
                  <p className="text-gray-800 text-[17px] leading-[1.7]">{post.description}</p>
                </Link>
              </article>
            ))}
          </div>
        )}

        <div className="mt-16 pt-8 border-t border-gray-200">
          <Link href="/" className="!text-[#0066cc] hover:!underline font-medium no-underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
