import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { getMedalIcon } from "./medal";

describe("getMedalIcon", () => {
  describe("when rank is 1 (gold medal)", () => {
    it("returns a gold-colored EmojiEventsIcon", () => {
      const result = getMedalIcon(1);
      expect(result).not.toBeNull();

      const { container } = render(result!);
      const icon = container.querySelector("svg");

      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute("data-testid", "EmojiEventsIcon");
    });

    it("applies gold color styling", () => {
      const result = getMedalIcon(1);
      const { container } = render(result!);
      const icon = container.querySelector("svg");

      // Check if the icon has the gold color applied via sx prop
      expect(icon).toHaveStyle({ color: "#FFD700" });
    });
  });

  describe("when rank is 2 (silver medal)", () => {
    it("returns a silver-colored EmojiEventsIcon", () => {
      const result = getMedalIcon(2);
      expect(result).not.toBeNull();

      const { container } = render(result!);
      const icon = container.querySelector("svg");

      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute("data-testid", "EmojiEventsIcon");
    });

    it("applies silver color styling", () => {
      const result = getMedalIcon(2);
      const { container } = render(result!);
      const icon = container.querySelector("svg");

      // Check if the icon has the silver color applied via sx prop
      expect(icon).toHaveStyle({ color: "#C0C0C0" });
    });
  });

  describe("when rank is 3 (bronze medal)", () => {
    it("returns a bronze-colored EmojiEventsIcon", () => {
      const result = getMedalIcon(3);
      expect(result).not.toBeNull();

      const { container } = render(result!);
      const icon = container.querySelector("svg");

      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute("data-testid", "EmojiEventsIcon");
    });

    it("applies bronze color styling", () => {
      const result = getMedalIcon(3);
      const { container } = render(result!);
      const icon = container.querySelector("svg");

      // Check if the icon has the bronze color applied via sx prop
      expect(icon).toHaveStyle({ color: "#CD7F32" });
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

  describe("icon styling consistency", () => {
    it("applies consistent font size to all medal icons", () => {
      const ranks = [1, 2, 3];

      ranks.forEach((rank) => {
        const result = getMedalIcon(rank);
        const { container } = render(result!);
        const icon = container.querySelector("svg");

        expect(icon).toHaveStyle({ fontSize: "1.1rem" });
      });
    });

    it("applies consistent vertical alignment to all medal icons", () => {
      const ranks = [1, 2, 3];

      ranks.forEach((rank) => {
        const result = getMedalIcon(rank);
        const { container } = render(result!);
        const icon = container.querySelector("svg");

        expect(icon).toHaveStyle({ verticalAlign: "middle" });
      });
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
      expect(getMedalIcon(Number("1"))).not.toBeNull();
      expect(getMedalIcon(Number("2"))).not.toBeNull();
      expect(getMedalIcon(Number("3"))).not.toBeNull();
      expect(getMedalIcon(Number("4"))).toBeNull();
    });
  });
});
