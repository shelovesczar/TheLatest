import { describe, expect, it } from "vitest";
import { AD_SIZE_PRESETS, AD_SLOT_PRESETS } from "./AdBreak";

const ALLOWED_IAB_SIZES = new Set([
  "970x250",
  "970x90",
  "728x90",
  "468x60",
  "320x100",
  "320x50",
  "300x600",
  "300x250",
]);

const formatSize = ({ width, height }) => `${width}x${height}`;

describe("AdBreak size presets", () => {
  it("keeps base presets on approved IAB sizes", () => {
    Object.values(AD_SIZE_PRESETS).forEach((preset) => {
      Object.values(preset).forEach((size) => {
        expect(ALLOWED_IAB_SIZES.has(formatSize(size))).toBe(true);
      });
    });
  });

  it("keeps slot presets on approved IAB sizes", () => {
    Object.values(AD_SLOT_PRESETS).forEach((slot) => {
      Object.values(slot.sizes).forEach((size) => {
        expect(ALLOWED_IAB_SIZES.has(formatSize(size))).toBe(true);
      });
    });
  });
});
