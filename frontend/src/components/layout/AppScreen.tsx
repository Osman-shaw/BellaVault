import Link from "next/link";
import { ReactNode } from "react";

export function AppScreen({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <main className="screen-page">
      <header className="screen-header">
        <h1 className="screen-title">{title}</h1>
        {description ? <p className="screen-desc">{description}</p> : null}
      </header>
      {children}
    </main>
  );
}

export function ReadOnlyBanner() {
  return (
    <div className="screen-banner screen-banner--muted" role="status">
      Read-only:{" "}
      <Link href="/auth/login" className="screen-inline-link">
        Sign in
      </Link>{" "}
      or{" "}
      <Link href="/auth/register" className="screen-inline-link">
        Register
      </Link>{" "}
      to add or change records.
    </div>
  );
}

export function ScreenFeedback({
  children,
  variant = "info",
}: {
  children: ReactNode;
  variant?: "info" | "error" | "success";
}) {
  const cls =
    variant === "error"
      ? "screen-feedback screen-feedback--error"
      : variant === "success"
        ? "screen-feedback screen-feedback--success"
        : "screen-feedback";
  return <div className={cls}>{children}</div>;
}

export function AccessDenied({ message }: { message: string }) {
  return (
    <main className="screen-page">
      <div className="screen-denied">
        <p className="screen-denied__text">{message}</p>
        <Link href="/auth/login" className="screen-inline-link">
          Sign in
        </Link>
      </div>
    </main>
  );
}

export function ScreenSectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="screen-section-title">{children}</h2>;
}

export function ScreenEmpty({ children }: { children: ReactNode }) {
  return <p className="screen-empty">{children}</p>;
}

export function StatusPill({ tone, children }: { tone: "success" | "warn" | "info" | "neutral"; children: ReactNode }) {
  return <span className={`status-pill status-pill--${tone}`}>{children}</span>;
}
