import { useState, useEffect, useRef, useCallback } from "react";
import { useSearch } from "../context/SearchContext";
import { useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import AdBreak from "../components/common/AdBreak";
import { fetchTrendingContent } from "../newsService";
import { searchRSSContent, fetchRSSPodcasts } from "../rssService";
import { getImageProps } from "../utils/imageUtils";
import { getCategoryConfig } from "../utils/categoryConfig";
import { filterContentByCategory } from "../utils/categoryFiltering";
import { deriveMediaOutlet } from "../utils/sourceUtils";
import { matchesTopicQuery } from "../utils/topicFiltering";
import { getTopicPageConfig } from "../utils/navigationConfig";
import {
  isVideoItem,
  isPodcastItem,
  dedupeByMediaKey,
  removeCrossDuplicates,
} from "../utils/mediaClassification";
import { formatDateOnly, resolvePublishedTimestamp } from "../utils/dateUtils";
import { resolveContentHref } from "../utils/storyRouting";
import { getGeneratedContentLabel } from "../utils/contentLabels";
import {
  getSourceProfile,
  getTrustDescriptorForProfile,
} from "../utils/sourceProfiles";
import PageBackBar from "../components/common/PageBackBar";
import "./AllNewsPage.css";

function toTextValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value))
    return value.map(toTextValue).filter(Boolean).join(", ");
  if (typeof value === "object" && typeof value._ === "string") return value._;
  return "";
}

const PERSPECTIVE_METHOD_LABELS = {
  "ai-headline": "AI estimate from headline and summary framing",
  "source-map": "Source map estimate from outlet profile",
  unclassified: "Perspective not classified with enough confidence",
};

function resolveStoryPerspective(article = {}, fallbackProfile = null) {
  const explicitKey = String(article?.perspectiveKey || "")
    .trim()
    .toLowerCase();
  if (explicitKey && explicitKey !== "unknown") {
    return {
      key: explicitKey,
      label: String(article?.perspectiveLabel || "Unclassified").trim(),
      method: String(article?.perspectiveMethod || "source-map")
        .trim()
        .toLowerCase(),
    };
  }

  const profile = fallbackProfile || getSourceProfile(article);
  if (profile?.perspectiveKey && profile.perspectiveKey !== "unknown") {
    return {
      key: profile.perspectiveKey,
      label: profile.perspectiveLabel,
      method: "source-map",
    };
  }

  return null;
}

function enrichPodcastItem(item) {
  const sourceProfile = getSourceProfile(item);
  return {
    ...item,
    sourceProfile,
    sourceDisplayName:
      sourceProfile?.displayName || item?.source || "Podcast Desk",
    sourceFilterLabel:
      sourceProfile?.displayName || item?.source || "Podcast Desk",
    trust: getTrustDescriptorForProfile(sourceProfile),
    perspective: resolveStoryPerspective(item, sourceProfile),
  };
}

