import { cn } from "@/lib/utils";

export const ProgressBar = ({ value, className }: { value: number; className?: string }) => (
  <div className={cn("h-2 w-full overflow-hidden rounded-full bg-background-soft", className)}>
    <div
      className="h-full rounded-full bg-accent transition-[width] duration-500 [transition-timing-function:var(--ease-duetto)]"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);
