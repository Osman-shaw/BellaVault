"use client";

import { useEffect, useState } from "react";
import { VaultDoor } from "./VaultDoor";

export type VaultCelebrationMode = "welcome" | "registered";

type Props = {
  open: boolean;
  mode: VaultCelebrationMode;
  /** Called after animation sequence (navigate here) */
  onComplete: () => void;
};

export function AuthVaultCelebration({ open, mode, onComplete }: Props) {
  const [phase, setPhase] = useState<"hidden" | "opening" | "done">("hidden");

  useEffect(() => {
    if (!open) {
      setPhase("hidden");
      return;
    }
    setPhase("opening");
    const t = window.setTimeout(() => setPhase("done"), 900);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open || phase !== "done") return;
    const delay = mode === "welcome" ? 2200 : 2600;
    const nav = window.setTimeout(() => onComplete(), delay);
    return () => window.clearTimeout(nav);
  }, [open, phase, mode, onComplete]);

  if (!open) return null;

  const doorState = phase === "hidden" ? "locked" : phase === "opening" ? "opening" : "open";
  const title = mode === "welcome" ? "Congratulations!" : "Congratulations!";
  const subtitle =
    mode === "welcome"
      ? "Welcome to BellaVault — your secure workspace is ready."
      : "Your account is created. Verify your email to fully unlock BellaVault.";

  return (
    <div className="vault-celebration" role="dialog" aria-modal="true" aria-labelledby="vault-celebration-title">
      <div className="vault-celebration__backdrop" />
      <div className="vault-celebration__confetti" aria-hidden />
      <div className="vault-celebration__card">
        <VaultDoor state={doorState} />
        <h2 id="vault-celebration-title" className="vault-celebration__title">
          {title}
        </h2>
        <p className="vault-celebration__subtitle">{subtitle}</p>
        {mode === "welcome" ? <p className="vault-celebration__sparkle" aria-hidden>✦ ✧ ✦</p> : null}
      </div>
    </div>
  );
}
