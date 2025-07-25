import { describe, it, expect } from "vitest";
import { toColor } from "./color";

describe("color utilities", () => {
  describe("toColor", () => {
    it("should return consistent colors for the same input", () => {
      const name = "test-leaderboard";
      const color1 = toColor(name);
      const color2 = toColor(name);

      expect(color1).toBe(color2);
    });

    it("should return different colors for different inputs (most of the time)", () => {
      const names = ["name1", "name2", "name3", "name4", "name5"];
      const colors = names.map(toColor);

      // While not guaranteed, it's very likely that at least some colors will be different
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBeGreaterThan(1);
    });
  });
});
