import { describe, expect, it } from "vitest";
import {
  getTrustDescriptorForProfile,
  getTrustDescriptor,
  getSourceProfile,
  getSourceProfileBySlug,
  getSourceProfileHref,
  slugifySourceName,
} from "./sourceProfiles";

describe("sourceProfiles", () => {
  it("resolves a canonical source profile from a known outlet name", () => {
    const profile = getSourceProfile("Reuters");

    expect(profile.displayName).toBe("Reuters");
    expect(profile.ownershipName).toBe("Thomson Reuters");
    expect(profile.perspectiveLabel).toBe("Center");
  });

  it("resolves a source profile from a slug", () => {
    const profile = getSourceProfileBySlug("new-york-times");

    expect(profile.displayName).toBe("New York Times");
    expect(profile.factualityLabel).toBe("High factuality");
  });

  it("builds stable profile hrefs and fallback slugs for unknown sources", () => {
    expect(getSourceProfileHref("BBC News")).toBe("/sources/bbc-news");
    expect(slugifySourceName("Made Up Outlet")).toBe("made-up-outlet");
  });

  it("builds a source-level truth score descriptor from the trust layer", () => {
    const trust = getTrustDescriptor("Reuters");

    expect(trust.score).toBeGreaterThanOrEqual(90);
    expect(trust.band).toBe("high");
    expect(trust.shortLabel).toContain("Truth score");
  });

  it("honors an explicit managed trust score when provided", () => {
    const trust = getTrustDescriptorForProfile({
      displayName: "Reuters",
      factualityLabel: "Needs review",
      ownershipType: "Unclassified",
      trustScore: 88,
    });

    expect(trust.score).toBe(88);
    expect(trust.band).toBe("high");
  });

  it("falls back to profile-derived scoring when managed trust score is missing", () => {
    const trust = getTrustDescriptorForProfile({
      displayName: "The Guardian",
      slug: "the-guardian",
      factualityLabel: "High factuality",
      ownershipType: "Trust-owned",
      perspectiveKey: "left",
      trustScore: null,
    });

    expect(trust.score).toBe(98);
    expect(trust.band).toBe("high");
  });

  it("uses canonical outlet mappings for known syndicated hosts", () => {
    const bbcProfile = getSourceProfile({
      source: "BBC Global News Podcast",
      url: "https://podcasts.files.bbci.co.uk/p02nq0gn.rss",
    });
    const wsjProfile = getSourceProfile({
      source: "WSJ Opinion",
      url: "https://feeds.a.dj.com/rss/RSSOpinion.xml",
    });

    expect(bbcProfile.displayName).toBe("BBC News");
    expect(wsjProfile.displayName).toBe("Wall Street Journal");
  });

  it("prefers the named publisher over generic syndication hosts", () => {
    const profile = getSourceProfile({
      source: "Vox Conversations",
      url: "https://feeds.megaphone.fm/VMP5705694065",
    });

    expect(profile.displayName).toBe("Vox");
    expect(profile.slug).toBe("vox");
  });

  it("maps feed variants onto the curated source families", () => {
    const guardianProfile = getSourceProfile({
      source: "The Guardian Politics",
      url: "https://www.theguardian.com/politics/rss",
    });
    const espnProfile = getSourceProfile({
      source: "ESPN NBA",
      url: "https://www.espn.com/espn/rss/nba/news",
    });
    const videoBundleProfile = getSourceProfile({
      source: "Custom Video Feed",
      url: "https://rss.app/feeds/_D52QE16IQULFQQkk.xml",
    });

    expect(guardianProfile.displayName).toBe("The Guardian");
    expect(espnProfile.displayName).toBe("ESPN");
    expect(videoBundleProfile.factualityLabel).toBe("Aggregation layer");
  });

  it("resolves the next curated outlet batch", () => {
    const cnaProfile = getSourceProfile({
      source: "Channel NewsAsia",
      url: "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml",
    });
    const fortuneProfile = getSourceProfile({
      source: "Fortune",
      url: "https://fortune.com/feed/",
    });
    const billboardProfile = getSourceProfile({
      source: "Billboard",
      url: "https://www.billboard.com/feed/",
    });
    const apartmentTherapyProfile = getSourceProfile({
      source: "Apartment Therapy",
      url: "https://www.apartmenttherapy.com/main.rss",
    });

    expect(cnaProfile.factualityLabel).toBe("High factuality");
    expect(fortuneProfile.displayName).toBe("Fortune");
    expect(billboardProfile.factualityLabel).toBe("Industry reporting");
    expect(apartmentTherapyProfile.displayName).toBe("Apartment Therapy");
  });

  it("resolves opinion, podcast, and variant feeds onto curated families", () => {
    const atlanticPoliticsProfile = getSourceProfile({
      source: "The Atlantic Politics",
      url: "https://www.theatlantic.com/feed/channel/politics/",
    });
    const hillOpinionProfile = getSourceProfile({
      source: "The Hill Opinion",
      url: "https://thehill.com/opinion/feed/",
    });
    const marketplaceTechProfile = getSourceProfile({
      source: "Marketplace Tech",
      url: "https://feeds.publicradio.org/public_feeds/marketplace-tech/rss/rss.rss",
    });
    const nationalReviewProfile = getSourceProfile({
      source: "National Review",
      url: "https://www.nationalreview.com/feed/",
    });
    const scmpProfile = getSourceProfile({
      source: "South China Morning Post",
      url: "https://www.scmp.com/rss/91/feed",
    });

    expect(atlanticPoliticsProfile.displayName).toBe("The Atlantic");
    expect(hillOpinionProfile.displayName).toBe("The Hill");
    expect(marketplaceTechProfile.displayName).toBe("Marketplace");
    expect(nationalReviewProfile.perspectiveLabel).toBe("Right");
    expect(scmpProfile.displayName).toBe("South China Morning Post");
  });
});
