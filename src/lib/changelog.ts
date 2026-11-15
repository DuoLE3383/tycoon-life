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
};
