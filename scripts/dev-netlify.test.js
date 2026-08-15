import { describe, expect, it, vi } from "vitest";
import { findAvailablePort, resolveDevPorts } from "./dev-netlify.mjs";

describe("dev-netlify", () => {
  it("returns the first available port in range", async () => {
    const isAvailable = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await expect(findAvailablePort(5173, isAvailable, 5)).resolves.toBe(5175);
    expect(isAvailable).toHaveBeenCalledTimes(3);
    expect(isAvailable).toHaveBeenNthCalledWith(1, 5173);
    expect(isAvailable).toHaveBeenNthCalledWith(2, 5174);
    expect(isAvailable).toHaveBeenNthCalledWith(3, 5175);
  });

  it("resolves target and netlify ports with the same availability check", async () => {
    const isAvailable = vi.fn(async (port) => {
      if (port === 5173 || port === 8888) return false;
      if (port === 5174 || port === 8889) return true;
      return false;
    });

    await expect(
      resolveDevPorts({
        targetStartPort: 5173,
        netlifyStartPort: 8888,
        isAvailable,
      }),
    ).resolves.toEqual({ targetPort: 5174, netlifyPort: 8889 });

    expect(isAvailable.mock.calls.map(([port]) => port)).toEqual([
      5173, 5174, 8888, 8889,
    ]);
  });
});
