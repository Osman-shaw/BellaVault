"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { apiService } from "@/services/apiService";
import { readSession } from "@/state/auth";
import { useRole } from "@/state/useRole";
import { notifyInfo } from "@/utils/notify";
import { actionFeedback } from "@/utils/actionFeedback";
import { BellaVaultMark } from "@/components/brand/BellaVaultMark";

/** Client-only load avoids a bad Flight/lazy chunk resolving to undefined in dev. */
const ThirtyDayReminders = dynamic(
  () => import("@/components/notifications/ThirtyDayReminders"),
  { ssr: false, loading: () => null }
);

const navItems = [
  { href: "/", label: "Home" },
  { href: "/vault", label: "Vault" },
  { href: "/deals", label: "Deals" },
  { href: "/purchases", label: "Gold purchases" },
  { href: "/sales", label: "Sales" },
  { href: "/borrows", label: "Cash borrows" },
  { href: "/savings", label: "Savings" },
  { href: "/reports", label: "Reports" },
  { href: "/entities", label: "Partners" },
];

export function AppNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user, logout } = useRole();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const menuId = useId();
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => {
      setMobileNav(mq.matches);
      if (!mq.matches) setMenuOpen(false);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen || !mobileNav) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuBtnRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [menuOpen, mobileNav]);

  const drawerInert = mobileNav && !menuOpen;

  async function handleLogout() {
    const session = readSession();
    try {
      if (session?.refreshToken) {
        await apiService.logout(session.refreshToken);
      }
    } catch {
      // best effort logout
    }
    logout();
    actionFeedback.signedOut();
    router.push("/");
  }

  const roleLabel = user?.role ? user.role.replace("_", " ") : "";

  return (
    <nav className="app-nav" aria-label="Main">
      <ThirtyDayReminders />
      <div className="app-nav-start">
        <Link href="/" className="app-nav-brand" aria-label="BellaVault home">
          <img src="/brand/bellavault-logo.svg" alt="" width={200} height={36} className="app-nav-brand__img" />
        </Link>
        <div
          id={menuId}
          className={`app-nav-primary-wrap${menuOpen ? " is-open" : ""}`}
          aria-hidden={drawerInert ? true : undefined}
          inert={drawerInert ? true : undefined}
        >
          <div className="app-nav-links app-nav-links--primary">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? "app-nav-link active" : "app-nav-link"}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
        <button
          ref={menuBtnRef}
          type="button"
          className={`app-nav-menu-btn${menuOpen ? " is-open" : ""}`}
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span className="app-nav-menu-btn__icon" aria-hidden="true">
            <span className="app-nav-menu-btn__bar" />
            <span className="app-nav-menu-btn__bar" />
            <span className="app-nav-menu-btn__bar" />
          </span>
        </button>
      </div>
      {menuOpen && mobileNav ? (
        <div
          className="app-nav-scrim"
          role="presentation"
          onClick={() => {
            setMenuOpen(false);
            menuBtnRef.current?.focus();
          }}
        />
      ) : null}
      <div className="app-nav-end">
        <div className="app-nav-links app-nav-links--account">
          {isAuthenticated ? (
            <>
              <span
                className="app-nav-user"
                title={
                  [user?.fullName, user?.tenantSlug ? `@${user.tenantSlug}` : "", roleLabel ? `(${roleLabel})` : ""]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
              >
                <span className="app-nav-user__name">{user?.fullName}</span>
                {user?.tenantSlug ? <span className="app-nav-user__role"> · {user.tenantSlug}</span> : null}
                {roleLabel ? <span className="app-nav-user__role"> ({roleLabel})</span> : null}
              </span>
              <button type="button" className="app-nav-link" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="app-nav-vault" title="Vault locked — sign in" aria-label="Sign in to unlock BellaVault">
                <BellaVaultMark size={22} />
              </Link>
              <span className="app-nav-user app-nav-user--guest" title="Guest (read-only)">
                <span className="app-nav-user__long">Guest (read-only)</span>
                <span className="app-nav-user__short">Guest</span>
              </span>
              <button
                type="button"
                className="app-nav-link app-nav-link--compact-md"
                aria-label="Guest mode: browse only, more information"
                onClick={() => notifyInfo("Guest mode: browse data only, login to modify.")}
              >
                <span className="app-nav-link__long">Guest Info</span>
                <span className="app-nav-link__short" aria-hidden="true">
                  Info
                </span>
              </button>
              <Link href="/auth/login" className={pathname === "/auth/login" ? "app-nav-link active" : "app-nav-link"}>
                Login
              </Link>
              <Link href="/auth/register" className={pathname === "/auth/register" ? "app-nav-link active" : "app-nav-link"}>
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
