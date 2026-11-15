// v13.23 A — real CHANGELOG map. Single source of truth for What's New.
// scripts/show-version.mjs reads this file to sync public/version.json,
// so a version bump can never again leave version.json stale at v13.11.
// WhatsNewModal keeps reading version.json (via useGameController),
// so the modal shows exactly what is here.
export interface ChangelogEntry {
  headline: string;
  summary: string;
  features: string[];
}
export const CHANGELOG: Record<string, ChangelogEntry> = {
  'v13.22': {
    headline: 'HuyenBao v13.22 — Assets update + refactored app',
    summary: 'v13.22: Improved asset organization and refactored the application into separate layout, tab, and modal components while preserving game features.',
    features: [
      'Assets: improved organization of owned items and categories',
      'App structure: tabs, layout, and modals are separated into components',
      'Game features and behavior preserved across the refactor',
    ],
  },
  'v13.23': {
    headline: 'HuyenBao v13.23 — Shop first, profit-aware business, clear property costs',
    summary: 'v13.23: In Assets, shopping items now appear before owned items. Business value follows profit, sale offers follow business value. Property costs split into Property tax 1% + Asset upkeep 1% with the same 2% total.',
    features: [
      'Assets: shopping items (buy catalogue + used items) now appear before owned items',
      'Business: business value is profit-aware (paid + 2x annual net, clamped -25% / +50%)',
      'Business: sale offers are based on profit-aware fair value, not raw paid price',
      'Finance: Property tax 1%/yr and Asset upkeep 1%/yr shown as separate lines, total still 2%',
    ],
  },
  'v13.24': {
    headline: 'HuyenBao v13.24 — Travel modal fixed + Vietnamese thousand dots',
    summary: 'v13.24: Travel modal now renders via Portal to document.body so it covers the full viewport instead of being clipped to 34px. All numbers now use Vietnamese thousand-dot grouping (vi-VN), e.g. +$1.602.817.222.',
    features: [
      'Travel: modal rendered via Portal to document.body, full-viewport overlay, no longer clipped or overlapping',
      'Numbers: all numbers use Vietnamese thousand-dot grouping (vi-VN), e.g. +$1.602.817.222',
      'Numbers: fmtFull and all toLocaleString() calls now use vi-VN',
    ],
  },
  'v13.25': {
    headline: 'HuyenBao v13.25 — Travel + More modals fixed with Portal tgame wrapper',
    summary: 'v13.25: Travel and More modals render via Portal to document.body wrapped in .tgame, so they keep full game styling and cover the full viewport instead of being clipped or oversized.',
    features: [
      'Travel: Portal to document.body wrapped in .tgame, full-viewport overlay, icon back to normal size',
      'More: same Portal + .tgame fix for Guide / News / Achievements / Timeline / Log popup',
      'Modals: no longer clipped to 34px or overlapping Tips / footer',
    ],
  },
  'v13.26': {
    headline: 'HuyenBao v13.26 — Elliott guide in Market',
    summary: 'v13.26: Market tab now has a local Elliott Wave investment guide above the companion-app link: impulse 1-2-3-4-5, corrective A-B-C, and capital rules. No external API, no iframe. SpiritTab unchanged.',
    features: [
      'Market: local Elliott Wave guide panel above the companion-app link',
      'Market: impulse 1-2-3-4-5, corrective A-B-C, and capital / take-profit / stop-loss rules',
      'Ecosystem: Elliott stays in Market, mysticism stays in Tam Linh, no Hub',
    ],
  },
};
