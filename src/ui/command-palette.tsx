import { IconSearch } from "@tabler/icons-react";
import { FloatingFocusManager, FloatingPortal, useFloating } from "@floating-ui/react";
import { Command } from "cmdk";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLibraryProjects } from "@/hooks/useLibraryProjects";
import { useModalStackStore } from "@/stores/modal-stack";
import { getEffectiveKeysArray } from "@/stores/shortcut-bindings";
import { PALETTE_COMMANDS, type PaletteCommandId } from "@/ui/command-palette-commands";
import { CommandRow, ProjectRow } from "@/ui/command-palette-row";
import { InlineKeyBadge } from "@/ui/inline-key-badge";
import { cn } from "@/utils/cn";

// -- Types --------------------------------------------------------------------

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenProject: (id: string) => void;
  onCommandRun: (commandId: PaletteCommandId) => void;
}

// -- Constants ----------------------------------------------------------------

const PALETTE_GROUP_HEADING_CLASSES = cn(
  "[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1",
  "[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase",
  "[&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:font-semibold",
  "[&_[cmdk-group-heading]]:text-composer-text-faint",
);

// -- Sub-components -----------------------------------------------------------

const PaletteFooter: React.FC<{ paletteKeys: string[] }> = ({ paletteKeys }) => (
  <div className="flex items-center gap-4 px-4 py-2 border-t border-composer-border bg-black/20 text-[11px] text-composer-text-muted select-none">
    <span className="inline-flex items-center gap-1.5">
      <InlineKeyBadge keys={["Enter"]} trailing={false} />
      open
    </span>
    <span className="inline-flex items-center gap-1.5">
      <InlineKeyBadge keys={["ArrowUp", "ArrowDown"]} trailing={false} />
      navigate
    </span>
    <span className="inline-flex items-center gap-1.5">
      <InlineKeyBadge keys={["Esc"]} trailing={false} />
      close
    </span>
    <span className="ml-auto inline-flex items-center gap-1.5">
      <InlineKeyBadge keys={paletteKeys} trailing={false} />
      palette
    </span>
  </div>
);

// -- Hooks --------------------------------------------------------------------

function useModalStackWhileOpen(open: boolean): void {
  useEffect(() => {
    if (!open) return;
    const { push, pop } = useModalStackStore.getState();
    push();
    return () => {
      pop();
    };
  }, [open]);
}

function useEscapeToClose(open: boolean, onClose: () => void): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);
}

// -- Component ----------------------------------------------------------------

const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onOpenChange, onOpenProject, onCommandRun }) => {
  const { data: projects = [] } = useLibraryProjects();
  const [search, setSearch] = useState("");
  const previousOpen = useRef(open);
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { refs, context } = useFloating({
    open,
    onOpenChange: (next) => {
      if (!next) onOpenChange(false);
    },
  });

  useModalStackWhileOpen(open);
  useEscapeToClose(open, () => onOpenChange(false));

  useEffect(() => {
    if (previousOpen.current && !open) setSearch("");
    previousOpen.current = open;
  }, [open]);

  const handleOverlayMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === overlayRef.current) onOpenChange(false);
    },
    [onOpenChange],
  );

  const paletteShortcutKeys = useMemo(() => getEffectiveKeysArray("global.openCommandPalette"), []);

  if (!open) return null;

  return (
    <FloatingPortal>
      <FloatingFocusManager context={context} modal returnFocus initialFocus={inputRef}>
        <div
          ref={overlayRef}
          role="presentation"
          onMouseDown={handleOverlayMouseDown}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/50 backdrop-blur-sm"
        >
          <div
            ref={refs.setFloating as unknown as React.Ref<HTMLDivElement>}
            className={cn(
              "w-[520px] max-w-[92vw]",
              "bg-composer-bg-elevated border border-composer-border rounded-xl overflow-hidden",
              "shadow-2xl text-composer-text",
            )}
          >
            <Command label="Command palette" loop>
              <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-composer-border">
                <IconSearch className="size-4 text-composer-text-muted shrink-0" />
                <Command.Input
                  ref={inputRef}
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Find a project, command, or shortcut…"
                  className="flex-1 bg-transparent outline-none text-[15px] text-composer-text placeholder:text-composer-text-muted"
                />
                <InlineKeyBadge keys={["Esc"]} trailing={false} />
              </div>

              <Command.List className="max-h-[420px] overflow-y-auto p-1.5">
                <Command.Empty className="px-3 py-6 text-center text-[12px] text-composer-text-muted">
                  No results.
                </Command.Empty>

                {projects.length > 0 && (
                  <Command.Group heading="Projects" className={PALETTE_GROUP_HEADING_CLASSES}>
                    {projects.map((project) => (
                      <ProjectRow
                        key={project.id}
                        project={project}
                        onSelect={() => {
                          onOpenProject(project.id);
                          onOpenChange(false);
                        }}
                      />
                    ))}
                  </Command.Group>
                )}

                <Command.Group heading="Commands" className={PALETTE_GROUP_HEADING_CLASSES}>
                  {PALETTE_COMMANDS.map((command) => (
                    <CommandRow
                      key={command.id}
                      command={command}
                      onSelect={() => {
                        onCommandRun(command.id);
                        onOpenChange(false);
                      }}
                    />
                  ))}
                </Command.Group>
              </Command.List>

              <PaletteFooter paletteKeys={paletteShortcutKeys} />
            </Command>
          </div>
        </div>
      </FloatingFocusManager>
    </FloatingPortal>
  );
};

// -- Exports ------------------------------------------------------------------

export { CommandPalette };
export type { CommandPaletteProps, PaletteCommandId };
