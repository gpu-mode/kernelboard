import { formatMicroseconds } from "./ranking.ts";

describe("format microseconds", () => {
  it("should format scores", () => {
    expect(formatMicroseconds(0)).toBe("0.000μs");
    expect(formatMicroseconds(1)).toBe("1000000.000μs");
    expect(formatMicroseconds(0.123456789)).toBe("123456.789μs");
    expect(formatMicroseconds(0.1234567891)).toBe("123456.789μs");
  });
});
