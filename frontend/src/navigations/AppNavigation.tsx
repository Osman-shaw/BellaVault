"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiService } from "@/services/apiService";
import { readSession } from "@/state/auth";
import { useRole } from "@/state/useRole";
import { notifyInfo, notifySuccess } from "@/utils/notify";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/vault", label: "Vault" },
  { href: "/deals", label: "Deals" },
  { href: "/purchases", label: "Gold purchases" },
  { href: "/sales", label: "Sales" },
  { href: "/borrows", label: "Cash borrows" },
  { href: "/reports", label: "Reports" },
  { href: "/entities", label: "Partners" },
];

export function AppNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user, logout } = useRole();

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
    notifySuccess("You are logged out.");
    router.push("/");
  }

  return (
    <nav className="app-nav">
      <div className="app-nav-links">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={active ? "app-nav-link active" : "app-nav-link"}>
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="app-nav-links">
        {isAuthenticated ? (
          <>
            <span style={{ fontSize: 14, color: "#475569", alignSelf: "center" }}>
              {user?.fullName} ({user?.role.replace("_", " ")})
            </span>
            <button className="app-nav-link" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <span style={{ fontSize: 14, color: "#475569", alignSelf: "center" }}>Guest (read-only)</span>
            <button className="app-nav-link" onClick={() => notifyInfo("Guest mode: browse data only, login to modify.")}>
              Guest Info
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
    </nav>
  );
}
