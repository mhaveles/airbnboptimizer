import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

const postsDirectory = path.join(process.cwd(), 'content/blog');

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  keywords?: string[];
  faq?: Array<{ question: string; answer: string }>;
  content: string;
}

export interface BlogPostMetadata {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
}

export async function getAllPosts(): Promise<BlogPostMetadata[]> {
  // Ensure directory exists
  if (!fs.existsSync(postsDirectory)) {
    console.error('[getAllPosts] Posts directory does not exist:', postsDirectory);
    return [];
  }

  const fileNames = fs.readdirSync(postsDirectory);
  console.error('[getAllPosts] Files found:', fileNames);

  const allPostsData = fileNames
    .filter(fileName => fileName.endsWith('.md'))
    .map(fileName => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(fileContents);

      console.error('[getAllPosts] Parsed:', slug, '| date:', data.date, '| title:', data.title?.substring(0, 50));

      return {
        slug,
        title: data.title || 'Untitled',
        description: data.description || '',
        date: data.date || '',
        author: data.author || 'Arthur',
      };
    });

  // Sort posts by date (newest first)
  const sorted = allPostsData.sort((a, b) => {
    if (a.date < b.date) {
      return 1;
    } else {
      return -1;
    }
  });

  console.error('[getAllPosts] Sorted posts:', sorted.map(p => `${p.slug} (${p.date})`));
  return sorted;
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const fullPath = path.join(postsDirectory, `${slug}.md`);
    console.error('[getPostBySlug] Attempting to read:', fullPath);
    console.error('[getPostBySlug] File exists:', fs.existsSync(fullPath));

    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    console.error('[getPostBySlug] Successfully parsed:', slug, '| title:', data.title);

    // Convert markdown to HTML
    const processedContent = await remark()
      .use(html, { sanitize: false })
      .process(content);
    const contentHtml = processedContent.toString();

    return {
      slug,
      title: data.title || 'Untitled',
      description: data.description || '',
      date: data.date || '',
      author: data.author || 'Arthur',
      keywords: data.keywords || [],
      faq: data.faq || [],
      content: contentHtml,
    };
  } catch (error) {
    console.error('[getPostBySlug] ERROR reading slug:', slug, '| error:', error);
    return null;
  }
}

export async function getAllSlugs(): Promise<string[]> {
  // Ensure directory exists
  if (!fs.existsSync(postsDirectory)) {
    console.error('[Blog] Posts directory does not exist:', postsDirectory);
    return [];
  }

  const fileNames = fs.readdirSync(postsDirectory);
  console.error('[Blog] Files found in', postsDirectory, ':', fileNames);

  const slugs = fileNames
    .filter(fileName => fileName.endsWith('.md'))
    .map(fileName => fileName.replace(/\.md$/, ''));

  console.error('[Blog] Slugs generated:', slugs);
  return slugs;
}
