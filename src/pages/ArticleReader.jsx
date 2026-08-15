import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faBookmark,
  faShareNodes,
  faExternalLinkAlt,
  faCircleNotch,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";
import {
  isArticleSaved,
  saveArticle,
  unsaveArticle,
  recordHistory,
} from "../utils/savedArticles";
import { useConsent } from "../context/ConsentContext";
import { processImageUrl } from "../utils/imageUtils";
import {
  buildStoryHref,
  parseStoryArticleFromSearch,
} from "../utils/storyRouting";
import { fetchStoryDossier } from "../services/dossierService";
import { deriveMediaOutlet } from "../utils/sourceUtils";
import {
  getSourceProfile,
  getSourceProfileHref,
  getTrustDescriptorForProfile,
  PERSPECTIVE_METHODOLOGY,
} from "../utils/sourceProfiles";
import {
  findRegistryRecord,
  getSourceRegistry,
  mergeSourceProfileWithRegistry,
} from "../services/sourceRegistryService";
import "./ArticleReader.css";

const isGeneratedFallbackUrl = (value = "") =>
  String(value || "").includes("fallback.thelatest.local/generated/");

function readingTime(text = "") {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

function ArticleBody({ text }) {
  if (!text) return null;

  return (
    <div className="ar-body">
      {text.split(/\n\n+/).map((paragraph, index) => (
        <p key={index}>{paragraph.trim()}</p>
      ))}
    </div>
  );
}

function buildDossierQuery(article = {}) {
  const stopWords = new Set([
    "the",
    "and",
    "for",
    "with",
    "from",
    "that",
    "this",
    "what",
    "when",
    "where",
    "about",
    "after",
    "before",
    "amid",
    "over",
    "into",
    "under",
    "while",
    "their",
    "there",
    "have",
    "will",
    "would",
    "could",
    "should",
  ]);

  const title = String(article?.title || "")
    .split(/[:|–—]/)[0]
    .trim();

  const tokens = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !stopWords.has(token));

  return (
    tokens.slice(0, 7).join(" ") || String(article?.source || "news").trim()
  );
}

function getPerspectiveDescriptor(story = {}, fallbackProfile = null) {
  const explicitKey = String(story?.perspectiveKey || "")
    .trim()
    .toLowerCase();
  const explicitLabel = String(story?.perspectiveLabel || "").trim();
  const explicitMethod = String(story?.perspectiveMethod || "")
    .trim()
    .toLowerCase();
  const explicitConfidence = String(story?.perspectiveConfidence || "")
    .trim()
    .toLowerCase();

  if (explicitKey || explicitLabel || explicitMethod) {
    return {
      key: explicitKey || "unknown",
      label: explicitLabel || "Unclassified",
      method: explicitMethod || "unclassified",
      confidence: explicitConfidence || "low",
    };
  }

  if (
    fallbackProfile?.perspectiveKey &&
    fallbackProfile.perspectiveKey !== "unknown"
  ) {
    return {
      key: fallbackProfile.perspectiveKey,
      label: fallbackProfile.perspectiveLabel,
      method: "source-map",
      confidence: "medium",
    };
  }

  return {
    key: "unknown",
    label: "Unclassified",
    method: "unclassified",
    confidence: "low",
  };
}

function getPerspectiveMethodCopy(method = "") {
  const normalizedMethod = String(method || "")
    .trim()
    .toLowerCase();
  return (
    PERSPECTIVE_METHODOLOGY.find((item) => item.key === normalizedMethod) ||
    PERSPECTIVE_METHODOLOGY[2]
  );
}

function DossierStoryCard({
  item,
  meta,
  actionLabel = "Open dossier",
  onClick,
}) {
  return (
    <Link
      to={buildStoryHref(item)}
      state={{ article: item }}
      className="ar-dossier-card"
      onClick={onClick}
    >
      <div className="ar-dossier-card__source">{deriveMediaOutlet(item)}</div>
      <h3 className="ar-dossier-card__title">{item.title}</h3>
      {item.description ? (
        <p className="ar-dossier-card__body">{item.description}</p>
      ) : null}
      <div className="ar-dossier-card__footer">
        <span>{meta}</span>
        <span>{actionLabel} →</span>
      </div>
    </Link>
  );
}

