"use client";

import { useId } from "react";

/** Inline vault + lock mark (matches favicon artwork). */
export function BellaVaultMark({ size = 28, className }: { size?: number; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gidBg = `bv-mark-bg-${uid}`;
  const gidLock = `bv-mark-lock-${uid}`;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={gidBg} x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1e293b" />
          <stop offset="1" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id={gidLock} x1="12" y1="14" x2="22" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fbbf24" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${gidBg})`} />
      <path
        d="M9 24V15.5C9 11.5 11.8 9 16 9s7 2.5 7 6.5V24"
        stroke="#64748b"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <rect x="11" y="15" width="10" height="10" rx="1.5" fill="#1e293b" stroke="#475569" strokeWidth="0.75" />
      <circle cx="14" cy="18.5" r="0.9" fill="#f59e0b" />
      <circle cx="16" cy="18.5" r="0.9" fill="#f59e0b" />
      <circle cx="18" cy="18.5" r="0.9" fill="#f59e0b" />
      <rect x="13.25" y="19.5" width="5.5" height="4.5" rx="0.75" fill={`url(#${gidLock})`} />
      <path
        d="M14.25 19.5v-1.25a1.75 1.75 0 013.5 0V19.5"
        stroke="#fde68a"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
    </svg>
  );
}
