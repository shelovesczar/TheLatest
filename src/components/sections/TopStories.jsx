import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getImageProps } from "../../utils/imageUtils";
import { recordHistory } from "../../utils/savedArticles";
import { buildStoryHref } from "../../utils/storyRouting";
import { getGeneratedContentLabel } from "../../utils/contentLabels";
import {
  getSourceProfile,
  getSourceProfileHref,
  getTrustDescriptorForProfile,
} from "../../utils/sourceProfiles";
import { deriveMediaOutlet } from "../../utils/sourceUtils";
import { formatPublishedDate } from "../../utils/dateUtils";
import { useConsent } from "../../context/ConsentContext";
import {
  findRegistryRecord,
  getSourceRegistry,
  mergeSourceProfileWithRegistry,
} from "../../services/sourceRegistryService";
import "./TopStories.css";

const PERSPECTIVE_MAP = [
  {
    key: "left",
    label: "Left-Center",
    sourceStyle: { background: "#dbeafe", color: "#1e40af" },
  },
  {
    key: "center",
    label: "Center",
    sourceStyle: { background: "#d1fae5", color: "#065f46" },
  },
  {
    key: "right",
    label: "Right-Center",
    sourceStyle: { background: "#fef3c7", color: "#92400e" },
  },
  {
    key: "unknown",
    label: "Unclassified",
    sourceStyle: { background: "#e5e7eb", color: "#374151" },
  },
];

const PERSPECTIVE_LOOKUP = Object.fromEntries(
  PERSPECTIVE_MAP.map((item) => [item.key, item]),
);
const PERSPECTIVE_METHOD_LABELS = {
  "ai-headline": "AI estimate",
  "source-map": "Source map",
  unclassified: "Needs review",
};

const MIN_PERSPECTIVE_CLUSTER_SOURCES = 2;

