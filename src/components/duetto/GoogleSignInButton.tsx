import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const GoogleG = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.4 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c10.8 0 19.5-8.7 19.5-19.5 0-1.2-.1-2.3-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.1l6.6 4.8C14.7 15.3 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.4 29.1 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.1z"/>
    <path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.9 12.9-5l-6-5c-1.9 1.4-4.3 2.3-6.9 2.3-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39 16.2 43.5 24 43.5z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.4 5.6l6 5C40.9 35.7 43.5 30.3 43.5 24c0-1.2-.1-2.3-.4-3.5z"/>
  </svg>
);

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export const GoogleSignInButton = ({ className, loading, children, ...props }: Props) => {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "group flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-card",
        "border-[1.5px] border-border shadow-soft",
        "transition-all duration-200 [transition-timing-function:var(--ease-duetto)]",
        "hover:border-accent hover-glow press-scale",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        className,
      )}
    >
      <GoogleG />
      <span className="text-[15px] font-medium text-foreground">
        {loading ? "A entrar..." : (children ?? "Continuar com Google")}
      </span>
    </button>
  );
};
