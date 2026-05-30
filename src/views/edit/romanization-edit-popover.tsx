import { useRegenerateRomanization } from "@/hooks/useRegenerateRomanization";
import { Popover } from "@/ui/popover";
import { IconRefresh, IconTrash } from "@tabler/icons-react";
import { type ReactElement, useCallback, useState } from "react";
import { useProjectStore } from "@/stores/project";

// -- Module-scope refs --------------------------------------------------------

const focusAndSelectOnMount = (el: HTMLInputElement | null) => {
  if (!el) return;
  el.focus();
  el.select();
};

// -- Interfaces ---------------------------------------------------------------

interface RomanizationEditPopoverProps {
  lineId: string;
  lineText: string;
  romanizationText: string;
  scheme: string;
  trigger: ReactElement;
}

// -- Component ----------------------------------------------------------------

const RomanizationEditPopover: React.FC<RomanizationEditPopoverProps> = ({
  lineId,
  lineText,
  romanizationText,
  scheme,
  trigger,
}) => {
  const [input, setInput] = useState(romanizationText);
  const { isBusy: regenerateIsBusy, regenerate } = useRegenerateRomanization(scheme);
  const isBusy = regenerateIsBusy(lineId);

  const commit = useCallback(
    (next: string) => {
      const trimmed = next.trim();
      const current = useProjectStore.getState().lines.find((l) => l.id === lineId)?.romanization?.text ?? "";
      const hasChanged = trimmed !== current.trim();
      if (!hasChanged) return;
      if (trimmed.length === 0) {
        if (current.length === 0) return;
        useProjectStore.getState().clearLineRomanizationWithHistory(lineId);
        return;
      }
      useProjectStore.getState().setLineRomanizationWithHistory(lineId, {
        text: trimmed,
        source: "manual",
      });
    },
    [lineId],
  );

  const handleRegenerate = useCallback(
    async (close: () => void) => {
      const target = useProjectStore.getState().lines.find((l) => l.id === lineId);
      if (!target) return;
      await regenerate(target);
      const updated = useProjectStore.getState().lines.find((l) => l.id === lineId);
      const nextText = updated?.romanization?.text ?? "";
      setInput(nextText);
      close();
    },
    [lineId, regenerate],
  );

  const handleClear = useCallback(
    (close: () => void) => {
      useProjectStore.getState().clearLineRomanizationWithHistory(lineId);
      setInput("");
      close();
    },
    [lineId],
  );

  return (
    <Popover placement="bottom-start" trigger={trigger}>
      {(close) => (
        <div className="p-2 w-64">
          <p className="mb-1 text-xs text-composer-text-secondary select-none">Romanization</p>
          <p className="mb-2 text-xs text-composer-text-muted select-text truncate" title={lineText}>
            {lineText}
          </p>
          <input
            ref={focusAndSelectOnMount}
            type="text"
            aria-label="Romanization text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onBlur={() => commit(input)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") {
                commit(input);
                close();
              }
              if (e.key === "Escape") {
                setInput(romanizationText);
                close();
              }
            }}
            placeholder="yoru dakedo"
            className="w-full px-2 py-1 text-sm border rounded bg-composer-input border-composer-border focus:outline-none focus:border-composer-accent"
          />
          <div className="flex items-center justify-between gap-2 mt-2">
            <button
              type="button"
              onClick={() => handleRegenerate(close)}
              disabled={isBusy}
              className="flex items-center gap-1 px-1.5 h-6 text-xs rounded cursor-pointer bg-composer-button hover:bg-composer-button-hover text-composer-text-muted hover:text-composer-text disabled:cursor-not-allowed disabled:opacity-50"
            >
              <IconRefresh className="size-3" />
              {isBusy ? "Regenerating" : "Regenerate"}
            </button>
            <button
              type="button"
              onClick={() => handleClear(close)}
              aria-label="Clear romanization"
              className="flex items-center gap-1 px-1.5 h-6 text-xs rounded cursor-pointer text-composer-error-text hover:bg-composer-error/10"
            >
              <IconTrash className="size-3" />
              Clear
            </button>
          </div>
        </div>
      )}
    </Popover>
  );
};

// -- Exports ------------------------------------------------------------------

export { RomanizationEditPopover };
export type { RomanizationEditPopoverProps };
