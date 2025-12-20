import { describe, it, expect } from "vitest";
import { getMedalIcon } from "./medal";

describe("getMedalIcon", () => {
  describe("when rank is 1 (gold medal)", () => {
    it("returns gold medal emoji", () => {
      const result = getMedalIcon(1);
      expect(result).toBe("🥇");
    });
  });

  describe("when rank is 2 (silver medal)", () => {
    it("returns silver medal emoji", () => {
      const result = getMedalIcon(2);
      expect(result).toBe("🥈");
    });
  });

  describe("when rank is 3 (bronze medal)", () => {
    it("returns bronze medal emoji", () => {
      const result = getMedalIcon(3);
      expect(result).toBe("🥉");
    });
  });

  describe("when rank is outside medal range", () => {
    it("returns null for rank 0", () => {
      const result = getMedalIcon(0);
      expect(result).toBeNull();
    });

    it("returns null for rank 4", () => {
      const result = getMedalIcon(4);
      expect(result).toBeNull();
    });

    it("returns null for rank 10", () => {
      const result = getMedalIcon(10);
      expect(result).toBeNull();
    });

    it("returns null for negative ranks", () => {
      const result = getMedalIcon(-1);
      expect(result).toBeNull();
    });

    it("returns null for very large ranks", () => {
      const result = getMedalIcon(1000);
      expect(result).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("returns null for decimal ranks (strict equality check)", () => {
      expect(getMedalIcon(1.5)).toBeNull(); // Decimal ranks don't match strict equality
      expect(getMedalIcon(2.9)).toBeNull(); // Decimal ranks don't match strict equality
      expect(getMedalIcon(3.1)).toBeNull(); // Decimal ranks don't match strict equality
      expect(getMedalIcon(4.5)).toBeNull(); // Should behave like rank 4
    });

    it("handles string-like numbers when passed as number type", () => {
      // These tests assume TypeScript enforcement, but test runtime behavior
      expect(getMedalIcon(Number("1"))).toBe("🥇");
      expect(getMedalIcon(Number("2"))).toBe("🥈");
      expect(getMedalIcon(Number("3"))).toBe("🥉");
      expect(getMedalIcon(Number("4"))).toBeNull();
    });
  });
});
