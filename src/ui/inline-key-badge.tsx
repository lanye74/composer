import { formatKey } from "@/ui/shortcut-reference";
import { cn } from "@/utils/cn";
import { isMac } from "@/utils/platform";
import { IconCommand } from "@tabler/icons-react";

// -- Types --------------------------------------------------------------------

interface InlineKeyBadgeProps {
  keys: string[];
  trailing?: boolean;
}

// -- Component ----------------------------------------------------------------

const InlineKeyBadge: React.FC<InlineKeyBadgeProps> = ({ keys, trailing = true }) => {
  if (keys.length === 0) {
    return (
      <span
        data-inline-key-badge
        className={cn(
          "inline-flex items-center justify-center h-4 px-1.5 text-[10px] font-medium rounded bg-white/5 text-composer-text-muted leading-none italic",
          trailing && "ml-1.5",
        )}
      >
        Unbound
      </span>
    );
  }
  return (
    <span data-inline-key-badge className={cn("inline-flex items-center gap-0.5", trailing && "ml-1.5")}>
      {keys.map((key) => (
        <span
          key={key}
          className="inline-flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-medium rounded bg-white/10 text-composer-text-muted leading-none shadow-[0_2px_0_0_rgba(0,0,0,0.3)]"
        >
          {key === "Mod" && isMac ? <IconCommand className="size-2.5" /> : formatKey(key)}
        </span>
      ))}
    </span>
  );
};

// -- Exports ------------------------------------------------------------------

export { InlineKeyBadge };
