import { describe, expect, it } from "vitest";
import {
  choosePreferredRegistryRecord,
  findRegistryRecord,
  mergeSourceProfileWithRegistry,
} from "./sourceRegistryService";

describe("sourceRegistryService", () => {
  it("prefers the richest registry record for a repeated source", () => {
    const chosen = choosePreferredRegistryRecord([
      {
        id: "news:1",
        source: "Reuters",
        active: true,
      },
      {
        id: "business:2",
        source: "Reuters",
        active: true,
        ownershipName: "Thomson Reuters",
        ownershipType: "Public company",
        perspectiveLabel: "Center",
        trustScore: 94,
        updatedAt: "2026-08-12T00:00:00.000Z",
      },
    ]);

    expect(chosen.id).toBe("business:2");
    expect(chosen.trustScore).toBe(94);
  });

  it("finds and merges a matching registry record by source slug", () => {
    const baseProfile = {
      displayName: "Reuters",
      slug: "reuters",
      ownershipName: "Unknown",
      ownershipType: "Unclassified",
      perspectiveKey: "unknown",
      perspectiveLabel: "Unclassified",
    };
    const registryRecord = findRegistryRecord(
      [
        {
          id: "news:1",
          source: "Reuters",
          ownershipName: "Thomson Reuters",
          ownershipType: "Public company",
          perspectiveKey: "center",
          perspectiveLabel: "Center",
          trustScore: 93,
          notes: "Reviewed by editorial ops.",
        },
      ],
      baseProfile,
    );

    const merged = mergeSourceProfileWithRegistry(baseProfile, registryRecord);

    expect(merged.ownershipName).toBe("Thomson Reuters");
    expect(merged.perspectiveLabel).toBe("Center");
    expect(merged.trustScore).toBe(93);
    expect(merged.registryNotes).toContain("editorial ops");
  });

  it("does not coerce missing registry trust scores to zero", () => {
    const baseProfile = {
      displayName: "The Guardian",
      slug: "the-guardian",
      ownershipName: "Scott Trust Limited",
      ownershipType: "Trust-owned",
      perspectiveKey: "left",
      perspectiveLabel: "Left-Center",
      factualityLabel: "High factuality",
    };

    const mergedNull = mergeSourceProfileWithRegistry(baseProfile, {
      id: "news:1",
      source: "The Guardian",
      trustScore: null,
    });

    const mergedBlank = mergeSourceProfileWithRegistry(baseProfile, {
      id: "news:2",
      source: "The Guardian",
      trustScore: "",
    });

    expect(mergedNull.trustScore).toBeNull();
    expect(mergedBlank.trustScore).toBeNull();
  });
});