function AllPodcastsPage({ category = null }) {
  const { categoryName, topicSlug } = useParams();
  const { topic, hasActiveTopic } = useSearch();
  const [podcasts, setPodcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState("ALL");
  const [visibleCount, setVisibleCount] = useState(8);
  const LOAD_MORE_SIZE = 8;
  const sourceTickerRef = useRef(null);

  const truncateText = (text, maxLength) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength).trim()}...`;
  };

  const topicConfig = getTopicPageConfig(topicSlug);
  const activeTopicQuery =
    topicConfig?.query || (hasActiveTopic ? topic : null);
  const filterContext =
    categoryName || category || topicConfig?.slug || activeTopicQuery;
  const categoryConfig = topicConfig
    ? {
        title: topicConfig.title,
        newsTitle: `${topicConfig.title} Podcasts`,
        subtitle: topicConfig.subtitle,
        image: topicConfig.image,
      }
    : getCategoryConfig(filterContext);

  const loadPodcasts = useCallback(async () => {
    setLoading(true);
    try {
      const normalizePodcastItem = (item) => ({
        ...item,
        title: toTextValue(item?.title),
        description: toTextValue(item?.description),
        type: toTextValue(item?.type),
        source:
          deriveMediaOutlet({
            source: toTextValue(item?.source),
            url: toTextValue(item?.link || item?.url),
          }) || "Podcast Desk",
        hosts: toTextValue(item?.hosts),
        category: toTextValue(item?.category),
        publishedAt: resolvePublishedTimestamp(item),
        link: toTextValue(item?.link || item?.url),
        image: toTextValue(item?.thumbnail) || toTextValue(item?.image),
      });

      if (activeTopicQuery && activeTopicQuery.trim().length > 0) {
        const searchResults = await searchRSSContent(activeTopicQuery);
        const normalizedResults = (
          Array.isArray(searchResults) ? searchResults : []
        ).map(normalizePodcastItem);
        const searchPodcasts = normalizedResults.filter(isPodcastItem);
        const searchVideos = normalizedResults.filter(isVideoItem);
        let topicPodcasts = dedupeByMediaKey(
          removeCrossDuplicates(searchPodcasts, searchVideos),
        );

        const MIN_TOPIC_PODCASTS = 20;
        if (topicPodcasts.length < MIN_TOPIC_PODCASTS) {
          const podcastPool = await fetchRSSPodcasts();
          const supplemental = (Array.isArray(podcastPool) ? podcastPool : [])
            .map(normalizePodcastItem)
            .filter(isPodcastItem)
            .filter((item) => matchesTopicQuery(item, activeTopicQuery));
          topicPodcasts = dedupeByMediaKey([...topicPodcasts, ...supplemental]);
        }

        if (topicPodcasts.length < MIN_TOPIC_PODCASTS) {
          const generatedFallback = await fetchTrendingContent(
            null,
            activeTopicQuery,
          );
          topicPodcasts = dedupeByMediaKey([
            ...topicPodcasts,
            ...(Array.isArray(generatedFallback) ? generatedFallback : []).map(
              normalizePodcastItem,
            ),
          ]);
        }

        setPodcasts(dedupeByMediaKey(topicPodcasts).map(enrichPodcastItem));
      } else {
        const podcastsData = await fetchTrendingContent(filterContext);
        const normalizedPodcasts = (
          Array.isArray(podcastsData) ? podcastsData : []
        )
          .map(normalizePodcastItem)
          .filter(isPodcastItem);

        let filtered = normalizedPodcasts;
        if (filterContext) {
          filtered = filterContentByCategory(
            normalizedPodcasts,
            filterContext,
            1,
            { strict: true },
          );
        }

        setPodcasts(dedupeByMediaKey(filtered).map(enrichPodcastItem));
      }
    } catch (error) {
      console.error("Error loading podcasts:", error);
      setPodcasts([]);
    } finally {
      setLoading(false);
    }
  }, [activeTopicQuery, filterContext]);

  useEffect(() => {
    loadPodcasts();
  }, [loadPodcasts]);

  useEffect(() => {
    if (
      selectedSource !== "ALL" &&
      !podcasts.some((item) => item.sourceFilterLabel === selectedSource)
    ) {
      setSelectedSource("ALL");
    }
  }, [podcasts, selectedSource]);

  const sourceCounts = podcasts.reduce((accumulator, item) => {
    const key = item.sourceFilterLabel;
    if (!key) return accumulator;
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
  const sourceEntries = Object.entries(sourceCounts).sort((left, right) => {
    if (right[1] !== left[1]) return right[1] - left[1];
    return left[0].localeCompare(right[0]);
  });
  const filteredPodcasts =
    selectedSource === "ALL"
      ? podcasts
      : podcasts.filter((item) => item.sourceFilterLabel === selectedSource);

  const handleSourceClick = (source) => {
    setSelectedSource(source);
    setVisibleCount(8);
  };

  const scrollTickerLeft = () => {
    sourceTickerRef.current?.scrollBy({ left: -240, behavior: "smooth" });
  };

  const scrollTickerRight = () => {
    sourceTickerRef.current?.scrollBy({ left: 240, behavior: "smooth" });
  };

  const leadStory = filteredPodcasts[0];
  const leadStoryHref = leadStory ? resolveContentHref(leadStory) : "";
  const featuredStories = filteredPodcasts.slice(1, 4);
  const latestStoriesAll = filteredPodcasts.slice(4);
  const latestStories = latestStoriesAll.slice(0, visibleCount);
  const hasMore = visibleCount < latestStoriesAll.length;
  const remaining = latestStoriesAll.length - visibleCount;
  const quickUpdates = filteredPodcasts.slice(0, 8);
  const topicRoute = topicSlug ? `/topic/${topicSlug}` : "";
  const categoryRoute =
    categoryName || category ? `/category/${categoryName || category}` : "";
  const fallbackTo = topicRoute || categoryRoute || "/podcasts";
  const breadcrumbs = [
    { label: "Home", to: "/" },
    topicRoute
      ? { label: categoryConfig.title, to: topicRoute }
      : categoryRoute
        ? { label: categoryConfig.title, to: categoryRoute }
        : { label: "Podcasts", to: "/podcasts" },
    { label: "All Podcasts" },
  ];

  return (
    <div className="all-news-page">
      <PageBackBar
        shellClassName="all-news-hero-inner"
        fallbackTo={fallbackTo}
        breadcrumbs={breadcrumbs}
        meta={`${filteredPodcasts.length} episodes in this feed`}
      />

      <div className="all-news-hero">
        <div className="all-news-hero-inner">
          <h1 className="all-news-title">
            Top {categoryConfig.title} Podcasts
          </h1>
          <p className="all-news-subtitle">Select Source(s)</p>
          <div className="all-news-hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-value">{filteredPodcasts.length}</span>
              <span className="hero-stat-label">Episodes</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-value">{sourceEntries.length}</span>
              <span className="hero-stat-label">Shows</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-value">
                {selectedSource === "ALL" ? "All" : selectedSource}
              </span>
              <span className="hero-stat-label">Feed</span>
            </div>
          </div>
        </div>
      </div>

      <div className="source-filter-container">
        <div className="source-filter-header">
          <h2 className="source-filter-title">Show / Host Ticker</h2>
          <span className="source-filter-count">
            {selectedSource === "ALL"
              ? `${sourceEntries.length} source families active across ${podcasts.length} episodes`
              : `${filteredPodcasts.length} episodes from ${selectedSource}`}
          </span>
        </div>
        <div className="source-ticker-row">
          <button
            className="slider-btn ticker-btn"
            onClick={scrollTickerLeft}
            aria-label="Scroll sources left"
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <div className="source-pills" ref={sourceTickerRef}>
            <button
              className={`source-pill ${selectedSource === "ALL" ? "active" : ""}`}
              onClick={() => handleSourceClick("ALL")}
            >
              All sources
              <span className="source-pill-count">{podcasts.length}</span>
            </button>
            {sourceEntries.map(([source, count]) => (
              <button
                key={source}
                className={`source-pill ${selectedSource === source ? "active" : ""}`}
                onClick={() => handleSourceClick(source)}
                title={`${count} episode${count === 1 ? "" : "s"} from ${source}`}
              >
                {source}
                <span className="source-pill-count">{count}</span>
              </button>
            ))}
          </div>
          <button
            className="slider-btn ticker-btn"
            onClick={scrollTickerRight}
            aria-label="Scroll sources right"
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>
      </div>

      <div className="all-news-content">
        {loading ? (
          <div className="loading-state">Loading podcasts...</div>
        ) : filteredPodcasts.length === 0 ? (
          <div className="no-results">
            <p>
              No podcasts found{filterContext ? ` for "${filterContext}"` : ""}.
            </p>
          </div>
        ) : (
          <>
            <section className="all-news-top-grid">
              {leadStory && (
                <article className="lead-story-card">
                  {leadStory.image && (
                    <a
                      href={leadStoryHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="lead-story-image"
                    >
                      <img
                        {...getImageProps(
                          leadStory.image,
                          leadStory.title,
                          "podcasts",
                        )}
                      />
                    </a>
                  )}
                  <div className="lead-story-content">
                    <div className="news-card-meta lead-story-meta">
                      <span className="news-card-source">
                        {leadStory.category ||
                          leadStory.hosts ||
                          leadStory.sourceDisplayName}
                      </span>
                      {getGeneratedContentLabel(leadStory) && (
                        <span className="news-card-time">
                          {getGeneratedContentLabel(leadStory)}
                        </span>
                      )}
                      {leadStory.publishedAt && (
                        <span className="news-card-time">
                          {formatDateOnly(leadStory.publishedAt)}
                        </span>
                      )}
                    </div>
                    <div className="story-context-row">
                      <span className="story-context-source">
                        {leadStory.sourceDisplayName}
                      </span>
                      {leadStory.perspective ? (
                        <span
                          className={`story-perspective-pill story-perspective-pill--${leadStory.perspective.key}`}
                          title={
                            PERSPECTIVE_METHOD_LABELS[
                              leadStory.perspective.method
                            ] || PERSPECTIVE_METHOD_LABELS["source-map"]
                          }
                        >
                          {leadStory.perspective.label}
                        </span>
                      ) : null}
                      <span
                        className={`story-trust-pill story-trust-pill--${leadStory.trust.band}`}
                        title={leadStory.trust.rationale}
                      >
                        {leadStory.trust.shortLabel}
                      </span>
                    </div>
                    <a
                      href={leadStoryHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="lead-story-headline-link"
                    >
                      <h2 className="lead-story-headline">{leadStory.title}</h2>
                    </a>
                    <p className="lead-story-description">
                      {truncateText(leadStory.description || "", 260)}
                    </p>
                    <div className="lead-story-footer">
                      <span className="lead-story-source">
                        {leadStory.hosts || leadStory.source}
                      </span>
                      <a
                        href={leadStoryHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="read-more-link"
                      >
                        Listen now →
                      </a>
                    </div>
                  </div>
                </article>
              )}

              <aside className="all-news-ad-panel" aria-label="Advertisement">
                <AdBreak
                  slot="article-sidebar"
                  campaignIndex={3}
                  variationKey="all-podcasts-top"
                />
              </aside>
            </section>

            {featuredStories.length > 0 && (
              <section className="secondary-stories-grid">
                {featuredStories.map((item, index) => (
                  <article
                    key={`${item.link || item.title}-${index}`}
                    className="secondary-story-card"
                  >
                    {item.image && (
                      <a
                        href={resolveContentHref(item)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="secondary-story-image"
                      >
                        <img
                          {...getImageProps(item.image, item.title, "podcasts")}
                        />
                      </a>
                    )}
                    <div className="secondary-story-content">
                      <div className="news-card-meta">
                        <span className="news-card-source">
                          {item.hosts || item.sourceDisplayName}
                        </span>
                        {getGeneratedContentLabel(item) && (
                          <span className="news-card-time">
                            {getGeneratedContentLabel(item)}
                          </span>
                        )}
                        {item.publishedAt && (
                          <span className="news-card-time">
                            {formatDateOnly(item.publishedAt)}
                          </span>
                        )}
                      </div>
                      <div className="story-context-row">
                        <span className="story-context-source">
                          {item.sourceDisplayName}
                        </span>
                        {item.perspective ? (
                          <span
                            className={`story-perspective-pill story-perspective-pill--${item.perspective.key}`}
                            title={
                              PERSPECTIVE_METHOD_LABELS[
                                item.perspective.method
                              ] || PERSPECTIVE_METHOD_LABELS["source-map"]
                            }
                          >
                            {item.perspective.label}
                          </span>
                        ) : null}
                        <span
                          className={`story-trust-pill story-trust-pill--${item.trust.band}`}
                          title={item.trust.rationale}
                        >
                          {item.trust.shortLabel}
                        </span>
                      </div>
                      <a
                        href={resolveContentHref(item)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="secondary-story-link"
                      >
                        <h3 className="secondary-story-headline">
                          {item.title}
                        </h3>
                      </a>
                    </div>
                  </article>
                ))}
              </section>
            )}

            <section className="latest-news-layout">
              <div className="latest-news-column">
                <div className="panel-header latest-news-header">
                  <span className="panel-kicker">Live Audio</span>
                  <h2 className="panel-title">Latest Podcasts</h2>
                </div>

                <div className="latest-news-list">
                  {(latestStories.length > 0
                    ? latestStories
                    : filteredPodcasts.slice(1)
                  ).map((item, index) => {
                    const isLast =
                      index === latestStories.length - 1 && hasMore;
                    const href = resolveContentHref(item);
                    return (
                      <article
                        key={`${item.link || item.title}-${index}`}
                        className={`latest-story-card${isLast ? " latest-story-card--fade" : ""}`}
                      >
                        {item.image && (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="latest-story-image"
                          >
                            <img
                              {...getImageProps(
                                item.image,
                                item.title,
                                "podcasts",
                              )}
                            />
                          </a>
                        )}
                        <div className="latest-story-content">
                          <div className="news-card-meta">
                            <span className="news-card-source">
                              {item.category ||
                                item.hosts ||
                                item.sourceDisplayName}
                            </span>
                            {getGeneratedContentLabel(item) && (
                              <span className="news-card-time">
                                {getGeneratedContentLabel(item)}
                              </span>
                            )}
                            {item.publishedAt && (
                              <span className="news-card-time">
                                {formatDateOnly(item.publishedAt)}
                              </span>
                            )}
                          </div>
                          <div className="story-context-row">
                            <span className="story-context-source">
                              {item.sourceDisplayName}
                            </span>
                            {item.perspective ? (
                              <span
                                className={`story-perspective-pill story-perspective-pill--${item.perspective.key}`}
                                title={
                                  PERSPECTIVE_METHOD_LABELS[
                                    item.perspective.method
                                  ] || PERSPECTIVE_METHOD_LABELS["source-map"]
                                }
                              >
                                {item.perspective.label}
                              </span>
                            ) : null}
                            <span
                              className={`story-trust-pill story-trust-pill--${item.trust.band}`}
                              title={item.trust.rationale}
                            >
                              {item.trust.shortLabel}
                            </span>
                          </div>
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="latest-story-link"
                          >
                            <h3 className="latest-story-headline">
                              {item.title}
                            </h3>
                          </a>
                          {item.description && (
                            <p className="latest-story-description">
                              {truncateText(item.description, 180)}
                            </p>
                          )}
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="read-more-link"
                          >
                            Listen now →
                          </a>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {hasMore && (
                  <div className="load-more-container">
                    <button
                      className="load-more-btn"
                      onClick={() => setVisibleCount((c) => c + LOAD_MORE_SIZE)}
                    >
                      Show {Math.min(remaining, LOAD_MORE_SIZE)} more
                      <span className="load-more-total">
                        ({remaining} remaining)
                      </span>
                    </button>
                  </div>
                )}
              </div>

              <aside className="quick-updates-panel">
                <div className="panel-header">
                  <span className="panel-kicker">Audio Wire</span>
                  <h2 className="panel-title">Quick Picks</h2>
                </div>

                <div className="quick-updates-list">
                  {quickUpdates.map((item, index) => (
                    <a
                      key={`${item.link || item.title}-quick-${index}`}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="quick-update-item"
                    >
                      <span className="quick-update-source">
                        {item.hosts || item.sourceDisplayName}
                      </span>
                      <div className="quick-update-context">
                        {item.perspective ? (
                          <span
                            className={`story-perspective-pill story-perspective-pill--${item.perspective.key}`}
                            title={
                              PERSPECTIVE_METHOD_LABELS[
                                item.perspective.method
                              ] || PERSPECTIVE_METHOD_LABELS["source-map"]
                            }
                          >
                            {item.perspective.label}
                          </span>
                        ) : null}
                        <span
                          className={`story-trust-pill story-trust-pill--${item.trust.band}`}
                          title={item.trust.rationale}
                        >
                          {item.trust.shortLabel}
                        </span>
                      </div>
                      <h3 className="quick-update-headline">
                        {truncateText(item.title, 88)}
                      </h3>
                      {item.publishedAt && (
                        <span className="quick-update-time">
                          {formatDateOnly(item.publishedAt)}
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              </aside>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default AllPodcastsPage;
