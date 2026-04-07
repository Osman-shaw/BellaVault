import "./globals.css";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AppNavigation } from "@/navigations/AppNavigation";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BellaVault Web",
  description: "Minimal web ledger built with Next.js",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={plusJakarta.variable}>
        <AppNavigation />
        <NotificationCenter />
        {children}
      </body>
    </html>
  );
}
