import { InputHTMLAttributes, forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "placeholder"> {
  label: string;
  type?: string;
  error?: string;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, type = "text", error, className, value, onFocus, onBlur, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const effectiveType = isPassword && showPassword ? "text" : type;

    const hasValue = typeof value === "string" ? value.length > 0 : Boolean(value);
    const floated = focused || hasValue;

    return (
      <div className="w-full">
        <div
          className={cn(
            "relative h-14 w-full rounded-2xl bg-card",
            "border-[1.5px] transition-colors duration-200 [transition-timing-function:var(--ease-duetto)]",
            focused ? "border-accent" : "border-border",
            error && "border-destructive",
          )}
        >
          <label
            className={cn(
              "pointer-events-none absolute left-4 origin-left transition-all duration-150 [transition-timing-function:var(--ease-duetto)]",
              floated
                ? "top-2 text-[11px] text-muted-foreground"
                : "top-1/2 -translate-y-1/2 text-[15px] text-placeholder",
            )}
          >
            {label}
          </label>
          <input
            ref={ref}
            type={effectiveType}
            value={value}
            onFocus={(e) => { setFocused(true); onFocus?.(e); }}
            onBlur={(e) => { setFocused(false); onBlur?.(e); }}
            className={cn(
              "h-full w-full rounded-2xl bg-transparent px-4 pt-5 pb-1 text-[15px] text-foreground outline-none",
              isPassword && "pr-12",
              className,
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              tabIndex={-1}
              aria-label={showPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>
        {error && (
          <p className="mt-1.5 pl-2 text-xs text-destructive">{error}</p>
        )}
      </div>
    );
  },
);
AuthInput.displayName = "AuthInput";
