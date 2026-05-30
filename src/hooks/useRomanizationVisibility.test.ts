import { describe, expect, it } from "vitest";
import { computeRomanizationVisibility } from "@/hooks/useRomanizationVisibility";

const line = (id: string, text: string) => ({ id, text, agentId: "v1" });

describe("computeRomanizationVisibility", () => {
  it("returns latin/0 when no lines are present", () => {
    const result = computeRomanizationVisibility([], {});
    expect(result.dominantScript).toBe("latin");
    expect(result.detectedLineCount).toBe(0);
    expect(result.schemeSet).toBe(false);
    expect(result.shouldShowBanner).toBe(false);
  });

  it("detects japanese as dominant when most non-latin lines are japanese", () => {
    const result = computeRomanizationVisibility(
      [line("L1", "夜だけど"), line("L2", "メモリー"), line("L3", "hello")],
      {},
    );
    expect(result.dominantScript).toBe("japanese");
    expect(result.detectedLineCount).toBe(2);
  });

  it("shows banner when scheme unset, banner not dismissed, non-latin detected", () => {
    const result = computeRomanizationVisibility([line("L1", "夜だけど")], {});
    expect(result.shouldShowBanner).toBe(true);
  });

  it("hides banner when scheme is already set", () => {
    const result = computeRomanizationVisibility([line("L1", "夜だけど")], {
      romanizationScheme: "ja-Latn-hepburn",
    });
    expect(result.schemeSet).toBe(true);
    expect(result.shouldShowBanner).toBe(false);
  });

  it("hides banner when dismissal flag is set", () => {
    const result = computeRomanizationVisibility([line("L1", "夜だけど")], {
      romanizationBannerDismissed: true,
    });
    expect(result.shouldShowBanner).toBe(false);
  });

  it("hides banner when all lines are latin", () => {
    const result = computeRomanizationVisibility([line("L1", "hello")], {});
    expect(result.shouldShowBanner).toBe(false);
    expect(result.dominantScript).toBe("latin");
    expect(result.detectedLineCount).toBe(0);
  });

  it("picks the majority non-latin script when scripts mix", () => {
    const result = computeRomanizationVisibility(
      [line("L1", "你好世界"), line("L2", "你好"), line("L3", "夜だけど")],
      {},
    );
    expect(result.dominantScript).toBe("chinese");
  });

  it("ignores empty lines in the count", () => {
    const result = computeRomanizationVisibility([line("L1", "夜だけど"), line("L2", "")], {});
    expect(result.detectedLineCount).toBe(1);
  });
});

describe("computeRomanizationVisibility invariants", () => {
  it("is stable for the same inputs", () => {
    const lines = [line("L1", "夜だけど"), line("L2", "hello")];
    const meta = {};
    const a = computeRomanizationVisibility(lines, meta);
    const b = computeRomanizationVisibility(lines, meta);
    expect(a).toEqual(b);
  });

  it("never returns a negative line count", () => {
    const result = computeRomanizationVisibility([line("L1", "夜だけど")], {});
    expect(result.detectedLineCount).toBeGreaterThanOrEqual(0);
  });

  it("returns shouldShowBanner=false whenever schemeSet=true regardless of detection", () => {
    const result = computeRomanizationVisibility([line("L1", "夜だけど")], {
      romanizationScheme: "ja-Latn-hepburn",
    });
    expect(result.shouldShowBanner).toBe(false);
  });

  it("returns shouldShowBanner=false whenever dismissed regardless of detection", () => {
    const result = computeRomanizationVisibility([line("L1", "夜だけど")], {
      romanizationBannerDismissed: true,
    });
    expect(result.shouldShowBanner).toBe(false);
  });
});
