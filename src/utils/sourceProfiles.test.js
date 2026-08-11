import { describe, expect, it } from "vitest";
import {
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
});
