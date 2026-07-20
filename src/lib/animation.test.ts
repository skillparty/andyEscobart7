import { describe, expect, test } from "vitest";
import { easeOutCubic, interpolate } from "./animation";

describe("easeOutCubic", () => {
  test("starts at 0 and ends at 1", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
  });

  test("clamps progress outside [0, 1]", () => {
    expect(easeOutCubic(-0.5)).toBe(0);
    expect(easeOutCubic(1.5)).toBe(1);
  });

  test("decelerates: first half covers more than half the distance", () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });

  test("is monotonically increasing", () => {
    let prev = easeOutCubic(0);
    for (let t = 0.1; t <= 1; t += 0.1) {
      const value = easeOutCubic(t);
      expect(value).toBeGreaterThanOrEqual(prev);
      prev = value;
    }
  });
});

describe("interpolate", () => {
  test("returns from at progress 0 and to at progress 1", () => {
    expect(interpolate(100, 500, 0)).toBe(100);
    expect(interpolate(100, 500, 1)).toBe(500);
  });

  test("handles negative targets (deudas)", () => {
    expect(interpolate(0, -300, 1)).toBe(-300);
    const mid = interpolate(0, -300, 0.5);
    expect(mid).toBeLessThan(0);
    expect(mid).toBeGreaterThan(-300);
  });

  test("returns from when from equals to", () => {
    expect(interpolate(42, 42, 0.5)).toBe(42);
  });
});
