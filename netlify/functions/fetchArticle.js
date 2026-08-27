/**
 * fetchArticle — Netlify Function
 *
 * Proxies a news article URL through the server to avoid CORS restrictions,
 * then extracts a short excerpt (not the full article) so the client can
 * show a snippet in the on-site reader alongside a prominent link back to
 * the original source. We never reproduce the full article body: aggregation
 * is only defensible as "credit the source, show a small snippet, link out
 * for the rest" — not as a full-text mirror.
 *
 * Query params:
 *   ?url=<encoded article URL>
 *
 * Returns JSON:
 *   { title, byline, excerpt, isExcerpt, image, siteName, url, error? }
 */

const https = require("https");
const http = require("http");
const { URL } = require("url");

// ── Lightweight HTML content extractor ────────────────────────────────────────
// No heavy dependencies (no jsdom/cheerio) — just regex-based extraction
// targeting the patterns most news sites use.

function extractMeta(html, property) {
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1].trim();
  }
  return "";
}

function extractPageTitle(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].replace(/\s*[|\-–—].*$/, "").trim() : "";
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<figure[\s\S]*?<\/figure>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Caps how much of a source article we'll ever show. This is deliberately a
// "snippet" length (a couple of sentences), not enough to substitute for
// reading the original — see the file header comment for why.
const EXCERPT_MAX_CHARS = 420;

function buildExcerpt(fullText = "", maxChars = EXCERPT_MAX_CHARS) {
  const text = String(fullText || "").trim();
  if (!text) return "";
  if (text.length <= maxChars) return text;

  // Prefer cutting at a sentence boundary near the limit so the snippet
  // reads naturally instead of stopping mid-sentence.
  const searchZone = text.slice(0, maxChars + 80);
  const lastSentenceEnd = Math.max(
    searchZone.lastIndexOf(". "),
    searchZone.lastIndexOf("! "),
    searchZone.lastIndexOf("? "),
  );

  if (lastSentenceEnd > maxChars * 0.4) {
    return text.slice(0, lastSentenceEnd + 1).trim();
  }

  const lastSpace = text.slice(0, maxChars).lastIndexOf(" ");
  const cut = lastSpace > 0 ? lastSpace : maxChars;
  return `${text.slice(0, cut).trim()}…`;
}

function extractMainContent(html) {
  // Priority content containers used by major news sites:
  const selectors = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]+class="[^"]*article[-_]?body[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+class="[^"]*story[-_]?body[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+class="[^"]*post[-_]?content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+class="[^"]*entry[-_]?content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+itemprop="articleBody"[^>]*>([\s\S]*?)<\/div>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
  ];

  for (const re of selectors) {
    const m = html.match(re);
    if (m && m[1].length > 200) {
      const text = stripTags(m[1]);
      if (text.length > 100) return buildExcerpt(text);
    }
  }

  // Fallback: strip everything and excerpt what's left
  return buildExcerpt(stripTags(html).slice(0, 3000));
}

// ── HTTP fetch helper (no axios — keep Lambda bundle tiny) ────────────────────

function fetchUrl(urlStr, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error("Too many redirects"));

    let parsed;
    try {
      parsed = new URL(urlStr);
    } catch (e) {
      return reject(e);
    }

    const lib = parsed.protocol === "https:" ? https : http;
    const siteUrl = String(
      process.env.VITE_SITE_URL || "https://thelatest.com",
    ).replace(/\/$/, "");
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: "GET",
      headers: {
        "User-Agent": `Mozilla/5.0 (compatible; TheLatestBot/1.0; +${siteUrl})`,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      timeout: 8000,
    };

    const req = lib.request(options, (res) => {
      // Follow redirects
      if (
        [301, 302, 303, 307, 308].includes(res.statusCode) &&
        res.headers.location
      ) {
        return resolve(fetchUrl(res.headers.location, redirectCount + 1));
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }

      const chunks = [];
      res.on("data", (chunk) => {
        chunks.push(chunk);
        // Limit to 2 MB
        if (chunks.reduce((s, c) => s + c.length, 0) > 2 * 1024 * 1024)
          req.destroy();
      });
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      res.on("error", reject);
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });
    req.end();
  });
}

// ── Handler ────────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=3600",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  const rawUrl = event.queryStringParameters?.url;
  if (!rawUrl) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Missing ?url param" }),
    };
  }

  let articleUrl;
  try {
    articleUrl = decodeURIComponent(rawUrl);
    new URL(articleUrl); // validate
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid URL" }),
    };
  }

  try {
    const html = await fetchUrl(articleUrl);

    // Extract metadata
    const title = extractMeta(html, "og:title") || extractPageTitle(html);
    const image =
      extractMeta(html, "og:image") || extractMeta(html, "twitter:image");
    const byline =
      extractMeta(html, "author") || extractMeta(html, "article:author");
    const siteName = extractMeta(html, "og:site_name");
    const excerpt = extractMainContent(html);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        title,
        byline,
        excerpt,
        isExcerpt: true,
        image,
        siteName,
        url: articleUrl,
      }),
    };
  } catch (err) {
    // Return a partial result so the reader can still show data from the feed
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ error: err.message, url: articleUrl }),
    };
  }
};
