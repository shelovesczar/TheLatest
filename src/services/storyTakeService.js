const STORY_TAKE_ENDPOINT = "/.netlify/functions/storyTake";

export async function fetchStoryTake(article = {}) {
  const params = new URLSearchParams();

  if (article?.title) params.set("title", article.title);
  if (article?.source) params.set("source", article.source);
  if (article?.category) params.set("category", article.category);
  if (article?.link || article?.url)
    params.set("url", article.link || article.url);

  const response = await fetch(`${STORY_TAKE_ENDPOINT}?${params.toString()}`);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error || "Unable to load The Latest's Take.");
  }

  return payload;
}
