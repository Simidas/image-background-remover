import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import posts from "../posts/postRegistry";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) return {};

  return {
    title: post.metadata.title,
    description: post.metadata.description,
    keywords: post.metadata.keywords,
    alternates: {
      canonical: `https://image-background-remover.zhuwd.com/blog/${slug}`,
    },
    openGraph: {
      type: "article",
      url: `https://image-background-remover.zhuwd.com/blog/${slug}`,
      title: post.metadata.title,
      description: post.metadata.description,
      images: [{ url: "https://image-background-remover.zhuwd.com/og-image.png", width: 1200, height: 630 }],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) notFound();

  const PostComponent = post.component;

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 transition-colors">
            <span>←</span>
            <span className="font-medium text-sm">Back to RemoveBG Pro</span>
          </Link>
          <span className="text-sm font-medium text-zinc-500">Blog</span>
        </div>
      </header>

      {/* Article */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link
            href="/blog"
            className="text-sm text-amber-600 hover:text-amber-700 font-medium"
          >
            ← All Articles
          </Link>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-black leading-tight mb-4">
          {post.metadata.title}
        </h1>

        <div className="flex items-center gap-4 text-sm text-zinc-500 mb-8 pb-8 border-b border-zinc-200">
          <span>📅 {post.metadata.date}</span>
          <span>·</span>
          <span>⏱️ 5 min read</span>
          <span>·</span>
          <span>🖼️ RemoveBG Pro</span>
        </div>

        <PostComponent />
      </main>

      {/* Footer CTA */}
      <div className="bg-white border-t border-zinc-200 mt-16">
        <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-black text-lg">Try RemoveBG Pro Free</p>
            <p className="text-zinc-500 text-sm mt-1">5 free credits/month · No signup required</p>
          </div>
          <Link
            href="/"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full transition-colors text-sm"
          >
            Remove Background Now →
          </Link>
        </div>
      </div>
    </div>
  );
}
