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
      <div className="max-w-4xl mx-auto px-4 py-16">
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Blog</h1>
          <p className="text-lg text-gray-600">
            Tips, guides, and insights for optimizing your Airbnb listing
          </p>
        </header>

        {posts.length === 0 ? (
          <p className="text-gray-600">No blog posts yet. Check back soon!</p>
        ) : (
          <div className="space-y-8">
            {posts.map((post) => (
              <article key={post.slug} className="border-b border-gray-200 pb-8 last:border-b-0">
                <Link href={`/blog/${post.slug}`} className="group">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {post.title}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <time dateTime={post.date}>
                      {new Date(post.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </time>
                    <span>by {post.author}</span>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{post.description}</p>
                </Link>
              </article>
            ))}
          </div>
        )}

        <div className="mt-12 pt-8 border-t border-gray-200">
          <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium">
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
