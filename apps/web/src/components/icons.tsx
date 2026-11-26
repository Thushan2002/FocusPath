/** Stroke icons from the design canvas. */
type P = { className?: string; size?: number };
const base = (size = 18) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "aria-hidden": true as const });

export const TodayIcon = ({ size, className }: P) => (
  <svg {...base(size)} strokeWidth="1.8" className={className}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
);
export const RoadmapIcon = ({ size, className }: P) => (
  <svg {...base(size)} strokeWidth="1.8" strokeLinecap="round" className={className}>
    <circle cx="6" cy="19" r="2" />
    <circle cx="18" cy="5" r="2" />
    <path d="M8 19h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7" />
  </svg>
);
export const FocusIcon = ({ size, className }: P) => (
  <svg {...base(size)} strokeWidth="1.8" className={className}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.5" />
  </svg>
);
export const ProgressIcon = ({ size, className }: P) => (
  <svg {...base(size)} strokeWidth="1.8" strokeLinecap="round" className={className}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
);
export const ArrowRight = ({ size, className }: P) => (
  <svg {...base(size)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const ArrowLeft = ({ size, className }: P) => (
  <svg {...base(size)} strokeWidth="2" strokeLinecap="round" className={className}>
    <path d="M15 6l-6 6 6 6" />
  </svg>
);
export const Check = ({ size, className }: P) => (
  <svg {...base(size)} strokeWidth="2.2" className={className}>
    <path d="M5 12l4 4 10-10" />
  </svg>
);
export const Flame = ({ size, className }: P) => (
  <svg {...base(size)} strokeWidth="2" strokeLinejoin="round" className={className}>
    <path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" />
  </svg>
);
export const Sparkle = ({ size, className }: P) => (
  <svg {...base(size)} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
    <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
  </svg>
);
export const Chevron = ({ size, className }: P) => (
  <svg {...base(size)} strokeWidth="2" strokeLinecap="round" className={className}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);
export const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.8 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.4 5.7c4.3-4 6.9-9.9 6.9-17.2z" />
    <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.8-6.1a24 24 0 0 0 0 21.6l7.8-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.8 6.1C6.6 42.6 14.6 48 24 48z" />
  </svg>
);
