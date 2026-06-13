import { FloatingPortal } from "@floating-ui/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { LibraryProject } from "@/domain/project/library-project";
import { cn } from "@/utils/cn";
import { MOD_KEY } from "@/utils/platform";

// -- Types --------------------------------------------------------------------

type ProjectCardAction =
  | "open"
  | "rename"
  | "duplicate"
  | "pin-toggle"
  | "evict-audio"
  | "export-ttml"
  | "export-project-json"
  | "delete";

interface ProjectCardContextMenuProps {
  open: boolean;
  position: { x: number; y: number };
  project: LibraryProject;
  onClose: () => void;
  onAction: (action: ProjectCardAction) => void;
}

interface MenuEntry {
  kind: "item";
  id: ProjectCardAction;
  label: string;
  kbd?: string;
  danger?: boolean;
}

interface MenuDivider {
  kind: "divider";
}

type MenuRow = MenuEntry | MenuDivider;

// -- Helpers ------------------------------------------------------------------

function buildMenuRows(project: LibraryProject): MenuRow[] {
  const rows: MenuRow[] = [
    { kind: "item", id: "open", label: "Open" },
    { kind: "item", id: "rename", label: "Rename", kbd: "F2" },
    { kind: "item", id: "duplicate", label: "Duplicate", kbd: `${MOD_KEY}D` },
    { kind: "divider" },
    { kind: "item", id: "pin-toggle", label: project.pinned ? "Unpin" : "Pin to top" },
  ];

  const showEvict = project.audioSource?.kind === "youtube" && project.audioBytesCached === true;
  if (showEvict) {
    rows.push({ kind: "item", id: "evict-audio", label: "Evict audio" });
  }

  rows.push({ kind: "divider" });
  rows.push({ kind: "item", id: "export-ttml", label: "Export TTML" });
  rows.push({ kind: "item", id: "export-project-json", label: "Export project JSON" });
  rows.push({ kind: "divider" });
  rows.push({ kind: "item", id: "delete", label: "Delete", kbd: "Del", danger: true });

  return rows;
}

function clampPosition(x: number, y: number, width: number, height: number) {
  const maxX = Math.max(0, window.innerWidth - width - 4);
  const maxY = Math.max(0, window.innerHeight - height - 4);
  return { x: Math.min(Math.max(0, x), maxX), y: Math.min(Math.max(0, y), maxY) };
}

// -- Component ----------------------------------------------------------------

const ProjectCardContextMenu: React.FC<ProjectCardContextMenuProps> = ({
  open,
  position,
  project,
  onClose,
  onAction,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const rows = useMemo(() => buildMenuRows(project), [project]);
  const items = useMemo(() => rows.filter((row): row is MenuEntry => row.kind === "item"), [rows]);

  const activate = useCallback(
    (id: ProjectCardAction) => {
      onAction(id);
      onClose();
    },
    [onAction, onClose],
  );

  const focusItem = useCallback((index: number) => {
    const node = itemRefs.current[index];
    if (node) node.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => focusItem(0));
  }, [open, focusItem]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open, onClose]);

  const handleItemKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusItem((index + 1) % items.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusItem((index - 1 + items.length) % items.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusItem(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusItem(items.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate(items[index].id);
    }
  };

  if (!open) return null;

  const clamped = clampPosition(position.x, position.y, 200, items.length * 30 + 30);

  let itemIndex = -1;

  return (
    <FloatingPortal>
      <div
        ref={containerRef}
        role="menu"
        aria-label="Project actions"
        style={{ position: "fixed", top: clamped.y, left: clamped.x }}
        className={cn(
          "z-300 min-w-45 p-1 rounded-lg select-none",
          "bg-composer-bg-elevated border border-composer-border",
          "shadow-[0_20px_40px_-10px_rgba(0,0,0,0.7)]",
        )}
      >
        {rows.map((row, idx) => {
          if (row.kind === "divider") {
            return (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: dividers carry no identity beyond position
                key={`d-${idx}`}
                role="separator"
                className="h-px bg-composer-border my-1"
              />
            );
          }
          itemIndex += 1;
          const currentIndex = itemIndex;
          return (
            <button
              key={row.id}
              ref={(node) => {
                itemRefs.current[currentIndex] = node;
              }}
              type="button"
              role="menuitem"
              onClick={() => activate(row.id)}
              onKeyDown={(event) => handleItemKeyDown(event, currentIndex)}
              className={cn(
                "flex items-center justify-between gap-3 w-full px-2.5 py-1.5",
                "text-[12px] text-left rounded cursor-pointer outline-none",
                "focus-visible:bg-white/8 hover:bg-white/8",
                row.danger
                  ? "text-red-300/95 hover:text-red-200 focus-visible:text-red-200 hover:bg-red-900/20 focus-visible:bg-red-900/20"
                  : "text-composer-text-secondary hover:text-composer-text focus-visible:text-composer-text",
              )}
            >
              <span>{row.label}</span>
              {row.kbd && <span className="font-mono text-[10px] text-composer-text-faint">{row.kbd}</span>}
            </button>
          );
        })}
      </div>
    </FloatingPortal>
  );
};

// -- Exports ------------------------------------------------------------------

export { ProjectCardContextMenu };
export type { ProjectCardAction, ProjectCardContextMenuProps };
