import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LangProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "HuyenBao — build an empire before you turn 90",
  description:
    "HuyenBao is a life-simulation game: start at 18 in your own historical era, work, study, build business chains, trade stocks, get famous on social media, take care of your health and spirit, pay taxes, go to space. Dark & light themes, EN/VI/中文 languages, and an LLM story backend.",
  keywords: ["HuyenBao", "Tycoon Life", "life simulation", "idle game", "LLM", "Next.js", "dark theme"],
  authors: [{ name: "DuoLE3383" }],
  manifest: "manifest.webmanifest",
  icons: {
    icon: [{ url: "icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: "apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#17181d",
};

// Applies the saved theme before first paint (default: dark).
const themeInit = `try{var t=localStorage.getItem('tycoon_theme');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark');}catch(e){document.documentElement.setAttribute('data-theme','dark');}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
