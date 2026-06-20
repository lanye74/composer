import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { bgBounds } from "@/domain/line/bounds";
import { type LooseLine, reconcileLine, toFlat } from "@/domain/line/model";

// CI guards for line-synced background survival (issue #122). A background is a
// first-class voice with the same three states as the main voice. The recurring
// footgun is dropping a line-synced background's bounds when a line is
// round-tripped through a representation that cannot hold them. Two guards keep
// that from coming back:
//   1. The flat model (LooseLine / toFlat / reconcileLine) is LOSSLESS for a
//      line-synced background, so every flat round-trip preserves it.
//   2. Template-to-line materialization (relative offset + instanceStart) lives
//      only in the one shared builder, so no caller can re-derive it and drop
//      the bounds.

const SRC_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// -- Guard 1: lossless flat round-trip ----------------------------------------

describe("flat model round-trip preserves a line-synced background", () => {
  const MAIN_STATES: Array<{ name: string; fields: Partial<LooseLine> }> = [
    { name: "untimed", fields: {} },
    { name: "line-synced", fields: { begin: 1, end: 9 } },
    { name: "word-synced", fields: { words: [{ text: "hi", begin: 1, end: 2 }] } },
  ];

  for (const main of MAIN_STATES) {
    it(`keeps the line-synced background bounds with a ${main.name} main`, () => {
      const input: LooseLine = {
        id: "L",
        text: "main",
        agentId: "v1",
        backgroundText: "ooh",
        backgroundBegin: 3,
        backgroundEnd: 6.5,
        backgroundTextSource: "manual",
        ...main.fields,
      };
      const round = reconcileLine(input);
      expect(bgBounds(round)).toEqual({ begin: 3, end: 6.5 });
      expect(toFlat(round)).toEqual(input);
    });
  }
});

// -- Guard 2: materialization stays in the shared builder ----------------------

const MATERIALIZE_ALLOWED = "domain/group/instance-line.ts";
const MATERIALIZE_PATTERN = /relative(?:Background)?(?:Begin|End)\s*\+/;

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === "dist" || entry === ".git") continue;
      yield* walk(full);
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      yield full;
    }
  }
}

describe("template-to-line materialization stays in the shared builder", () => {
  it("only instanceLineFromTemplate turns a relative template offset into an absolute time", () => {
    const offenders: Array<{ file: string; line: number; text: string }> = [];

    for (const file of walk(SRC_ROOT)) {
      const rel = relative(SRC_ROOT, file).replace(/\\/g, "/");
      if (rel === MATERIALIZE_ALLOWED) continue;
      if (rel.endsWith(".test.ts") || rel.endsWith(".test.tsx")) continue;

      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
        if (MATERIALIZE_PATTERN.test(line)) {
          offenders.push({ file: rel, line: idx + 1, text: trimmed });
        }
      });
    }

    expect(offenders).toEqual([]);
  });
});
