import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";
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
    <html lang="en">
      <body className={plusJakarta.variable} suppressHydrationWarning>
        <Script id="hydration-strip-extension-html-attrs" strategy="beforeInteractive">
          {`(function(){try{var el=document.documentElement;var attrs=["data-qb-installed","data-new-gr-c-s-check-loaded","data-gr-ext-installed","data-gramm"];for(var i=0;i<attrs.length;i++){if(el.hasAttribute(attrs[i]))el.removeAttribute(attrs[i]);}}catch(e){}})();`}
        </Script>
        <AppNavigation />
        <NotificationCenter />
        {children}
      </body>
    </html>
  );
}
