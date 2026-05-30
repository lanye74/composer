import { describe, expect, it } from "vitest";
import { hasRomanization, isRomanizationGenerated, isRomanizationManual } from "@/domain/line/romanization";

describe("romanization predicates", () => {
  it("hasRomanization false on plain line", () => {
    expect(hasRomanization({ id: "L1", text: "hi", agentId: "v1" })).toBe(false);
  });

  it("hasRomanization true when set with non-empty text", () => {
    expect(
      hasRomanization({
        id: "L1",
        text: "hi",
        agentId: "v1",
        romanization: { text: "hi", source: "manual" },
      }),
    ).toBe(true);
  });

  it("hasRomanization false for empty-text romanization", () => {
    expect(
      hasRomanization({
        id: "L1",
        text: "hi",
        agentId: "v1",
        romanization: { text: "", source: "manual" },
      }),
    ).toBe(false);
  });

  it("isRomanizationManual recognises manual source", () => {
    expect(
      isRomanizationManual({
        id: "L1",
        text: "hi",
        agentId: "v1",
        romanization: { text: "hi", source: "manual" },
      }),
    ).toBe(true);
  });

  it("isRomanizationManual false on plain line", () => {
    expect(isRomanizationManual({ id: "L1", text: "hi", agentId: "v1" })).toBe(false);
  });

  it("isRomanizationManual false when source is generated", () => {
    expect(
      isRomanizationManual({
        id: "L1",
        text: "hi",
        agentId: "v1",
        romanization: { text: "hi", source: "generated" },
      }),
    ).toBe(false);
  });

  it("isRomanizationGenerated recognises generated source", () => {
    expect(
      isRomanizationGenerated({
        id: "L1",
        text: "hi",
        agentId: "v1",
        romanization: { text: "hi", source: "generated" },
      }),
    ).toBe(true);
  });

  it("isRomanizationGenerated false on plain line", () => {
    expect(isRomanizationGenerated({ id: "L1", text: "hi", agentId: "v1" })).toBe(false);
  });

  it("isRomanizationGenerated false when source is manual", () => {
    expect(
      isRomanizationGenerated({
        id: "L1",
        text: "hi",
        agentId: "v1",
        romanization: { text: "hi", source: "manual" },
      }),
    ).toBe(false);
  });
});
