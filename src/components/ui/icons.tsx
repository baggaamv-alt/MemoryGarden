import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 28, ...rest }: P) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...rest,
  };
}

export const HomeIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5.5 10v9.5h13V10" />
    <path d="M10 19.5v-5h4v5" />
  </svg>
);
export const BackIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);
export const SpeakerIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 10v4h4l5 4V6L8 10H4z" fill="currentColor" stroke="none" />
    <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
  </svg>
);
export const MicIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
  </svg>
);
export const GearIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.8v2.4M12 18.8v2.4M4.2 7.5l2 1.2M17.8 15.3l2 1.2M4.2 16.5l2-1.2M17.8 8.7l2-1.2" />
    <circle cx="12" cy="12" r="7" />
  </svg>
);
export const BulbIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 18h6M10 21h4" />
    <path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" />
  </svg>
);
export const SkipIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 5l8 7-8 7V5zM16 5v14" />
  </svg>
);
export const PauseIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 5v14M15 5v14" />
  </svg>
);
export const HeartIcon = ({ filled, ...p }: P & { filled?: boolean }) => (
  <svg {...base(p)}>
    <path d="M12 20s-7.5-4.6-9.2-9.3C1.7 7.5 4 4.5 7.1 4.5c2 0 3.4 1.1 4.9 3 1.5-1.9 2.9-3 4.9-3 3.1 0 5.4 3 4.3 6.2C19.5 15.4 12 20 12 20z" fill={filled ? "currentColor" : "none"} />
  </svg>
);
export const CheckIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
export const LockIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </svg>
);
export const CloseIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const PlayIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 5v14l12-7L7 5z" fill="currentColor" />
  </svg>
);
export const ReplayIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" />
  </svg>
);
export const SparkIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" fill="currentColor" stroke="none" />
  </svg>
);

export function Coin({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="14" fill="#F6CF6E" stroke="#C99A2E" strokeWidth="2.5" />
      <circle cx="16" cy="16" r="9" fill="none" stroke="#E0B040" strokeWidth="2" />
      <path d="M16 10.5c-2 3-2 8 0 11 2-3 2-8 0-11zM11.5 14.5c1.5.5 3 1.8 4.5 5M20.5 14.5c-1.5.5-3 1.8-4.5 5" stroke="#B98520" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}
