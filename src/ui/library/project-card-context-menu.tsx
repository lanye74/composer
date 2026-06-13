import { FloatingPortal } from "@floating-ui/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { LibraryProject } from "@/domain/project/library-project";
import { MenuContainer, MenuDivider, MenuItem } from "@/ui/menu";

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
  shortcut?: string[];
  danger?: boolean;
}

interface MenuSeparator {
  kind: "divider";
}

type MenuRow = MenuEntry | MenuSeparator;

// -- Helpers ------------------------------------------------------------------

function buildMenuRows(project: LibraryProject): MenuRow[] {
  const rows: MenuRow[] = [
    { kind: "item", id: "open", label: "Open" },
    { kind: "item", id: "rename", label: "Rename", shortcut: ["F2"] },
    { kind: "item", id: "duplicate", label: "Duplicate", shortcut: ["Mod", "D"] },
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
  rows.push({ kind: "item", id: "delete", label: "Delete", shortcut: ["Del"], danger: true });

  return rows;
}

function clampPosition(x: number, y: number, width: number, height: number) {
  const maxX = Math.max(0, window.innerWidth - width - 4);
  const maxY = Math.max(0, window.innerHeight - height - 4);
  return { x: Math.min(Math.max(0, x), maxX), y: Math.min(Math.max(0, y), maxY) };
}

function findItemButtons(container: HTMLDivElement | null): HTMLButtonElement[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
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
    const buttons = findItemButtons(containerRef.current);
    buttons[index]?.focus();
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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const buttons = findItemButtons(containerRef.current);
    const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (currentIndex < 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusItem((currentIndex + 1) % items.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusItem((currentIndex - 1 + items.length) % items.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusItem(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusItem(items.length - 1);
    }
  };

  if (!open) return null;

  const clamped = clampPosition(position.x, position.y, 200, items.length * 30 + 30);

  return (
    <FloatingPortal>
      <div
        ref={containerRef}
        role="menu"
        aria-label="Project actions"
        onKeyDown={handleKeyDown}
        style={{ position: "fixed", top: clamped.y, left: clamped.x }}
      >
        <MenuContainer className="min-w-45">
          {rows.map((row, idx) => {
            if (row.kind === "divider") {
              return (
                <MenuDivider
                  // biome-ignore lint/suspicious/noArrayIndexKey: dividers carry no identity beyond position
                  key={`d-${idx}`}
                />
              );
            }
            return (
              <MenuItem
                key={row.id}
                label={row.label}
                onClick={() => activate(row.id)}
                shortcut={row.shortcut}
                danger={row.danger}
              />
            );
          })}
        </MenuContainer>
      </div>
    </FloatingPortal>
  );
};

// -- Exports ------------------------------------------------------------------

export { ProjectCardContextMenu };
export type { ProjectCardAction, ProjectCardContextMenuProps };
