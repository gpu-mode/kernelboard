import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getTimeLeft, toDateUtc } from "./utils";

describe("getTimeLeft", () => {
  beforeEach(() => {
    // Mock the current time to match the Python test cases
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("time remaining calculations", () => {
    it("calculates 1 day 12 hours remaining", () => {
      // Set current time to 2025-03-24 00:00:00 UTC
      const mockNow = new Date("2025-03-24T00:00:00.000Z");
      vi.setSystemTime(mockNow);

      const deadline = "2025-03-25T12:00:00.000Z";
      const result = getTimeLeft(deadline);
      
      expect(result).toBe("1 day 12 hours remaining");
    });

    it("calculates 0 days 12 hours remaining", () => {
      // Set current time to 2025-03-24 00:00:00 UTC
      const mockNow = new Date("2025-03-24T00:00:00.000Z");
      vi.setSystemTime(mockNow);

      const deadline = "2025-03-24T12:00:00.000Z";
      const result = getTimeLeft(deadline);
      
      expect(result).toBe("0 days 12 hours remaining");
    });

    it("calculates 2 days 1 hour remaining", () => {
      // Set current time to 2025-03-24 11:00:00 UTC
      const mockNow = new Date("2025-03-24T11:00:00.000Z");
      vi.setSystemTime(mockNow);

      const deadline = "2025-03-26T12:00:00.000Z";
      const result = getTimeLeft(deadline);
      
      expect(result).toBe("2 days 1 hour remaining");
    });

    it("handles datetime objects (equivalent test)", () => {
      // Set current time to 2025-03-24 00:00:00 UTC
      const mockNow = new Date("2025-03-24T00:00:00.000Z");
      vi.setSystemTime(mockNow);

      // Test with ISO string format (equivalent to datetime object in Python)
      const deadline = "2025-03-25T12:00:00.000Z";
      const result = getTimeLeft(deadline);
      
      expect(result).toBe("1 day 12 hours remaining");
    });
  });

  describe("past deadlines", () => {
    it("returns 'ended' for past deadlines", () => {
      // Set current time to a time after 1970-01-01
      const mockNow = new Date("2025-03-24T00:00:00.000Z");
      vi.setSystemTime(mockNow);

      const pastDeadline = "1970-01-01T00:00:00.000Z";
      const result = getTimeLeft(pastDeadline);
      
      expect(result).toBe("ended");
    });

    it("returns 'ended' when deadline equals current time", () => {
      const mockNow = new Date("2025-03-24T12:00:00.000Z");
      vi.setSystemTime(mockNow);

      const deadline = "2025-03-24T12:00:00.000Z";
      const result = getTimeLeft(deadline);
      
      expect(result).toBe("ended");
    });
  });

  describe("edge cases", () => {
    it("handles invalid date strings gracefully", () => {
      const mockNow = new Date("2025-03-24T00:00:00.000Z");
      vi.setSystemTime(mockNow);

      // dayjs will create an invalid date for gibberish, which should be handled
      const result = getTimeLeft("gibberish");
      
      // dayjs returns "Invalid Date" for invalid strings, which will be before now
      expect(result).toBe("ended");
    });

    it("handles various ISO date formats", () => {
      const mockNow = new Date("2025-03-24T00:00:00.000Z");
      vi.setSystemTime(mockNow);

      // Test different valid ISO formats
      const formats = [
        "2025-03-25T12:00:00Z",
        "2025-03-25T12:00:00.000Z",
        "2025-03-25 12:00:00+00:00",
      ];

      formats.forEach(format => {
        const result = getTimeLeft(format);
        expect(result).toBe("1 day 12 hours remaining");
      });
    });
  });

  describe("singular vs plural labels", () => {
    it("uses singular labels for 1 day 1 hour", () => {
      const mockNow = new Date("2025-03-24T00:00:00.000Z");
      vi.setSystemTime(mockNow);

      const deadline = "2025-03-25T01:00:00.000Z";
      const result = getTimeLeft(deadline);
      
      expect(result).toBe("1 day 1 hour remaining");
    });

    it("uses plural labels for multiple days and hours", () => {
      const mockNow = new Date("2025-03-24T00:00:00.000Z");
      vi.setSystemTime(mockNow);

      const deadline = "2025-03-26T02:00:00.000Z";
      const result = getTimeLeft(deadline);
      
      expect(result).toBe("2 days 2 hours remaining");
    });

    it("handles 0 days correctly", () => {
      const mockNow = new Date("2025-03-24T00:00:00.000Z");
      vi.setSystemTime(mockNow);

      const deadline = "2025-03-24T01:00:00.000Z";
      const result = getTimeLeft(deadline);
      
      expect(result).toBe("0 days 1 hour remaining");
    });

    it("handles 0 hours correctly", () => {
      const mockNow = new Date("2025-03-24T00:00:00.000Z");
      vi.setSystemTime(mockNow);

      const deadline = "2025-03-25T00:00:00.000Z";
      const result = getTimeLeft(deadline);
      
      expect(result).toBe("1 day 0 hours remaining");
    });
  });
});

describe("toDateUtc", () => {
  it("formats datetime to UTC string", () => {
    const result = toDateUtc("2025-03-24T12:00:00Z");
    expect(result).toBe("2025-03-24 12:00");
  });

  it("converts timezone-aware dates to UTC", () => {
    const result = toDateUtc("2025-03-24T12:00:00-05:00");
    expect(result).toBe("2025-03-24 17:00");
  });

  it("handles various input formats", () => {
    const inputs = [
      "2025-03-24T12:00:00Z",
      "2025-03-24 12:00:00+00:00",
      "2025-03-24T12:00:00.000Z",
    ];

    inputs.forEach(input => {
      const result = toDateUtc(input);
      expect(result).toBe("2025-03-24 12:00");
    });
  });
});
