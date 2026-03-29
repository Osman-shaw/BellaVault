"use client";

import { ReactNode } from "react";

type AuthFeedbackVariant = "error" | "success" | "neutral";

export function AuthFeedback({
  variant,
  children,
}: {
  variant: AuthFeedbackVariant;
  children: ReactNode;
}) {
  return (
    <div className={`auth-alert auth-alert--${variant}`} role="alert">
      {children}
    </div>
  );
}

