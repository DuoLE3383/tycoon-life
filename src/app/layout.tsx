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

// Applies the saved theme (and lang, for SEO/accessibility) before first paint.
// React marks <html>/<body> with suppressHydrationWarning so the inline script
// can safely mutate attributes that React will later manage — see LangProvider
// in @/lib/i18n for the matching useSyncExternalStore that fixes React #418.
const themeInit = `try{var t=localStorage.getItem('tycoon_theme');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark');}catch(e){document.documentElement.setAttribute('data-theme','dark');}try{var l=localStorage.getItem('tycoon_lang');document.documentElement.setAttribute('lang',(l==='vi'||l==='zh')?l:'en');}catch(e){document.documentElement.setAttribute('lang','en');}`;

// v13.80 — opt-in overflow diagnostic. OFF by default; enable with
// ?dbgov=1 or localStorage.setItem('tycoon_dbgov','1') then reload.
// After 3s it finds elements wider than the viewport (excluding ones
// inside horizontal-scroll containers) and stores a report in
// localStorage 'tycoon_dbgov_report' + console — so a phone-only user
// can paste the JSON back instead of guessing what overflows.
const dbgovInit = `try{var on=location.search.indexOf('dbgov=1')>-1;if(on)localStorage.setItem('tycoon_dbgov','1');else{var f=localStorage.getItem('tycoon_dbgov');if(f==='0')on=false;else if(f==='1')on=true;}if(on){var scan=function(){var vw=document.documentElement.clientWidth;var sc=function(el){var p=el.parentElement;while(p&&p!==document.body){var cs=getComputedStyle(p);if((cs.overflowX==='auto'||cs.overflowX==='scroll')&&p.scrollWidth>p.clientWidth+1)return true;p=p.parentElement;}return false;};var bad=[];document.querySelectorAll('body *').forEach(function(el){var r=el.getBoundingClientRect();if(r.width>0&&r.right>vw+1&&!sc(el)){bad.push({tag:el.tagName,cls:String(el.className).slice(0,60),right:Math.round(r.right),width:Math.round(r.width),text:(el.textContent||'').trim().slice(0,40)});}});var rep={url:location.href,vw:vw,scrollW:document.documentElement.scrollWidth,found:bad.length,items:bad.slice(0,30),at:new Date().toISOString()};try{localStorage.setItem('tycoon_dbgov_report',JSON.stringify(rep,null,1));}catch(e){}if(bad.length)console.table(bad.slice(0,20));};setTimeout(scan,3000);setTimeout(scan,6000);}}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <script dangerouslySetInnerHTML={{ __html: dbgovInit }} />
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
