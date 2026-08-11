const DOSSIER_ENDPOINT = "/.netlify/functions/storyDossier";

export async function fetchStoryDossier(article = {}) {
  const params = new URLSearchParams();

  if (article?.title) params.set("title", article.title);
  if (article?.source) params.set("source", article.source);
  if (article?.category) params.set("category", article.category);
  if (article?.link || article?.url)
    params.set("url", article.link || article.url);

  const response = await fetch(`${DOSSIER_ENDPOINT}?${params.toString()}`);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error || "Unable to load story dossier.");
  }

  return payload;
}
