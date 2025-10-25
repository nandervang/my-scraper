import * as React from "react"
import { cn } from "@/lib/utils"

interface SwitchProps extends React.HTMLAttributes<HTMLButtonElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked = false, onCheckedChange, disabled = false, ...props }, ref) => {
    const handleClick = () => {
      if (!disabled && onCheckedChange) {
        onCheckedChange(!checked);
      }
    };

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked ? "true" : "false"}
        disabled={disabled}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          checked 
            ? "bg-primary" 
            : "bg-input",
          className
        )}
        onClick={handleClick}
        {...props}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform duration-200 ease-in-out",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    );
  }
);

Switch.displayName = "Switch";

export { Switch }