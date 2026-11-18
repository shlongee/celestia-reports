import type { APIContext } from "astro";
import { getCollection } from "astro:content";

export const prerender = true;

function stripMarkdown(raw: string): string {
  return raw
    .replace(/^import\s+.*$/gm, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#*_`>\[\]()!|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(_context: APIContext) {
  const posts = await getCollection("blog", ({ data }) => !data.draft);
  const index = posts
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
    .map((post) => ({
      id: post.id,
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate.toISOString(),
      tags: post.data.tags,
      body: stripMarkdown(post.body ?? ""),
    }));

  return new Response(JSON.stringify(index), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}