export default function ArticleReader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { storySlug } = useParams();
  const { allowAnalytics } = useConsent();

  const [storedStory, setStoredStory] = useState(null);
  const [fetchState, setFetchState] = useState({
    url: "",
    data: null,
    error: null,
    status: "idle",
  });
  const [savedByKey, setSavedByKey] = useState({ key: "", value: false });
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [sourceRegistryRecord, setSourceRegistryRecord] = useState(null);
  const dossierSectionRefs = useRef({});
  const seenDossierSectionsRef = useRef(new Set());
  const [dossierState, setDossierState] = useState({
    status: "idle",
    query: "",
    coverage: [],
    clusters: [],
    opinions: [],
    videos: [],
    podcasts: [],
    social: [],
  });

  const derivedArticle = useMemo(() => {
    return (
      location.state?.article ||
      storedStory ||
      parseStoryArticleFromSearch({ search: location.search }) ||
      null
    );
  }, [location.search, location.state, storedStory]);

  useEffect(() => {
    if (!storySlug) {
      setStoredStory(null);
      return;
    }

    let ignore = false;

    fetch(
      `/.netlify/functions/storySnapshot?slug=${encodeURIComponent(storySlug)}`,
    )
      .then((response) =>
        response.json().then((body) => ({ ok: response.ok, body })),
      )
      .then(({ ok, body }) => {
        if (!ignore) {
          setStoredStory(ok && body?.story ? body.story : null);
        }
      })
      .catch(() => {
        if (!ignore) {
          setStoredStory(null);
        }
      });

    return () => {
      ignore = true;
    };
  }, [storySlug]);

  const article = derivedArticle;
  const articleKey = useMemo(
    () => (article ? buildStoryHref(article) : ""),
    [article],
  );

  const registerDossierSection = useCallback(
    (sectionKey) => (node) => {
      if (node) {
        dossierSectionRefs.current[sectionKey] = node;
        return;
      }

      delete dossierSectionRefs.current[sectionKey];
    },
    [],
  );

  useEffect(() => {
    seenDossierSectionsRef.current = new Set();
  }, [articleKey]);

  const trackEngagement = useCallback(
    (payload) => {
      if (!allowAnalytics) {
        return;
      }

      try {
        const body = JSON.stringify(payload);

        if (navigator.sendBeacon) {
          const blob = new Blob([body], { type: "application/json" });
          navigator.sendBeacon("/.netlify/functions/trackEngagement", blob);
          return;
        }

        fetch("/.netlify/functions/trackEngagement", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body,
          keepalive: true,
        }).catch(() => {});
      } catch {
        // Ignore analytics failures.
      }
    },
    [allowAnalytics],
  );

  useEffect(() => {
    if (!article) return;

    recordHistory(article);
    trackEngagement({
      eventType: "article-view",
      path: location.pathname,
      pageTitle: article.title,
      article,
    });
  }, [article, location.pathname, trackEngagement]);

  useEffect(() => {
    const generatedId = article?.generatedId;
    const url = article?.link || article?.url;
    if (!generatedId && !url) return;

    const controller = new AbortController();

    (async () => {
      try {
        if (generatedId) {
          const response = await fetch(
            `/.netlify/functions/generatedContent?id=${encodeURIComponent(generatedId)}`,
            { signal: controller.signal },
          );
          const data = await response.json();

          if (response.ok && !data.error) {
            setFetchState({
              url: generatedId,
              data,
              error: null,
              status: "ready",
            });
          } else {
            setFetchState({
              url: generatedId,
              data: null,
              error: data?.error || "Generated content unavailable",
              status: "error",
            });
          }
          return;
        }

        const endpoint = `/.netlify/functions/fetchArticle?url=${encodeURIComponent(url)}`;
        const response = await fetch(endpoint, { signal: controller.signal });
        const data = await response.json();

        if (!data.error) {
          setFetchState({ url, data, error: null, status: "ready" });
        } else {
          setFetchState({
            url,
            data: null,
            error: data.error,
            status: "error",
          });
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          setFetchState({
            url,
            data: null,
            error: error.message,
            status: "error",
          });
        }
      }
    })();

    return () => controller.abort();
  }, [article]);

  useEffect(() => {
    if (!article?.title) {
      setDossierState({
        status: "idle",
        query: "",
        coverage: [],
        clusters: [],
        opinions: [],
        videos: [],
        podcasts: [],
        social: [],
      });
      return;
    }

    let ignore = false;

    const loadDossier = async () => {
      const query = buildDossierQuery(article);

      setDossierState((current) => ({ ...current, status: "loading", query }));

      try {
        const dossier = await fetchStoryDossier(article);

        if (ignore) return;

        setDossierState({
          status: "ready",
          query: dossier?.query || query,
          coverage: Array.isArray(dossier?.coverage) ? dossier.coverage : [],
          clusters: Array.isArray(dossier?.clusters) ? dossier.clusters : [],
          opinions: Array.isArray(dossier?.opinions) ? dossier.opinions : [],
          videos: Array.isArray(dossier?.videos) ? dossier.videos : [],
          podcasts: Array.isArray(dossier?.podcasts) ? dossier.podcasts : [],
          social: Array.isArray(dossier?.social) ? dossier.social : [],
        });
      } catch {
        if (!ignore) {
          setDossierState({
            status: "error",
            query,
            coverage: [],
            clusters: [],
            opinions: [],
            videos: [],
            podcasts: [],
            social: [],
          });
        }
      }
    };

    loadDossier();

    return () => {
      ignore = true;
    };
  }, [article]);

  const dossierSections = useMemo(() => {
    const sections = [
      {
        key: "coverage",
        itemCount:
          dossierState.clusters.length > 0
            ? dossierState.clusters.length
            : dossierState.coverage.length,
      },
      { key: "opinions", itemCount: dossierState.opinions.length },
      { key: "videos", itemCount: dossierState.videos.length },
      { key: "podcasts", itemCount: dossierState.podcasts.length },
      { key: "social", itemCount: dossierState.social.length },
      { key: "trust", itemCount: 1 },
    ];

    return sections.filter((section) => section.itemCount > 0);
  }, [dossierState]);

  useEffect(() => {
    if (
      !article ||
      dossierSections.length === 0 ||
      typeof IntersectionObserver === "undefined"
    )
      return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const section =
            entry.target.getAttribute("data-dossier-section") || "";
          if (!section || seenDossierSectionsRef.current.has(section)) return;

          seenDossierSectionsRef.current.add(section);
          const itemCount = Number(
            entry.target.getAttribute("data-dossier-count") || 0,
          );

          trackEngagement({
            eventType: "dossier-section-view",
            path: location.pathname,
            pageTitle: article.title,
            article,
            section,
            itemCount,
            query: dossierState.query,
          });
        });
      },
      { threshold: 0.45 },
    );

    dossierSections.forEach(({ key }) => {
      const node = dossierSectionRefs.current[key];
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, [
    article,
    dossierSections,
    dossierState.query,
    location.pathname,
    trackEngagement,
  ]);

  const trackDossierInteraction = useCallback(
    (section, item = {}) => {
      if (!article) return;

      trackEngagement({
        eventType: "dossier-section-click",
        path: location.pathname,
        pageTitle: article.title,
        article,
        section,
        itemTitle: item?.title || item?.content || "",
        itemSource: item?.source || item?.platform || "",
        itemType: item?.contentKind || item?.type || section,
        query: dossierState.query,
      });
    },
    [article, dossierState.query, location.pathname, trackEngagement],
  );

  const rawSourceUrl = article?.link || article?.url || "";
  const effectiveFetchState = useMemo(() => {
    const generatedId = article?.generatedId;
    const isGeneratedArticle = Boolean(
      generatedId || isGeneratedFallbackUrl(rawSourceUrl),
    );
    const lookupKey = generatedId || (isGeneratedArticle ? "" : rawSourceUrl);

    if (!lookupKey) {
      return { url: "", data: null, error: null, status: "idle" };
    }

    if (fetchState.url === lookupKey) {
      return fetchState;
    }

    return { url: lookupKey, data: null, error: null, status: "loading" };
  }, [article?.generatedId, fetchState, rawSourceUrl]);

  const fetched =
    effectiveFetchState.status === "ready" ? effectiveFetchState.data : null;
  const isGeneratedArticle = Boolean(
    article?.generatedId ||
    fetched?.generatedId ||
    article?.isGenerated ||
    fetched?.isGenerated ||
    isGeneratedFallbackUrl(rawSourceUrl),
  );
  const sourceUrl = isGeneratedArticle ? "" : rawSourceUrl;
  const loading = effectiveFetchState.status === "loading";
  const fetchError =
    effectiveFetchState.status === "error" ? effectiveFetchState.error : null;
  const saved = article
    ? savedByKey.key === articleKey
      ? savedByKey.value
      : isArticleSaved(article)
    : false;
  const title = fetched?.title || article?.title || "Untitled";
  const byline = fetched?.byline || article?.author || article?.source || "";
  const siteName =
    fetched?.siteName || fetched?.source || article?.source || "";
  const heroImage =
    fetched?.image || article?.image || article?.urlToImage || "";
  const content =
    fetched?.content || article?.content || article?.description || "";
  const minutes = readingTime(content);
  const generatedNote = fetched?.fallbackLabel || article?.fallbackLabel || "";
  const pubDate =
    article?.publishedAt || article?.pubDate || article?.date || "";
  const dateStr = pubDate
    ? new Date(pubDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const shareUrl = useMemo(() => {
    if (
      typeof window !== "undefined" &&
      window.location?.pathname.startsWith("/story/")
    ) {
      return window.location.href;
    }

    if (!article) return sourceUrl;

    const storyHref = buildStoryHref(article);
    if (typeof window !== "undefined" && window.location?.origin) {
      return `${window.location.origin}${storyHref}`;
    }

    return storyHref || sourceUrl;
  }, [article, sourceUrl]);

  const baseSourceProfile = useMemo(
    () => getSourceProfile(article || siteName),
    [article, siteName],
  );

  useEffect(() => {
    if (!baseSourceProfile?.displayName) {
      setSourceRegistryRecord(null);
      return;
    }

    let ignore = false;

    getSourceRegistry()
      .then((records) => {
        if (!ignore) {
          setSourceRegistryRecord(
            findRegistryRecord(records, baseSourceProfile),
          );
        }
      })
      .catch(() => {
        if (!ignore) {
          setSourceRegistryRecord(null);
        }
      });

    return () => {
      ignore = true;
    };
  }, [baseSourceProfile]);

  const sourceProfile = useMemo(
    () =>
      mergeSourceProfileWithRegistry(baseSourceProfile, sourceRegistryRecord),
    [baseSourceProfile, sourceRegistryRecord],
  );
  const sourceTrust = useMemo(
    () => getTrustDescriptorForProfile(sourceProfile),
    [sourceProfile],
  );
  const perspectiveDescriptor = useMemo(
    () => getPerspectiveDescriptor(article, sourceProfile),
    [article, sourceProfile],
  );
  const methodologyCard = useMemo(
    () => getPerspectiveMethodCopy(perspectiveDescriptor.method),
    [perspectiveDescriptor.method],
  );

  const toggleSave = useCallback(() => {
    if (!article) return;

    if (saved) {
      unsaveArticle(article);
      setSavedByKey({ key: articleKey, value: false });
      return;
    }

    saveArticle(article);
    setSavedByKey({ key: articleKey, value: true });
  }, [article, articleKey, saved]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
        return;
      } catch {
        // Ignore cancelled shares.
      }
    }

    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shareUrl, title]);

  if (!article) {
    return (
      <div className="ar-not-found">
        <p>No article data found.</p>
        <button className="ar-back-btn" onClick={() => navigate(-1)}>
          <FontAwesomeIcon icon={faArrowLeft} /> Go back
        </button>
      </div>
    );
  }

  return (
    <div className="article-reader-page">
      <div className="ar-topbar">
        <button
          className="ar-back-btn"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Back</span>
        </button>

        <div className="ar-topbar-actions">
          <button
            className={`ar-icon-btn ${saved ? "active" : ""}`}
            onClick={toggleSave}
            title={saved ? "Remove bookmark" : "Save article"}
          >
            <FontAwesomeIcon icon={faBookmark} />
          </button>

          <button
            className="ar-icon-btn"
            onClick={handleShare}
            title="Share article"
          >
            <FontAwesomeIcon icon={faShareNodes} />
            {copied ? <span className="ar-copied-toast">Copied!</span> : null}
          </button>

          {sourceUrl ? (
            <a
              className="ar-icon-btn"
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="View original"
            >
              <FontAwesomeIcon icon={faExternalLinkAlt} />
            </a>
          ) : null}
        </div>
      </div>

      <div className="ar-viewport">
        {heroImage ? (
          <div className="ar-hero-image">
            <img
              src={processImageUrl(heroImage, { width: 1400, quality: 90 })}
              alt={title}
              onError={(event) => {
                event.target.style.display = "none";
              }}
            />
          </div>
        ) : null}

        <div className="ar-header">
          <div className="ar-source-bar">
            {siteName ? <div className="ar-site-name">{siteName}</div> : null}
            <Link
              className="ar-source-profile-link"
              to={getSourceProfileHref(article || siteName)}
            >
              Source profile →
            </Link>
          </div>

          <h1 className="ar-title">{title}</h1>

          {isGeneratedArticle ? (
            <p className="ar-generated-note">
              {generatedNote ||
                "AI-generated fallback briefing built for The Latest when live source coverage is temporarily sparse."}
            </p>
          ) : null}

          <div className="ar-meta">
            {byline ? <span className="ar-byline">{byline}</span> : null}
            {dateStr ? <span className="ar-date">{dateStr}</span> : null}
            <span className="ar-reading-time">{minutes} min read</span>
          </div>
        </div>

        <div className="ar-font-controls">
          <button onClick={() => setFontSize((size) => Math.max(14, size - 2))}>
            A−
          </button>
          <button onClick={() => setFontSize(18)}>A</button>
          <button onClick={() => setFontSize((size) => Math.min(28, size + 2))}>
            A+
          </button>
        </div>

        <div className="ar-reading-shell">
          <div className="ar-story-column">
            <div
              className="ar-content-area"
              style={{ fontSize: `${fontSize}px` }}
            >
              {loading ? (
                <div className="ar-loading">
                  <FontAwesomeIcon icon={faCircleNotch} spin />
                  <span>Loading full article…</span>
                </div>
              ) : null}

              {!loading && content ? <ArticleBody text={content} /> : null}

              {!loading && !content && !fetchError ? (
                <div className="ar-no-content">
                  <p>No article content available.</p>
                </div>
              ) : null}

              {!loading &&
              !isGeneratedArticle &&
              (fetchError || (!content && sourceUrl)) ? (
                <div className="ar-paywall-notice">
                  <FontAwesomeIcon icon={faExclamationTriangle} />
                  <p>
                    {fetchError
                      ? "This article could not be loaded on-site."
                      : "Full article content requires visiting the original source."}
                  </p>
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ar-visit-source-btn"
                  >
                    Read on {siteName || "original site"} →
                  </a>
                </div>
              ) : null}
            </div>

            <section
              className="ar-dossier-section"
              ref={registerDossierSection("coverage")}
              data-dossier-section="coverage"
              data-dossier-count={
                dossierState.clusters.length > 0
                  ? dossierState.clusters.length
                  : dossierState.coverage.length
              }
            >
              <div className="ar-section-heading">
                <span className="ar-section-kicker">Story dossier</span>
                <h2>How this story expands across the platform</h2>
                <p>
                  Built from clustered coverage, related search results, and
                  adjacent media formats using the query “
                  {dossierState.query || title}”.
                </p>
              </div>

              {dossierState.status === "loading" ? (
                <div className="ar-dossier-loading">
                  Loading related coverage…
                </div>
              ) : null}

              {dossierState.clusters.length > 0 ? (
                <div className="ar-cluster-grid">
                  {dossierState.clusters.map((cluster) => (
                    <article
                      key={cluster.id || cluster.topic}
                      className="ar-cluster-card"
                    >
                      <div className="ar-cluster-card__meta">
                        <span>{cluster.topic}</span>
                        <span>{cluster.sourceCount || 0} sources</span>
                      </div>
                      <div className="ar-cluster-card__list">
                        {(cluster.sources || [])
                          .slice(0, 3)
                          .map((story, index) => {
                            const sourcePerspective = getPerspectiveDescriptor(
                              story,
                              getSourceProfile(story),
                            );
                            return (
                              <Link
                                key={`${cluster.id || cluster.topic}-${story.url || story.title || index}`}
                                to={buildStoryHref(story)}
                                state={{ article: story }}
                                className="ar-cluster-link"
                                onClick={() =>
                                  trackDossierInteraction("coverage", story)
                                }
                              >
                                <span
                                  className={`ar-perspective-pill ar-perspective-pill--${sourcePerspective.key}`}
                                >
                                  {sourcePerspective.label}
                                </span>
                                <span className="ar-cluster-link__source">
                                  {deriveMediaOutlet(story)}
                                </span>
                                <span className="ar-cluster-link__title">
                                  {story.title}
                                </span>
                              </Link>
                            );
                          })}
                      </div>
                    </article>
                  ))}
                </div>
              ) : dossierState.coverage.length > 0 ? (
                <div className="ar-card-grid ar-card-grid--coverage">
                  {dossierState.coverage.map((item) => (
                    <DossierStoryCard
                      key={item.url || item.title}
                      item={item}
                      meta={deriveMediaOutlet(item)}
                      actionLabel="Open coverage"
                      onClick={() => trackDossierInteraction("coverage", item)}
                    />
                  ))}
                </div>
              ) : dossierState.status === "ready" ? (
                <div className="ar-dossier-empty">
                  No adjacent coverage cluster was available for this story yet.
                </div>
              ) : null}
            </section>

            {dossierState.opinions.length > 0 ? (
              <section
                className="ar-dossier-section"
                ref={registerDossierSection("opinions")}
                data-dossier-section="opinions"
                data-dossier-count={dossierState.opinions.length}
              >
                <div className="ar-section-heading">
                  <span className="ar-section-kicker">Opinions</span>
                  <h2>Interpretation and argument around the story</h2>
                </div>
                <div className="ar-card-grid">
                  {dossierState.opinions.map((item) => (
                    <DossierStoryCard
                      key={item.url || item.title}
                      item={item}
                      meta={item.author || deriveMediaOutlet(item)}
                      actionLabel="Read take"
                      onClick={() => trackDossierInteraction("opinions", item)}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {dossierState.videos.length > 0 ? (
              <section
                className="ar-dossier-section"
                ref={registerDossierSection("videos")}
                data-dossier-section="videos"
                data-dossier-count={dossierState.videos.length}
              >
                <div className="ar-section-heading">
                  <span className="ar-section-kicker">Video</span>
                  <h2>Visual explainers and clips</h2>
                </div>
                <div className="ar-card-grid">
                  {dossierState.videos.map((item) => (
                    <DossierStoryCard
                      key={item.url || item.title}
                      item={item}
                      meta={item.duration || deriveMediaOutlet(item)}
                      actionLabel="Watch context"
                      onClick={() => trackDossierInteraction("videos", item)}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {dossierState.podcasts.length > 0 ? (
              <section
                className="ar-dossier-section"
                ref={registerDossierSection("podcasts")}
                data-dossier-section="podcasts"
                data-dossier-count={dossierState.podcasts.length}
              >
                <div className="ar-section-heading">
                  <span className="ar-section-kicker">Podcasts</span>
                  <h2>Audio and long-form discussion</h2>
                </div>
                <div className="ar-card-grid">
                  {dossierState.podcasts.map((item) => (
                    <DossierStoryCard
                      key={item.url || item.title}
                      item={item}
                      meta={item.hosts || deriveMediaOutlet(item)}
                      actionLabel="Listen next"
                      onClick={() => trackDossierInteraction("podcasts", item)}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {dossierState.social.length > 0 ? (
              <section
                className="ar-dossier-section"
                ref={registerDossierSection("social")}
                data-dossier-section="social"
                data-dossier-count={dossierState.social.length}
              >
                <div className="ar-section-heading">
                  <span className="ar-section-kicker">Social context</span>
                  <h2>Related conversation and reaction</h2>
                </div>
                <div className="ar-card-grid">
                  {dossierState.social.map((post) => (
                    <a
                      key={post.url || `${post.platform}-${post.author}`}
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ar-dossier-card"
                      onClick={() => trackDossierInteraction("social", post)}
                    >
                      <div className="ar-dossier-card__source">
                        {post.platform} · {post.author}
                      </div>
                      <h3 className="ar-dossier-card__title">
                        {post.title || post.content}
                      </h3>
                      {post.content ? (
                        <p className="ar-dossier-card__body">{post.content}</p>
                      ) : null}
                      <div className="ar-dossier-card__footer">
                        <span>{post.engagement || "Live social context"}</span>
                        <span>Open post →</span>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            ) : null}

            {sourceUrl && !isGeneratedArticle ? (
              <div className="ar-attribution">
                <span>Originally published by</span>
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                  {siteName || sourceUrl}
                </a>
              </div>
            ) : null}
          </div>

          <aside className="ar-trust-rail">
            <section
              className="ar-trust-card"
              ref={registerDossierSection("trust")}
              data-dossier-section="trust"
              data-dossier-count={1}
            >
              <div className="ar-trust-card__kicker">Source profile</div>
              <h2>{sourceProfile.displayName}</h2>
              <p>{sourceProfile.description}</p>
              <div className="ar-trust-badges">
                <span
                  className={`ar-perspective-pill ar-perspective-pill--${sourceProfile.perspectiveKey}`}
                  title={sourceProfile.methodologyNote}
                >
                  {sourceProfile.perspectiveLabel}
                </span>
                <span
                  className={`ar-truth-score-pill ar-truth-score-pill--${sourceTrust.band}`}
                  title={sourceTrust.rationale}
                >
                  {sourceTrust.shortLabel}
                </span>
                <span className="ar-trust-badge">
                  {sourceProfile.factualityLabel}
                </span>
                <span className="ar-trust-badge">
                  {sourceProfile.ownershipType}
                </span>
              </div>
              <dl className="ar-trust-list">
                <div>
                  <dt>Owner</dt>
                  <dd>{sourceProfile.ownershipName}</dd>
                </div>
                <div>
                  <dt>Ownership</dt>
                  <dd>{sourceProfile.ownershipSummary}</dd>
                </div>
                <div>
                  <dt>Funding</dt>
                  <dd>{sourceProfile.fundingModel}</dd>
                </div>
                <div>
                  <dt>Base</dt>
                  <dd>{sourceProfile.country}</dd>
                </div>
                {sourceProfile.registryNotes ? (
                  <div>
                    <dt>Registry note</dt>
                    <dd>{sourceProfile.registryNotes}</dd>
                  </div>
                ) : null}
              </dl>
              <Link
                to={sourceProfile.href}
                className="ar-source-profile-cta"
                onClick={() =>
                  trackDossierInteraction("trust", {
                    title: sourceProfile.displayName,
                    source: sourceProfile.displayName,
                    contentKind: "source-profile",
                  })
                }
              >
                Open full source profile →
              </Link>
            </section>

            <section className="ar-trust-card">
              <div className="ar-trust-card__kicker">
                Perspective methodology
              </div>
              <h2>{perspectiveDescriptor.label}</h2>
              <p>{methodologyCard.body}</p>
              <div className="ar-trust-badges">
                <span className="ar-trust-badge">
                  Method: {methodologyCard.title}
                </span>
                <span className="ar-trust-badge">
                  Confidence: {perspectiveDescriptor.confidence || "low"}
                </span>
              </div>
              <div className="ar-methodology-list">
                {PERSPECTIVE_METHODOLOGY.map((item) => (
                  <article key={item.key} className="ar-methodology-item">
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="ar-trust-card">
              <div className="ar-trust-card__kicker">Why this matters</div>
              <p>
                The trust layer is designed to answer three questions quickly:
                who produced the reporting, what incentives shape the outlet,
                and how that source usually frames coverage relative to peers.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
