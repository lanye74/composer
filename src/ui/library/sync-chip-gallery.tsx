import type { SyncType } from "@/domain/lyrics-search/sync-type";
import { SYNC_TYPE_VARIANTS, SyncTypeIcon } from "@/ui/sync-type-icon";
import { cn } from "@/utils/cn";

// -- Constants ----------------------------------------------------------------

const ALL_SYNC_TYPES: SyncType[] = ["syllable", "word", "line", "unsynced"];

// -- Component ----------------------------------------------------------------

const SyncChipGallery: React.FC = () => {
  if (!import.meta.env.DEV) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-lg border border-dashed border-composer-border bg-composer-bg-dark/40 select-none">
      <span className="text-[11px] font-mono text-composer-text-faint">[dev] chip variants:</span>
      {ALL_SYNC_TYPES.map((syncType) => {
        const variant = SYNC_TYPE_VARIANTS[syncType];
        return (
          <span
            key={syncType}
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md backdrop-blur-xs",
              "text-[10px] font-semibold tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]",
              variant.bgClass,
              variant.textClass,
            )}
          >
            <SyncTypeIcon syncType={syncType} size={10} className="shrink-0" />
            {variant.label}
          </span>
        );
      })}
    </div>
  );
};

// -- Exports ------------------------------------------------------------------

export { SyncChipGallery };
