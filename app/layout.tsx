import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
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
