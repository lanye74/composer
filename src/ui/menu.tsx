import { formatKey } from "@/ui/shortcut-reference";
import { cn } from "@/utils/cn";
import { isMac } from "@/utils/platform";
import { IconCommand } from "@tabler/icons-react";

// -- Types --------------------------------------------------------------------

interface MenuItemProps {
  label: string;
  onClick: () => void;
  danger?: boolean;
  shortcut?: string[];
  selected?: boolean;
}

interface MenuContainerProps {
  children: React.ReactNode;
  className?: string;
}

// -- Components ---------------------------------------------------------------

const MenuItem: React.FC<MenuItemProps> = ({ label, onClick, danger, shortcut, selected }) => {
  const tone = danger
    ? "text-composer-error hover:bg-composer-error/10"
    : selected
      ? "bg-composer-accent/15 text-composer-text"
      : "text-composer-text hover:bg-composer-button";

  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between gap-4 px-3 py-1.5 text-sm cursor-pointer rounded-md transition-colors",
        tone,
      )}
    >
      <span>{label}</span>
      {shortcut && shortcut.length > 0 && (
        <span className="inline-flex items-center gap-0.5">
          {shortcut.map((key) => (
            <span
              key={key}
              className="inline-flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-medium rounded bg-white/10 text-composer-text-muted leading-none shadow-[0_2px_0_0_rgba(0,0,0,0.3)]"
            >
              {key === "Mod" && isMac ? <IconCommand className="size-2.5" /> : formatKey(key)}
            </span>
          ))}
        </span>
      )}
    </button>
  );
};

const MenuDivider: React.FC = () => <div role="separator" className="my-1 border-t border-composer-border" />;

const MenuContainer: React.FC<MenuContainerProps> = ({ children, className }) => (
  <div
    className={cn(
      "z-100 min-w-36 p-1 border shadow-2xl rounded-lg bg-composer-bg border-composer-border select-none",
      className,
    )}
  >
    {children}
  </div>
);

// -- Exports ------------------------------------------------------------------

export { MenuContainer, MenuDivider, MenuItem };
export type { MenuContainerProps, MenuItemProps };
