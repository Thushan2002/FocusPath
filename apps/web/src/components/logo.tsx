export function LogoMark({ size = 32, inverted = false }: { size?: number; inverted?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill={inverted ? "#FFFFFF" : "#0D6E5F"} />
      <path d="M8 22c4 0 4-12 8-12s4 8 8 8" fill="none" stroke={inverted ? "#0D6E5F" : "#FFFFFF"} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="24" cy="18" r="2.6" fill={inverted ? "#C2620E" : "#F5C08A"} />
    </svg>
  );
}

export function Logo({ size = 32, inverted = false, textClass = "text-lg" }: { size?: number; inverted?: boolean; textClass?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={size} inverted={inverted} />
      <span className={`font-bold tracking-[-0.01em] ${textClass}`}>FocusPath AI</span>
    </span>
  );
}
