import { cn } from "@/utils/cn";
import type { ButtonHTMLAttributes } from "react";

// -- Interfaces ---------------------------------------------------------------

interface RomanizationSubrowProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  text?: string;
  ghost?: boolean;
  onAddClick?: () => void;
  className?: string;
  ref?: React.Ref<HTMLButtonElement>;
}

// -- Constants ----------------------------------------------------------------

const BASE_STYLES = "text-xs italic leading-tight text-composer-text-muted";

// -- Component ----------------------------------------------------------------

const RomanizationSubrow: React.FC<RomanizationSubrowProps> = ({
  text,
  ghost = false,
  onAddClick,
  className,
  ref,
  ...rest
}) => {
  if (text && text.length > 0) {
    return (
      <span data-testid="romanization-subrow" className={cn(BASE_STYLES, "select-text", className)}>
        {text}
      </span>
    );
  }

  if (!ghost) return null;

  return (
    <button
      type="button"
      ref={ref}
      data-testid="romanization-subrow"
      onClick={onAddClick}
      {...rest}
      className={cn(
        BASE_STYLES,
        "cursor-pointer opacity-60 hover:opacity-100 hover:text-composer-accent-text transition-opacity",
        "self-start",
        className,
      )}
    >
      + Add romanization
    </button>
  );
};

// -- Exports ------------------------------------------------------------------

export { RomanizationSubrow };
export type { RomanizationSubrowProps };
