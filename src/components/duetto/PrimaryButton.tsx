import { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export const PrimaryButton = ({
  className,
  children,
  loading,
  disabled,
  ...props
}: PrimaryButtonProps) => {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        "shimmer-cta press-scale",
        "relative flex h-14 w-full items-center justify-center rounded-2xl",
        "bg-primary text-primary-foreground",
        "text-base font-semibold tracking-tight",
        "shadow-soft hover:shadow-gold transition-shadow duration-300 [transition-timing-function:var(--ease-duetto)]",
        "disabled:opacity-70 disabled:cursor-not-allowed",
        className,
      )}
    >
      <span className="relative z-10 flex items-center gap-2">
        {loading && <Loader2 size={18} className="animate-spin" />}
        {children}
      </span>
    </button>
  );
};
