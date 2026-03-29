"use client";

import Link from "next/link";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Shown under the logo */
  eyebrow?: string;
};

export function AuthShell({ children, eyebrow }: Props) {
  return (
    <div className="auth-page">
      <div className="auth-backdrop" aria-hidden />
      <div className="auth-grid">
        <aside className="auth-aside">
          <Link href="/" className="auth-brand">
            BellaVault
          </Link>
          {eyebrow ? <p className="auth-eyebrow">{eyebrow}</p> : null}
          <p className="auth-aside-copy">
            Track gold purchases, sales, cash borrows, and partners in one secure workspace.
          </p>
        </aside>
        <div className="auth-panel">{children}</div>
      </div>
    </div>
  );
}
