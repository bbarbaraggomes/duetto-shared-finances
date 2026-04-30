interface DuettoLogoProps {
  size?: number;
  className?: string;
}

/** Two interlocking thin rings — symbolizing a couple */
export const DuettoLogo = ({ size = 48, className }: DuettoLogoProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <circle cx="18" cy="24" r="11.25" stroke="hsl(var(--accent))" strokeWidth="1.5" />
    <circle cx="30" cy="24" r="11.25" stroke="hsl(var(--accent))" strokeWidth="1.5" />
  </svg>
);
