import type { SVGProps } from "react";

// Crafted, consistent line-icon set (24px grid, 1.75 stroke, currentColor).
// Replaces emoji across the app. Original artwork — no third-party assets.
type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function SlidersIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5 4v6M5 14v6M12 4v3M12 11v9M19 4v9M19 17v3" />
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="9" r="2" />
      <circle cx="19" cy="15" r="2" />
    </Base>
  );
}

export function TrophyIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4.5A1.5 1.5 0 0 0 3 7.5C3 9.4 4.6 11 6.5 11H7" />
      <path d="M17 6h2.5A1.5 1.5 0 0 1 21 7.5C21 9.4 19.4 11 17.5 11H17" />
      <path d="M12 14v3" />
      <path d="M8.5 20.5h7M9.5 20.5c0-1.7 1-2.5 2.5-2.5s2.5.8 2.5 2.5" />
    </Base>
  );
}

export function BallIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m12 7 3.2 2.3-1.2 3.7h-4l-1.2-3.7L12 7Z" />
      <path d="m12 7 0-4M15.2 9.3l3.6-1.2M13.99 13 16 16.4M10.01 13 8 16.4M8.8 9.3 5.2 8.1" />
    </Base>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M16 5.2a3 3 0 0 1 0 5.6" />
      <path d="M17.5 14c2 .6 3.5 2.3 3.5 4.6" />
    </Base>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3 5 5.5V11c0 4.5 3 7.8 7 9.5 4-1.7 7-5 7-9.5V5.5L12 3Z" />
      <path d="m9 11.5 2 2 4-4" />
    </Base>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
    </Base>
  );
}

export function ListIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M8 6h12M8 12h12M8 18h12" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
    </Base>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </Base>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 9a6 6 0 0 1 12 0c0 4 1.2 5.5 2 6.5H4c.8-1 2-2.5 2-6.5Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </Base>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 20h16" />
      <rect x="5.5" y="11" width="3.2" height="6" rx="1" />
      <rect x="10.4" y="7" width="3.2" height="10" rx="1" />
      <rect x="15.3" y="13" width="3.2" height="4" rx="1" />
    </Base>
  );
}

export function ArrowIcon(props: IconProps) {
  // Points in reading-direction-leading way; rotate via className if needed.
  return (
    <Base {...props}>
      <path d="M14 6l-6 6 6 6" />
    </Base>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M15 5.5A2.5 2.5 0 0 0 12.5 3H6.5A3.5 3.5 0 0 0 3 6.5v6A2.5 2.5 0 0 0 5.5 15" />
    </Base>
  );
}

export function LinkIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M10.5 13.5a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1.5 1.5" />
      <path d="M13.5 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1.5-1.5" />
    </Base>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 4v10m0 0 3.5-3.5M12 14l-3.5-3.5" />
      <path d="M5 17v1.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V17" />
    </Base>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="17" cy="6" r="2.5" />
      <circle cx="17" cy="18" r="2.5" />
      <path d="m8.2 10.8 6.6-3.6M8.2 13.2l6.6 3.6" />
    </Base>
  );
}

export function WhatsAppIcon(props: IconProps) {
  // WhatsApp glyph (filled), recognizable. Uses fill, not stroke.
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.8c2.17 0 4.21.85 5.74 2.38a8.07 8.07 0 0 1 2.38 5.73c0 4.48-3.65 8.12-8.13 8.12-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.05 8.05 0 0 1-1.24-4.3c0-4.48 3.65-8.12 8.12-8.12Zm-2.6 4.2c-.18 0-.46.07-.7.33-.24.26-.92.9-.92 2.2 0 1.3.94 2.55 1.07 2.73.13.18 1.85 2.82 4.55 3.96.64.27 1.13.43 1.52.55.64.2 1.22.17 1.68.1.51-.07 1.57-.64 1.79-1.26.22-.62.22-1.15.16-1.26-.07-.11-.24-.18-.51-.31-.27-.13-1.57-.78-1.81-.86-.24-.09-.42-.13-.6.13-.17.26-.68.86-.83 1.03-.15.18-.31.2-.57.07-.27-.13-1.12-.41-2.13-1.31-.79-.7-1.32-1.57-1.47-1.83-.15-.26-.02-.4.11-.53.12-.12.27-.31.4-.46.13-.16.18-.27.27-.45.09-.18.04-.33-.02-.46-.07-.13-.6-1.45-.83-1.99-.22-.52-.44-.45-.6-.46-.16-.01-.34-.01-.52-.01Z" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 5v14M5 12h14" />
    </Base>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </Base>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      <path d="M12 14v3" />
    </Base>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 8 6 12l4 4" />
      <path d="M6 12h11" />
    </Base>
  );
}

export function PennantIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 3v18" />
      <path d="M6 4h11l-2.5 3.2L17 10.5H6" />
    </Base>
  );
}

export function MedalIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M8 3h8l-3 7H11L8 3Z" />
      <circle cx="12" cy="16" r="5" />
      <path d="M12 13.5v0" />
    </Base>
  );
}
