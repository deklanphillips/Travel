export function Logo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="hawk" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <path
        d="M3 17 L29 6 L19 26 L15 18 Z"
        fill="url(#hawk)"
        stroke="url(#hawk)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="15" cy="18" r="1.6" fill="#0b1120" />
    </svg>
  );
}
