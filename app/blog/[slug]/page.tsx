import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPostBySlug, getAllSlugs } from '@/lib/blog';
import styles from './BlogPost.module.css';
import BlogNav from '@/components/BlogNav';
import BlogCTA from '@/components/BlogCTA';

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    authors: [{ name: post.author }],
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  // JSON-LD Schema for Article
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    author: {
      '@type': 'Person',
      name: post.author,
    },
    datePublished: post.date,
    publisher: {
      '@type': 'Organization',
      name: 'AirbnbOptimizer',
    },
  };

  // JSON-LD Schema for FAQ (if exists)
  const faqSchema = post.faq && post.faq.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: post.faq.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  } : null;

  return (
    <>
      {/* JSON-LD Scripts */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      <BlogNav />

      <article className="min-h-screen bg-white">
        <div className="w-full max-w-[800px] mx-auto px-6 sm:px-8 py-16">
          {/* Article Header */}
          <header className="mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 leading-tight">{post.title}</h1>
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
            <p className="text-xl text-gray-700 leading-relaxed">{post.description}</p>
          </header>

          {/* Article Content */}
          <section
            className={styles.blogContent}
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* FAQ Section */}
          {post.faq && post.faq.length > 0 && (
            <section className="mt-20 pt-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-10">Frequently Asked Questions</h2>
              <div className="space-y-6">
                {post.faq.map((item, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-6 border-l-4 border-[#FF5A5F]">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.question}</h3>
                    <p className="text-gray-800 leading-relaxed text-[17px]">{item.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* CTA Section */}
          <BlogCTA />

          {/* Back Link */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <Link href="/blog" className="inline-flex items-center gap-2 text-lg font-semibold text-[#FF5A5F] hover:text-[#e04e52] transition-colors">
              <span>←</span>
              <span>Back to Blog</span>
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}
