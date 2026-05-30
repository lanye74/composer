import type { LyricLine } from "@/domain/line/model";
import type { ProjectMetadata } from "@/domain/project/metadata";
import type { Script } from "@/domain/romanization/detect";
import { detectScript } from "@/domain/romanization/detect";
import { getPersistenceSettled } from "@/lib/persistence-settled";
import { useProjectStore } from "@/stores/project";
import { useEffect, useMemo, useState } from "react";

// -- Types --------------------------------------------------------------------

interface RomanizationVisibility {
  schemeSet: boolean;
  bannerDismissed: boolean;
  dominantScript: Script;
  detectedLineCount: number;
  shouldShowBanner: boolean;
}

type MetadataLike = Partial<Pick<ProjectMetadata, "romanizationScheme" | "romanizationBannerDismissed">>;
type LineLike = Pick<LyricLine, "text">;

// -- Internals ----------------------------------------------------------------

const detectScriptCache = new WeakMap<object, { text: string; script: Script }>();

function detectScriptCached(line: LineLike): Script {
  const cached = detectScriptCache.get(line as object);
  if (cached && cached.text === line.text) return cached.script;
  const script = detectScript(line.text);
  detectScriptCache.set(line as object, { text: line.text, script });
  return script;
}

// -- Pure helper --------------------------------------------------------------

function computeRomanizationVisibility(lines: LineLike[], metadata: MetadataLike): RomanizationVisibility {
  const schemeSet = typeof metadata.romanizationScheme === "string" && metadata.romanizationScheme.length > 0;
  const bannerDismissed = metadata.romanizationBannerDismissed === true;

  const counts = new Map<Script, number>();
  for (const line of lines) {
    if (!line.text) continue;
    const script = detectScriptCached(line);
    if (script === "latin") continue;
    counts.set(script, (counts.get(script) ?? 0) + 1);
  }

  let dominantScript: Script = "latin";
  let detectedLineCount = 0;
  for (const [script, count] of counts) {
    if (count > detectedLineCount) {
      dominantScript = script;
      detectedLineCount = count;
    }
  }

  const shouldShowBanner = !schemeSet && !bannerDismissed && detectedLineCount > 0;

  return { schemeSet, bannerDismissed, dominantScript, detectedLineCount, shouldShowBanner };
}

// -- Hook ---------------------------------------------------------------------

function usePersistenceSettled(): boolean {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    let cancelled = false;
    getPersistenceSettled().then(() => {
      if (!cancelled) setSettled(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return settled;
}

function useRomanizationVisibility(): RomanizationVisibility {
  const lines = useProjectStore((s) => s.lines);
  const metadata = useProjectStore((s) => s.metadata);
  const persistenceSettled = usePersistenceSettled();
  return useMemo(() => {
    const visibility = computeRomanizationVisibility(lines, metadata);
    if (!persistenceSettled) return { ...visibility, shouldShowBanner: false };
    return visibility;
  }, [lines, metadata, persistenceSettled]);
}

// -- Exports ------------------------------------------------------------------

export { computeRomanizationVisibility, useRomanizationVisibility };
export type { RomanizationVisibility };
