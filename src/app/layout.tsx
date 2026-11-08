import type { Metadata } from "next";
import "./globals.css";
import { LangProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Tycoon Life — live a whole century of business",
  description:
    "A life-simulation game: start at 18 in your own historical era, work, study, build business chains, trade stocks, get famous on social media, pay taxes, go to space. With an LLM story backend and EN/VI/中文 languages.",
  keywords: ["Tycoon Life", "life simulation", "idle game", "LLM", "Next.js"],
  authors: [{ name: "DuoLE3383" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
