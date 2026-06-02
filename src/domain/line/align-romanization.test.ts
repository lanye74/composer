import { describe, expect, it } from "vitest";
import { alignRomanizationToWords } from "@/domain/line/align-romanization";
import type { RomanizationData } from "@/domain/line/model";

describe("alignRomanizationToWords", () => {
  describe("passthrough", () => {
    it("returns the input identity when length matches", () => {
      const input: RomanizationData = {
        text: "yoru dakedo",
        wordTexts: ["yoru", "dakedo"],
        source: "manual",
      };
      const result = alignRomanizationToWords(input, 2);
      expect(result).toBe(input);
    });

    it("returns the input identity when romanization is undefined", () => {
      const result = alignRomanizationToWords(undefined, 3);
      expect(result).toBeUndefined();
    });

    it("returns the input identity when wordTexts is undefined (line-level only)", () => {
      const input: RomanizationData = { text: "yoru dakedo", source: "manual" };
      const result = alignRomanizationToWords(input, 3);
      expect(result).toBe(input);
    });
  });

  describe("growth (pad)", () => {
    it("pads with empty strings to grow wordTexts to wordCount", () => {
      const input: RomanizationData = {
        text: "yoru dakedo",
        wordTexts: ["yoru", "dakedo"],
        source: "manual",
      };
      const result = alignRomanizationToWords(input, 4);
      expect(result?.wordTexts).toEqual(["yoru", "dakedo", "", ""]);
    });

    it("pads when wordTexts is empty and wordCount is positive", () => {
      const input: RomanizationData = {
        text: "yoru dakedo",
        wordTexts: [],
        source: "generated",
      };
      const result = alignRomanizationToWords(input, 3);
      expect(result?.wordTexts).toEqual(["", "", ""]);
    });

    it("pads exactly one when growing by one", () => {
      const input: RomanizationData = {
        text: "a b c",
        wordTexts: ["a", "b", "c"],
        source: "manual",
      };
      const result = alignRomanizationToWords(input, 4);
      expect(result?.wordTexts).toEqual(["a", "b", "c", ""]);
    });
  });

  describe("shrink (truncate)", () => {
    it("truncates wordTexts to shrink to wordCount", () => {
      const input: RomanizationData = {
        text: "a b c d",
        wordTexts: ["a", "b", "c", "d"],
        source: "manual",
      };
      const result = alignRomanizationToWords(input, 2);
      expect(result?.wordTexts).toEqual(["a", "b"]);
    });

    it("truncates by one when shrinking by one", () => {
      const input: RomanizationData = {
        text: "a b c",
        wordTexts: ["a", "b", "c"],
        source: "generated",
      };
      const result = alignRomanizationToWords(input, 2);
      expect(result?.wordTexts).toEqual(["a", "b"]);
    });
  });

  describe("edge cases", () => {
    it("drops wordTexts when wordCount is 0", () => {
      const input: RomanizationData = {
        text: "yoru",
        wordTexts: ["yoru"],
        source: "manual",
      };
      const result = alignRomanizationToWords(input, 0);
      expect(result).toEqual({ text: "yoru", source: "manual" });
      expect(result).not.toHaveProperty("wordTexts");
    });

    it("treats negative wordCount as 0 (defensive)", () => {
      const input: RomanizationData = {
        text: "yoru",
        wordTexts: ["yoru"],
        source: "manual",
      };
      const result = alignRomanizationToWords(input, -1);
      expect(result).toEqual({ text: "yoru", source: "manual" });
      expect(result).not.toHaveProperty("wordTexts");
    });

    it("preserves text and source fields exactly when padding", () => {
      const input: RomanizationData = {
        text: "yoru dakedo",
        wordTexts: ["yoru", "dakedo"],
        source: "generated",
      };
      const result = alignRomanizationToWords(input, 3);
      expect(result?.text).toBe("yoru dakedo");
      expect(result?.source).toBe("generated");
    });

    it("preserves text and source fields exactly when truncating", () => {
      const input: RomanizationData = {
        text: "a b c d",
        wordTexts: ["a", "b", "c", "d"],
        source: "manual",
      };
      const result = alignRomanizationToWords(input, 2);
      expect(result?.text).toBe("a b c d");
      expect(result?.source).toBe("manual");
    });
  });

  describe("immutability", () => {
    it("does not mutate the input wordTexts array when padding", () => {
      const original = ["yoru", "dakedo"];
      const input: RomanizationData = {
        text: "yoru dakedo",
        wordTexts: original,
        source: "manual",
      };
      alignRomanizationToWords(input, 4);
      expect(original).toEqual(["yoru", "dakedo"]);
      expect(original).toHaveLength(2);
    });

    it("does not mutate the input wordTexts array when truncating", () => {
      const original = ["a", "b", "c", "d"];
      const input: RomanizationData = {
        text: "a b c d",
        wordTexts: original,
        source: "manual",
      };
      alignRomanizationToWords(input, 2);
      expect(original).toEqual(["a", "b", "c", "d"]);
      expect(original).toHaveLength(4);
    });

    it("does not mutate the input romanization object when dropping wordTexts", () => {
      const input: RomanizationData = {
        text: "yoru",
        wordTexts: ["yoru"],
        source: "manual",
      };
      alignRomanizationToWords(input, 0);
      expect(input.wordTexts).toEqual(["yoru"]);
    });

    it("returns a new wordTexts array reference when padding", () => {
      const original = ["yoru", "dakedo"];
      const input: RomanizationData = {
        text: "yoru dakedo",
        wordTexts: original,
        source: "manual",
      };
      const result = alignRomanizationToWords(input, 3);
      expect(result?.wordTexts).not.toBe(original);
    });
  });
});
