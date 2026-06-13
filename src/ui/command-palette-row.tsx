import { Command } from "cmdk";
import type { LibraryProject } from "@/domain/project/library-project";
import { syncStateOf, type SyncState } from "@/domain/project/sync-state";
import { getEffectiveKeysArray } from "@/stores/shortcut-bindings";
import type { PaletteCommandDescriptor } from "@/ui/command-palette-commands";
import { InlineKeyBadge } from "@/ui/inline-key-badge";
import { WaveformFallback } from "@/ui/library/waveform-fallback";
import { cn } from "@/utils/cn";
import { formatTime } from "@/utils/format-time";

// -- Constants ----------------------------------------------------------------

const SYNC_LABEL: Record<SyncState, string> = {
  synced: "synced",
  partial: "partial",
  empty: "empty",
};

const SYNC_DOT_CLASS: Record<SyncState, string> = {
  synced: "bg-composer-success",
  partial: "bg-composer-warning",
  empty: "bg-composer-text-faint",
};

const PALETTE_ITEM_CLASSES = cn(
  "flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer select-none",
  "data-[selected=true]:bg-composer-accent/15",
  "aria-selected:bg-composer-accent/15",
);

// -- Sub-components -----------------------------------------------------------

const PaletteSyncBadge: React.FC<{ state: SyncState }> = ({ state }) => (
  <span className="inline-flex items-center gap-1.5 text-[11px] text-composer-text-faint">
    <span className={cn("size-1.5 rounded-full", SYNC_DOT_CLASS[state])} aria-hidden="true" />
    {SYNC_LABEL[state]}
  </span>
);

// -- Project row --------------------------------------------------------------

interface ProjectRowProps {
  project: LibraryProject;
  onSelect: () => void;
}

const ProjectRow: React.FC<ProjectRowProps> = ({ project, onSelect }) => {
  const title = project.metadata.title || "Untitled";
  const artist = project.metadata.artist || "";
  const duration = project.metadata.duration > 0 ? formatTime(project.metadata.duration, 0) : "No audio";
  const state = syncStateOf(project);
  const thumb = project.metadata.thumbnailDataUrl;
  const sub = artist ? `${artist} ・ ${duration}` : duration;
  const itemValue = `${project.id} ${title} ${artist}`;

  return (
    <Command.Item value={itemValue} onSelect={onSelect} className={PALETTE_ITEM_CLASSES}>
      <span className="size-8 rounded-md overflow-hidden shrink-0">
        {thumb ? (
          <img src={thumb} alt="" className="block size-full object-cover" draggable={false} />
        ) : (
          <WaveformFallback seed={project.id} />
        )}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] font-medium truncate">{title}</span>
        <span className="block text-[11px] text-composer-text-muted truncate">{sub}</span>
      </span>
      <PaletteSyncBadge state={state} />
    </Command.Item>
  );
};

// -- Command row --------------------------------------------------------------

interface CommandRowProps {
  command: PaletteCommandDescriptor;
  onSelect: () => void;
}

const CommandRow: React.FC<CommandRowProps> = ({ command, onSelect }) => {
  const { Icon } = command;
  return (
    <Command.Item value={`cmd:${command.id} ${command.name}`} onSelect={onSelect} className={PALETTE_ITEM_CLASSES}>
      <span className="size-8 rounded-md shrink-0 inline-flex items-center justify-center bg-composer-accent/15 text-composer-accent-text">
        <Icon className="size-4" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] font-medium truncate">{command.name}</span>
        <span className="block text-[11px] text-composer-text-muted truncate">{command.sub}</span>
      </span>
      {command.shortcutId && <InlineKeyBadge keys={getEffectiveKeysArray(command.shortcutId)} trailing={false} />}
    </Command.Item>
  );
};

// -- Exports ------------------------------------------------------------------

export { CommandRow, ProjectRow };