function TopStories({
  loading,
  topStories,
  activeStory,
  setActiveStory,
  sideBySideClusters = [],
  categoryTitle,
  categoryPath,
  defaultPerspectiveView = false,
  showPerspectiveToggle = true,
  sectionTitle,
  seeMoreLabel,
  sideBySideTitle,
}) {
  const navigate = useNavigate();
  const { consent } = useConsent();
  const [sourceRegistryRecords, setSourceRegistryRecords] = useState([]);
  const comparisonViewRef = useRef(null);
  const trackedComparisonRef = useRef("");

  const resolvePerspective = useCallback((story) => {
    const explicitKey = String(story?.perspectiveKey || "")
      .trim()
      .toLowerCase();
    if (explicitKey && PERSPECTIVE_LOOKUP[explicitKey]) {
      return {
        ...PERSPECTIVE_LOOKUP[explicitKey],
        label: story?.perspectiveLabel || PERSPECTIVE_LOOKUP[explicitKey].label,
        sourceStyle:
          story?.perspectiveStyle ||
          PERSPECTIVE_LOOKUP[explicitKey].sourceStyle,
        method: story?.perspectiveMethod || "unclassified",
        confidence: story?.perspectiveConfidence || "low",
        rationale: story?.perspectiveRationale || "",
        isEstimated: Boolean(story?.perspectiveEstimated),
      };
    }

    return {
      ...PERSPECTIVE_LOOKUP.unknown,
      method: "unclassified",
      confidence: "low",
      rationale: "",
      isEstimated: false,
    };
  }, []);

  useEffect(() => {
    let active = true;

    getSourceRegistry()
      .then((records) => {
        if (active) {
          setSourceRegistryRecords(records);
        }
      })
      .catch(() => {
        if (active) {
          setSourceRegistryRecords([]);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const allowAnalytics = consent?.analytics !== false;

  const trackComparisonEngagement = useCallback(
    async ({
      eventType,
      article,
      section = "top-stories",
      itemType = "comparison",
      itemTitle,
      itemSource,
    }) => {
      if (!allowAnalytics) {
        return;
      }

      try {
        await fetch("/.netlify/functions/trackEngagement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventType,
            articleId: article?.id || article?.storyId || article?.link,
            articleTitle: article?.title || itemTitle,
            articleSource: article?.source || itemSource,
            section,
            itemType,
            itemTitle: itemTitle || article?.title,
            itemSource: itemSource || article?.source,
            pageTitle: "Top Stories",
            path: "/",
          }),
          keepalive: true,
        });
      } catch {
        // Ignore analytics failures.
      }
    },
    [allowAnalytics],
  );

  const resolveManagedSourceProfile = useCallback(
    (story = {}) => {
      const baseProfile = getSourceProfile(story);
      const record = findRegistryRecord(sourceRegistryRecords, baseProfile);
      return mergeSourceProfileWithRegistry(baseProfile, record);
    },
    [sourceRegistryRecords],
  );

  const resolveStoryPerspective = useCallback(
    (story) => {
      const resolved = resolvePerspective(story);
      if (resolved.key !== "unknown") {
        return resolved;
      }

      const sourceProfile = resolveManagedSourceProfile(story);
      const fallbackKey = String(sourceProfile?.perspectiveKey || "")
        .trim()
        .toLowerCase();
      if (
        fallbackKey &&
        fallbackKey !== "unknown" &&
        PERSPECTIVE_LOOKUP[fallbackKey]
      ) {
        return {
          ...PERSPECTIVE_LOOKUP[fallbackKey],
          label:
            sourceProfile.perspectiveLabel ||
            PERSPECTIVE_LOOKUP[fallbackKey].label,
          method: "source-map",
          confidence: "medium",
          rationale: sourceProfile.methodologyNote || "",
          isEstimated: true,
        };
      }

      return resolved;
    },
    [resolveManagedSourceProfile, resolvePerspective],
  );
  const [showPerspectivesRequested, setShowPerspectivesRequested] = useState(
    defaultPerspectiveView,
  );
  const [perspectiveFilter, setPerspectiveFilter] = useState("all");
  const [perspectiveSelection, setPerspectiveSelection] = useState({
    key: "all:0",
    index: 0,
  });
  const clusterItems = useMemo(
    () =>
      Array.isArray(sideBySideClusters)
        ? sideBySideClusters.filter((item) => {
            const sourceCount = Number(item?.sourceCount || 0);
            const sources = Array.isArray(item?.sources) ? item.sources : [];
            return (
              item?.comparisonEligible !== false &&
              sourceCount >= MIN_PERSPECTIVE_CLUSTER_SOURCES &&
              sources.length >= MIN_PERSPECTIVE_CLUSTER_SOURCES
            );
          })
        : [],
    [sideBySideClusters],
  );
  const useClusteredSideBySide = clusterItems.length > 0;
  const canShowPerspectiveToggle =
    showPerspectiveToggle && useClusteredSideBySide;
  const showPerspectives = showPerspectivesRequested && useClusteredSideBySide;
  const isPerspectiveMode = showPerspectives && useClusteredSideBySide;

  const getMediaOutlet = useCallback((story) => {
    return deriveMediaOutlet(story);
  }, []);

  const truncateText = (text, maxLength) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength).trim()}...`;
  };

  const getStoryDescription = (story, maxLength) => {
    if (!story) return "";

    const primary = String(story.description || "").trim();
    const secondary = String(story.content || "").trim();
    let combined = primary;

    if (secondary && combined.length < maxLength * 0.72) {
      if (
        combined &&
        secondary.toLowerCase().startsWith(combined.toLowerCase().slice(0, 60))
      ) {
        combined = secondary;
      } else {
        combined = `${combined} ${secondary}`.trim();
      }
    }

    if (!combined) {
      combined = String(story.title || "").trim();
    }

    return truncateText(combined, maxLength);
  };

  const getStoryTime = (story) => formatPublishedDate(story) || "";

  const goToArticle = useCallback(
    (article) => {
      recordHistory(article);
      navigate(buildStoryHref(article), { state: { article } });
    },
    [navigate],
  );

  useEffect(() => {
    const activeLimit = useClusteredSideBySide
      ? clusterItems.length
      : topStories.length;
    if (activeLimit > 0 && activeStory >= activeLimit) {
      setActiveStory(0);
    }
  }, [
    topStories,
    clusterItems,
    useClusteredSideBySide,
    activeStory,
    setActiveStory,
  ]);

  const storyGroupCount = useMemo(() => {
    if (useClusteredSideBySide) return clusterItems.length;
    if (!Array.isArray(topStories) || topStories.length === 0) return 0;
    return Math.ceil(topStories.length / 3);
  }, [clusterItems, topStories, useClusteredSideBySide]);

  const perspectiveGroupIndex = useMemo(() => {
    if (storyGroupCount === 0) return 0;
    if (useClusteredSideBySide)
      return Math.min(activeStory, storyGroupCount - 1);
    return Math.floor(activeStory / 3) % storyGroupCount;
  }, [activeStory, storyGroupCount, useClusteredSideBySide]);

  const visibleStories = useMemo(() => {
    if (!Array.isArray(topStories) || topStories.length === 0) return [];

    const maxItems = Math.min(3, topStories.length);
    const items = [];
    for (let index = 0; index < maxItems; index += 1) {
      items.push(topStories[(activeStory + index) % topStories.length]);
    }
    return items;
  }, [activeStory, topStories]);

  const perspectiveStories = useMemo(() => {
    if (useClusteredSideBySide) {
      const activeCluster = clusterItems[perspectiveGroupIndex];
      const items = Array.isArray(activeCluster?.sources)
        ? activeCluster.sources
        : [];

      return items.map((story) => ({
        story,
        perspective: resolvePerspective(story),
      }));
    }

    return [];
  }, [
    clusterItems,
    perspectiveGroupIndex,
    resolvePerspective,
    useClusteredSideBySide,
  ]);

  const filteredPerspectiveStories = useMemo(() => {
    if (perspectiveFilter === "all") return perspectiveStories;
    return perspectiveStories.filter(
      (item) => item.perspective.key === perspectiveFilter,
    );
  }, [perspectiveFilter, perspectiveStories]);

  const visiblePerspectiveStories = useMemo(() => {
    if (filteredPerspectiveStories.length > 0)
      return filteredPerspectiveStories;
    return perspectiveStories;
  }, [filteredPerspectiveStories, perspectiveStories]);

  const perspectiveSelectionKey = `${perspectiveFilter}:${perspectiveGroupIndex}`;
  const resolvedPerspectiveSourceIndex = useMemo(() => {
    if (visiblePerspectiveStories.length === 0) return 0;
    const requestedIndex =
      perspectiveSelection.key === perspectiveSelectionKey
        ? perspectiveSelection.index
        : 0;
    return Math.min(requestedIndex, visiblePerspectiveStories.length - 1);
  }, [
    perspectiveSelection,
    perspectiveSelectionKey,
    visiblePerspectiveStories,
  ]);

  const activePerspectiveItem =
    visiblePerspectiveStories[resolvedPerspectiveSourceIndex] || null;
  const secondaryPerspectiveItem = useMemo(() => {
    if (visiblePerspectiveStories.length < 2) return null;

    return (
      visiblePerspectiveStories.find((_, index) => {
        return index !== resolvedPerspectiveSourceIndex;
      }) || null
    );
  }, [resolvedPerspectiveSourceIndex, visiblePerspectiveStories]);

  useEffect(() => {
    if (!isPerspectiveMode || !activePerspectiveItem?.story) {
      trackedComparisonRef.current = "";
      return;
    }

    const article = activePerspectiveItem.story;
    const trackingKey = [
      perspectiveGroupIndex,
      perspectiveFilter,
      resolvedPerspectiveSourceIndex,
      article.url || article.link || article.title,
    ].join("|");

    if (trackedComparisonRef.current === trackingKey) {
      return;
    }

    trackedComparisonRef.current = trackingKey;
    trackComparisonEngagement({
      eventType: "comparison-view",
      article,
      section: "side-by-side",
      itemTitle: article.title,
      itemSource: article.source,
    });
  }, [
    activePerspectiveItem,
    isPerspectiveMode,
    perspectiveFilter,
    perspectiveGroupIndex,
    resolvedPerspectiveSourceIndex,
    trackComparisonEngagement,
  ]);

  const selectPerspectiveSource = useCallback(
    (index) => {
      const item = visiblePerspectiveStories[index];
      setPerspectiveSelection({
        key: perspectiveSelectionKey,
        index,
      });

      if (item?.story) {
        trackComparisonEngagement({
          eventType: "comparison-source-select",
          article: item.story,
          section: "side-by-side",
          itemTitle: item.story.title,
          itemSource: item.story.source,
        });
      }
    },
    [
      perspectiveSelectionKey,
      trackComparisonEngagement,
      visiblePerspectiveStories,
    ],
  );

  const nextStory = () => {
    if (topStories.length === 0) return;
    setActiveStory((prev) => (prev + 1) % topStories.length);
  };

  const prevStory = () => {
    if (topStories.length === 0) return;
    setActiveStory(
      (prev) => (prev - 1 + topStories.length) % topStories.length,
    );
  };

  const nextPerspectiveGroup = () => {
    if (storyGroupCount === 0) return;
    if (useClusteredSideBySide) {
      setActiveStory((prev) => (prev + 1) % storyGroupCount);
      return;
    }
    setActiveStory(((perspectiveGroupIndex + 1) % storyGroupCount) * 3);
  };

  const prevPerspectiveGroup = () => {
    if (storyGroupCount === 0) return;
    if (useClusteredSideBySide) {
      setActiveStory((prev) => (prev - 1 + storyGroupCount) % storyGroupCount);
      return;
    }
    setActiveStory(
      ((perspectiveGroupIndex - 1 + storyGroupCount) % storyGroupCount) * 3,
    );
  };

  const resolvedSectionTitle =
    sectionTitle ||
    (categoryTitle && categoryTitle.toLowerCase() !== "top stories"
      ? `TOP ${categoryTitle.toUpperCase()} STORIES`
      : "TOP STORIES");

  const resolvedSeeMoreLabel = seeMoreLabel || "See all stories →";
  const resolvedSideBySideTitle =
    sideBySideTitle || "Top Stories - Side by Side";

  const perspectiveTopic = perspectiveStories[0]?.story?.title
    ? truncateText(
        useClusteredSideBySide
          ? clusterItems[perspectiveGroupIndex]?.topic ||
              perspectiveStories[0].story.title
          : perspectiveStories[0].story.title,
        70,
      )
    : "Latest coverage";

  const coverageLabel = categoryTitle
    ? `${categoryTitle} coverage`
    : "Coverage cluster";

  const getPerspectiveMethodLabel = (perspective = {}) =>
    PERSPECTIVE_METHOD_LABELS[perspective.method] || "Needs review";

  const getPerspectiveConfidenceLabel = (perspective = {}) => {
    const confidence = String(perspective.confidence || "low")
      .trim()
      .toLowerCase();
    return confidence
      ? `${confidence.charAt(0).toUpperCase()}${confidence.slice(1)} confidence`
      : "Low confidence";
  };

  const cyclePerspectiveSource = (delta) => {
    if (visiblePerspectiveStories.length === 0) return;
    setPerspectiveSelection((prev) => {
      const total = visiblePerspectiveStories.length;
      const currentIndex =
        prev.key === perspectiveSelectionKey ? prev.index : 0;
      return {
        key: perspectiveSelectionKey,
        index: (currentIndex + delta + total) % total,
      };
    });
  };

  return (
    <section id="news" className="section top-stories-section">
      <div className="section-hdr top-stories-hdr">
        <h2>
          {showPerspectives ? resolvedSideBySideTitle : resolvedSectionTitle}
        </h2>
        {canShowPerspectiveToggle && (
          <div className="top-stories-actions">
            <button
              type="button"
              className="top-stories-toggle"
              onClick={() => setShowPerspectivesRequested((value) => !value)}
            >
              {showPerspectives
                ? "✕ Back to Top Stories"
                : "⇄ See Multiple Perspectives"}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading-container">
          <p className="loading-text">Loading top stories...</p>
        </div>
      ) : visibleStories.length > 0 ? (
        <>
          {!isPerspectiveMode ? (
            <div id="storiesCarousel">
              <div className="carousel-wrap">
                <button
                  className="carousel-arrow prev"
                  onClick={prevStory}
                  aria-label="Previous stories"
                >
                  <FontAwesomeIcon icon={faChevronLeft} />
                </button>

                <div className="carousel-track">
                  {visibleStories.map((story, index) => (
                    <article
                      key={`${story.url || story.title || "story"}-${index}`}
                      className="content-card"
                    >
                      <div className="card-thumb">
                        <img
                          {...getImageProps(story.image, story.title, "news")}
                        />
                      </div>
                      <div className="card-body-inner">
                        {(() => {
                          const storyPerspective =
                            resolveStoryPerspective(story);
                          const sourceProfile =
                            resolveManagedSourceProfile(story);
                          const trust =
                            getTrustDescriptorForProfile(sourceProfile);
                          return (
                            <div className="card-source-row">
                              <div className="card-source-group">
                                <span className="card-source">
                                  {getMediaOutlet(story)}
                                </span>
                                {storyPerspective.key !== "unknown" ? (
                                  <span
                                    className={`card-perspective-pill card-perspective-pill--${storyPerspective.key}`}
                                    title={
                                      PERSPECTIVE_METHOD_LABELS[
                                        storyPerspective.method
                                      ] || "Source map"
                                    }
                                  >
                                    {storyPerspective.label}
                                  </span>
                                ) : null}
                                <span
                                  className={`card-trust-pill card-trust-pill--${trust.band}`}
                                  title={trust.rationale}
                                >
                                  {trust.shortLabel}
                                </span>
                                <Link
                                  className="card-source-profile-link"
                                  to={getSourceProfileHref(story)}
                                  onClick={() => {
                                    trackComparisonEngagement({
                                      eventType: "comparison-source-select",
                                      article: story,
                                      section: "top-stories",
                                      itemType: "source-profile",
                                      itemTitle: story.title,
                                      itemSource: story.source,
                                    });
                                  }}
                                >
                                  Source profile
                                </Link>
                              </div>
                              {getGeneratedContentLabel(story) && (
                                <span className="card-date">
                                  {getGeneratedContentLabel(story)}
                                </span>
                              )}
                              <span className="card-date">
                                {getStoryTime(story)}
                              </span>
                            </div>
                          );
                        })()}
                        <div className="card-headline-text">
                          <a
                            href={buildStoryHref(story)}
                            onClick={(event) => {
                              event.preventDefault();
                              trackComparisonEngagement({
                                eventType: "comparison-story-click",
                                article: story,
                                section: "top-stories",
                                itemTitle: story.title,
                                itemSource: story.source,
                              });
                              goToArticle(story);
                            }}
                          >
                            {story.title}
                          </a>
                        </div>
                        <div className="card-excerpt">
                          {getStoryDescription(story, 150)}
                        </div>
                        <div className="card-footer-row">
                          <span className="card-author">
                            {story.author || getMediaOutlet(story)}
                          </span>
                          <span className="persp-dot"></span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <button
                  className="carousel-arrow next"
                  onClick={nextStory}
                  aria-label="Next stories"
                >
                  <FontAwesomeIcon icon={faChevronRight} />
                </button>
              </div>
            </div>
          ) : (
            <div id="storiesSBS" ref={comparisonViewRef}>
              <div className="top-stories-nav-row">
                <div className="sbs-filter-row">
                  <span className="sbs-filter-label">Filter:</span>
                  <button
                    type="button"
                    onClick={() => setPerspectiveFilter("all")}
                    className={`sbs-pill${perspectiveFilter === "all" ? " sbs-active" : ""}`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setPerspectiveFilter("left")}
                    className={`sbs-pill${perspectiveFilter === "left" ? " sbs-active" : ""}`}
                  >
                    ● Left
                  </button>
                  <button
                    type="button"
                    onClick={() => setPerspectiveFilter("center")}
                    className={`sbs-pill${perspectiveFilter === "center" ? " sbs-active" : ""}`}
                  >
                    ● Center
                  </button>
                  <button
                    type="button"
                    onClick={() => setPerspectiveFilter("right")}
                    className={`sbs-pill${perspectiveFilter === "right" ? " sbs-active" : ""}`}
                  >
                    ● Right
                  </button>
                </div>

                {storyGroupCount > 1 && (
                  <span className="sbs-counter">
                    Story {perspectiveGroupIndex + 1} of {storyGroupCount}
                  </span>
                )}
              </div>

              <div className="sbs-story editorial-sbs">
                <div className="sbs-cluster-meta">
                  <div className="sbs-cluster-copy">
                    <div className="sbs-topic-tag">{coverageLabel}</div>
                    <h3 className="sbs-cluster-topic">{perspectiveTopic}</h3>
                  </div>
                  <div className="sbs-cluster-badges">
                    <span className="sbs-cluster-badge sbs-cluster-badge-sources">
                      {visiblePerspectiveStories.length} sources
                    </span>
                    <span className="sbs-cluster-badge sbs-cluster-badge-mode">
                      {perspectiveFilter === "all"
                        ? "Perspective estimates"
                        : activePerspectiveItem?.perspective.label ||
                          "Focused view"}
                    </span>
                  </div>
                </div>
                <div className="sbs-cluster-note">
                  Labels are estimates based on source history or headline
                  framing, not definitive bias ratings.
                </div>

                <div className="sbs-source-nav">
                  <button
                    className="sbs-source-arrow"
                    type="button"
                    onClick={() => cyclePerspectiveSource(-1)}
                    aria-label="Previous source comparison"
                  >
                    <FontAwesomeIcon icon={faChevronLeft} />
                  </button>

                  <div className="sbs-source-tabs">
                    {visiblePerspectiveStories.map(
                      ({ story, perspective }, index) => (
                        <button
                          key={`${story.url || story.title || "source"}-${index}`}
                          type="button"
                          className={`sbs-source-tab${index === resolvedPerspectiveSourceIndex ? " active" : ""}`}
                          onClick={() => selectPerspectiveSource(index)}
                        >
                          {getMediaOutlet(story)}
                          <span className="sbs-source-tab-perspective">
                            {perspective.label}
                          </span>
                        </button>
                      ),
                    )}
                  </div>

                  <button
                    className="sbs-source-arrow"
                    type="button"
                    onClick={() => cyclePerspectiveSource(1)}
                    aria-label="Next source comparison"
                  >
                    <FontAwesomeIcon icon={faChevronRight} />
                  </button>

                  <span className="sbs-story-count">
                    {resolvedPerspectiveSourceIndex + 1} of{" "}
                    {visiblePerspectiveStories.length}
                  </span>
                </div>

                <div className="sbs-stage sbs-stage-editorial">
                  <button
                    className="sbs-nav-btn"
                    type="button"
                    onClick={prevPerspectiveGroup}
                    aria-label="Previous side-by-side story"
                  >
                    <FontAwesomeIcon icon={faChevronLeft} />
                  </button>

                  <div className="sbs-feature-shell">
                    <div className="sbs-feature-stack">
                      {[activePerspectiveItem, secondaryPerspectiveItem]
                        .filter(Boolean)
                        .map((item, index) =>
                          (() => {
                            const sourceProfile = resolveManagedSourceProfile(
                              item.story,
                            );
                            const trust =
                              getTrustDescriptorForProfile(sourceProfile);

                            return (
                              <article
                                key={`${item.story.url || item.story.title || "feature"}-${index}`}
                                className={`sbs-feature-card${index > 0 ? " sbs-feature-card-secondary" : ""}`}
                                data-persp={item.perspective.key}
                              >
                                <div className="sbs-feature-media">
                                  <img
                                    {...getImageProps(
                                      item.story.image,
                                      item.story.title,
                                      "news",
                                    )}
                                  />
                                </div>
                                <div className="sbs-feature-body">
                                  <div className="sbs-source-row">
                                    <span
                                      className="sbs-source-badge"
                                      style={item.perspective.sourceStyle}
                                    >
                                      ● {getMediaOutlet(item.story)}
                                    </span>
                                    <Link
                                      className="sbs-source-profile-link"
                                      to={getSourceProfileHref(item.story)}
                                      onClick={() => {
                                        trackComparisonEngagement({
                                          eventType: "comparison-source-select",
                                          article: item.story,
                                          section: "side-by-side",
                                          itemType: "source-profile",
                                          itemTitle: item.story.title,
                                          itemSource: item.story.source,
                                        });
                                      }}
                                    >
                                      Source profile
                                    </Link>
                                    {getGeneratedContentLabel(item.story) && (
                                      <span className="sbs-persp-meta">
                                        {getGeneratedContentLabel(item.story)}
                                      </span>
                                    )}
                                    <span
                                      className="sbs-persp-label"
                                      style={item.perspective.sourceStyle}
                                    >
                                      {item.perspective.label}
                                    </span>
                                    <span
                                      className={`card-trust-pill card-trust-pill--${trust.band}`}
                                      title={trust.rationale}
                                    >
                                      {trust.shortLabel}
                                    </span>
                                    <span className="sbs-persp-meta">
                                      {getPerspectiveMethodLabel(
                                        item.perspective,
                                      )}{" "}
                                      ·{" "}
                                      {getPerspectiveConfidenceLabel(
                                        item.perspective,
                                      )}
                                    </span>
                                    {getStoryTime(item.story) && (
                                      <span className="sbs-time">
                                        {getStoryTime(item.story)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="sbs-headline sbs-headline-feature">
                                    <a
                                      href={buildStoryHref(item.story)}
                                      onClick={(event) => {
                                        event.preventDefault();
                                        trackComparisonEngagement({
                                          eventType: "comparison-story-click",
                                          article: item.story,
                                          section: "side-by-side",
                                          itemTitle: item.story.title,
                                          itemSource: item.story.source,
                                        });
                                        goToArticle(item.story);
                                      }}
                                    >
                                      {item.story.title}
                                    </a>
                                  </div>
                                  <div className="sbs-excerpt sbs-excerpt-feature">
                                    {getStoryDescription(
                                      item.story,
                                      index > 0 ? 160 : 240,
                                    )}
                                  </div>
                                  <div className="sbs-footer">
                                    <span className="sbs-author">
                                      {item.story.author ||
                                        getMediaOutlet(item.story)}
                                    </span>
                                    <a
                                      href={buildStoryHref(item.story)}
                                      className="sbs-read"
                                      onClick={(event) => {
                                        event.preventDefault();
                                        trackComparisonEngagement({
                                          eventType: "comparison-story-click",
                                          article: item.story,
                                          section: "side-by-side",
                                          itemTitle: item.story.title,
                                          itemSource: item.story.source,
                                        });
                                        goToArticle(item.story);
                                      }}
                                    >
                                      Read full story →
                                    </a>
                                  </div>
                                </div>
                              </article>
                            );
                          })(),
                        )}
                    </div>

                    <aside
                      className="sbs-rail"
                      aria-label="Coverage comparison list"
                    >
                      <div className="sbs-rail-title">Coverage snapshot</div>
                      <div className="sbs-rail-list">
                        {visiblePerspectiveStories.map(
                          ({ story, perspective }, index) => (
                            <button
                              key={`${story.url || story.title || "rail"}-${index}`}
                              type="button"
                              className={`sbs-rail-item${index === resolvedPerspectiveSourceIndex ? " active" : ""}`}
                              onClick={() => selectPerspectiveSource(index)}
                            >
                              <span
                                className="sbs-rail-source"
                                style={perspective.sourceStyle}
                              >
                                {getMediaOutlet(story)}
                              </span>
                              <span className="sbs-rail-headline">
                                {truncateText(story.title, 88)}
                              </span>
                              <span className="sbs-rail-meta">
                                {perspective.label}
                                {getStoryTime(story)
                                  ? ` · ${getStoryTime(story)}`
                                  : ""}
                              </span>
                            </button>
                          ),
                        )}
                      </div>
                    </aside>
                  </div>

                  <button
                    className="sbs-nav-btn"
                    type="button"
                    onClick={nextPerspectiveGroup}
                    aria-label="Next side-by-side story"
                  >
                    <FontAwesomeIcon icon={faChevronRight} />
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="section-see-more-row">
            <Link to={categoryPath || "/all-news"} className="see-more">
              {resolvedSeeMoreLabel}
            </Link>
          </div>
        </>
      ) : (
        <p className="no-content">No stories available at this time.</p>
      )}
    </section>
  );
}

export default TopStories;
