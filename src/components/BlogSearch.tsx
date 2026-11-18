import { useEffect, useMemo, useState } from "preact/hooks";

export interface SearchablePost {
  id: string;
  title: string;
  description: string;
  pubDate: string;
  tags: string[];
  body?: string;
}

interface Props {
  initialPosts: SearchablePost[];
  allTags: string[];
}

export default function BlogSearch({ initialPosts, allTags }: Props) {
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [posts, setPosts] = useState<SearchablePost[]>(initialPosts);
  const [indexLoaded, setIndexLoaded] = useState(false);

  const loadFullIndex = () => {
    if (indexLoaded) return;
    setIndexLoaded(true);
    fetch("/search-index.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: SearchablePost[] | null) => {
        if (data) setPosts(data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    const tag = params.get("tag");
    if (q) {
      setQuery(q);
      loadFullIndex();
    }
    if (tag) setSelectedTags([tag]);
  }, []);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const filtered = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return posts.filter((post) => {
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.every((t) => post.tags.includes(t));
      if (!matchesTags) return false;

      if (terms.length === 0) return true;
      const haystack = `${post.title} ${post.description} ${post.tags.join(" ")} ${post.body ?? ""}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [posts, query, selectedTags]);

  return (
    <section class="blog-search">
      <div class="search-controls">
        <label class="sr-only" for="blog-search-input">Search posts by word or tag</label>
        <input
          id="blog-search-input"
          type="search"
          class="search-input"
          placeholder="Search words (e.g. bloom, float16, raylib)..."
          value={query}
          onFocus={loadFullIndex}
          onInput={(e) => {
            loadFullIndex();
            setQuery((e.currentTarget as HTMLInputElement).value);
          }}
        />
        {(query || selectedTags.length > 0) && (
          <button
            type="button"
            class="clear-btn"
            onClick={() => {
              setQuery("");
              setSelectedTags([]);
            }}
          >
            Clear
          </button>
        )}
      </div>

      {allTags.length > 0 && (
        <div class="tag-filter-row" role="group" aria-label="Filter by tag">
          {allTags.map((tag) => {
            const active = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={active}
                class={`tag-pill ${active ? "is-active" : ""}`}
                onClick={() => toggleTag(tag)}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      )}

      <p class="search-count" role="status">
        Showing {filtered.length} {filtered.length === 1 ? "post" : "posts"}
      </p>

      <ul class="post-list">
        {filtered.map((post) => (
          <li key={post.id} class="post-card">
            <a class="post-card__link" href={`/blog/${post.id}/`}>
              <time datetime={post.pubDate}>
                {new Date(post.pubDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </time>
              <h2>{post.title}</h2>
              <p>{post.description}</p>
            </a>
            {post.tags.length > 0 && (
              <ul class="tag-list">
                {post.tags.map((tag) => (
                  <li key={tag}>
                    <a class="tag-pill" href={`/tags/${encodeURIComponent(tag)}/`}>#{tag}</a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}