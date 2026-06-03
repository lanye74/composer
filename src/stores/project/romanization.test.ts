import { describe, expect, it } from "vitest";
import { reconcileLine } from "@/domain/line/model";
import { useProjectStore } from "@/stores/project";

function seedSingleLine() {
  const lines = [
    reconcileLine({
      id: "L1",
      text: "夜だけど",
      agentId: "v1",
      words: [
        { text: "夜", begin: 0, end: 1 },
        { text: "だけど", begin: 1, end: 2 },
      ],
    }),
  ];
  useProjectStore.getState().setLinesWithHistory(lines);
}

describe("setLineRomanizationWithHistory", () => {
  it("sets romanization on a matching line", () => {
    useProjectStore.setState(useProjectStore.getInitialState());
    seedSingleLine();
    useProjectStore.getState().setLineRomanizationWithHistory("L1", {
      text: "yoru dakedo",
      wordTexts: ["yoru", "dakedo"],
      source: "generated",
      engine: "cutlet",
    });
    const line = useProjectStore.getState().lines[0];
    expect(line.romanization?.text).toBe("yoru dakedo");
    expect(line.romanization?.wordTexts).toEqual(["yoru", "dakedo"]);
    expect(line.romanization?.engine).toBe("cutlet");
  });

  it("clears romanization when called with undefined", () => {
    useProjectStore.setState(useProjectStore.getInitialState());
    seedSingleLine();
    useProjectStore.getState().setLineRomanizationWithHistory("L1", {
      text: "yoru dakedo",
      wordTexts: ["yoru", "dakedo"],
      source: "generated",
    });
    useProjectStore.getState().setLineRomanizationWithHistory("L1", undefined);
    expect(useProjectStore.getState().lines[0].romanization).toBeUndefined();
  });

  it("is a no-op for unknown line ids", () => {
    useProjectStore.setState(useProjectStore.getInitialState());
    seedSingleLine();
    useProjectStore.getState().setLineRomanizationWithHistory("missing", {
      text: "x",
      source: "manual",
    });
    expect(useProjectStore.getState().lines[0].romanization).toBeUndefined();
  });

  it("commits to undo history (undo restores prior state)", () => {
    useProjectStore.setState(useProjectStore.getInitialState());
    seedSingleLine();
    useProjectStore.getState().setLineRomanizationWithHistory("L1", {
      text: "yoru dakedo",
      source: "generated",
    });
    useProjectStore.getState().undo();
    expect(useProjectStore.getState().lines[0].romanization).toBeUndefined();
  });

  it("drops mismatched wordTexts via reconciler", () => {
    useProjectStore.setState(useProjectStore.getInitialState());
    seedSingleLine();
    useProjectStore.getState().setLineRomanizationWithHistory("L1", {
      text: "yoru",
      wordTexts: ["yoru"],
      source: "generated",
    });
    const r = useProjectStore.getState().lines[0].romanization;
    expect(r?.text).toBe("yoru");
    expect(r?.wordTexts).toBeUndefined();
  });

  it("leaves siblings untouched", () => {
    useProjectStore.setState(useProjectStore.getInitialState());
    useProjectStore
      .getState()
      .setLinesWithHistory([
        reconcileLine({ id: "L1", text: "a", agentId: "v1", begin: 0, end: 1 }),
        reconcileLine({ id: "L2", text: "b", agentId: "v1", begin: 1, end: 2 }),
      ]);
    useProjectStore.getState().setLineRomanizationWithHistory("L1", {
      text: "A",
      source: "manual",
    });
    expect(useProjectStore.getState().lines[1].romanization).toBeUndefined();
  });
});

describe("metadata.romanizationScheme", () => {
  it("round-trips a scheme via setMetadata", () => {
    useProjectStore.setState(useProjectStore.getInitialState());
    useProjectStore.getState().setMetadata({ romanizationScheme: "ja-Latn-hepburn" });
    expect(useProjectStore.getState().metadata.romanizationScheme).toBe("ja-Latn-hepburn");
  });

  it("survives clear via undefined", () => {
    useProjectStore.setState(useProjectStore.getInitialState());
    useProjectStore.getState().setMetadata({ romanizationScheme: "ja-Latn-hepburn" });
    useProjectStore.getState().setMetadata({ romanizationScheme: undefined });
    expect(useProjectStore.getState().metadata.romanizationScheme).toBeUndefined();
  });
});
