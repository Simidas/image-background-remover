import type { Metadata } from "next";
import Link from "next/link";
import posts from "./posts/postRegistry";

export const metadata: Metadata = {
  title: "Blog — RemoveBG Pro",
  description:
    "Learn how to remove image backgrounds, improve your e-commerce product photography, and find the best background removal tools. Guides and tutorials from RemoveBG Pro.",
  keywords: ["background removal guide", "product photography tips", "ecommerce image editing"],
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 transition-colors">
            <span>←</span>
            <span className="font-medium text-sm">Back to RemoveBG Pro</span>
          </Link>
          <span className="text-sm font-medium text-zinc-500">Blog</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-14">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-black mb-4">RemoveBG Pro Blog</h1>
          <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
            Guides, tutorials, and tool reviews to help you create better product images and grow your online store.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group bg-white border border-zinc-200 rounded-2xl p-6 hover:border-zinc-300 hover:shadow-md transition-all"
            >
              <div className="text-xs text-amber-600 font-semibold mb-3">
                {post.metadata.date}
              </div>
              <h2 className="font-bold text-black text-lg leading-snug mb-3 group-hover:text-blue-600 transition-colors">
                {post.metadata.title}
              </h2>
              <p className="text-zinc-500 text-sm leading-relaxed line-clamp-2 mb-4">
                {post.metadata.description}
              </p>
              <span className="text-sm font-medium text-blue-600 group-hover:text-blue-700">
                Read more →
              </span>
            </Link>
          ))}
        </div>
      </main>

      {/* Footer CTA */}
      <div className="bg-white border-t border-zinc-200 mt-16">
        <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-black text-lg">Ready to remove backgrounds?</p>
            <p className="text-zinc-500 text-sm mt-1">5 free credits/month · No signup required</p>
          </div>
          <Link
            href="/"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full transition-colors text-sm"
          >
            Get Started Free →
          </Link>
        </div>
      </div>
    </div>
  );
}
