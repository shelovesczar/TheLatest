import { describe, expect, it, vi } from "vitest";

vi.mock("./rssService", () => ({
  fetchRSSNews: vi.fn(),
  fetchRSSOpinions: vi.fn(),
  fetchRSSVideos: vi.fn(),
  fetchRSSPodcasts: vi.fn(),
  searchRSSContent: vi.fn(),
}));

const { __testing } = await import("./newsService");

describe("newsService provider backfill", () => {
  it("builds provider backfill queries from topic, category, and fallback phrases", () => {
    expect(
      __testing.buildProviderBackfillQueries("opinions", {
        category: "politics",
        topic: "border security",
      }),
    ).toEqual([
      "border security opinion analysis editorial commentary",
      "politics opinion analysis editorial commentary",
      "opinion analysis editorial commentary",
    ]);
  });

  it("does not generate a redundant category query for the news bucket", () => {
    expect(
      __testing.buildProviderBackfillQueries("videos", {
        category: "news",
        topic: "",
      }),
    ).toEqual(["video interview highlights watch"]);
  });

  it("filters, normalizes, and deduplicates provider backfill results across queries", async () => {
    const searchFn = vi
      .fn()
      .mockResolvedValueOnce([
        {
          title: "Daily Tech Podcast Episode 10",
          description: "Podcast episode about AI chips",
          source: "Test FM",
          url: "https://example.com/podcast-10",
        },
        {
          title: "Daily Tech Podcast Episode 10",
          description: "Podcast episode about AI chips",
          source: "Test FM",
          url: "https://example.com/podcast-10",
        },
        {
          title: "Plain article",
          description: "Straight news report",
          source: "Newswire",
          url: "https://example.com/article",
        },
      ])
      .mockResolvedValueOnce([
        {
          title: "Founder Interview Podcast",
          description: "Listen to the full episode",
          source: "Startup Radio",
          url: "https://example.com/podcast-11",
        },
      ]);

    const results = await __testing.fetchProviderLiveBackfill(
      "podcasts",
      {
        category: "tech",
        topic: "AI chips",
        count: 2,
        matchesItem: __testing.isProviderPodcastLike,
        normalizeItem: (item) => ({
          ...item,
          normalized: true,
        }),
      },
      { searchFn },
    );

    expect(searchFn).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(2);
    expect(results.map((item) => item.title)).toEqual([
      "Daily Tech Podcast Episode 10",
      "Founder Interview Podcast",
    ]);
    expect(results.every((item) => item.normalized)).toBe(true);
  });

  it("stops querying once the requested backfill count is satisfied", async () => {
    const searchFn = vi.fn().mockResolvedValue([
      {
        title: "Election analysis column",
        description: "Opinion column",
        source: "Daily Desk",
        url: "https://example.com/opinion-1",
      },
      {
        title: "Editorial: policy reset",
        description: "Editorial board commentary",
        source: "Daily Desk",
        url: "https://example.com/opinion-2",
      },
    ]);

    const results = await __testing.fetchProviderLiveBackfill(
      "opinions",
      {
        category: "politics",
        topic: "election",
        count: 2,
        matchesItem: __testing.isProviderOpinionLike,
      },
      { searchFn },
    );

    expect(searchFn).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(2);
  });
});
