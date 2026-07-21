import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { DEFAULT_THEME, THEME_OPTIONS, THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";

const themeBootstrapScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var v=${JSON.stringify(THEME_OPTIONS.map((theme) => theme.id))};document.documentElement.setAttribute("data-theme",v.indexOf(t)>-1?t:${JSON.stringify(DEFAULT_THEME)})}catch(e){document.documentElement.setAttribute("data-theme",${JSON.stringify(DEFAULT_THEME)})}})()`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ParadeOne",
  description: "A Nackte Company",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <div className="flex-1">{children}</div>
        <footer className="print:hidden border-t border-slate-800/70 bg-slate-950/95 px-4 py-3 text-xs text-slate-300">
          <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link href="/privacy" className="transition hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/terms" className="transition hover:text-white">
              Terms of Service
            </Link>
            <Link href="/sms-terms" className="transition hover:text-white">
              SMS Terms
            </Link>
          </nav>
        </footer>
      </body>
    </html>
  );
}
