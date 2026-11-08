# Tycoon Life

A text life-simulation game: you start at 18 (your birth year + 18), build jobs, degrees,
business empires, trade stocks, join clubs, pay taxes, donate to charity and chase fame —
while real historical events reshape the economy around you.

**Two editions live in this repo:**

| Edition | Path | Tech | Where it runs |
| --- | --- | --- | --- |
| Classic single-file | `index.html` | Vanilla JS, zero build | GitHub Pages — <https://duole3383.github.io/tycoon-life/> |
| React + LLM | `webapp/` | Next.js 16, TypeScript, Tailwind 4, z-ai-web-dev-sdk | Run locally / deploy to Vercel |

---

## What's inside the game

- **Character creation** — name, birth year (1900 → today−18), country, up to 3 interests and
  2 talents. Your birth year decides the era you play in and your start year (`birth year + 18`).
- **Era-driven world** — historical headlines from 1920 to 2026 plus era names (Roaring Twenties,
  Great Depression, WWII, Dot-com boom, GFC, AI revolution…). Era events hit the economy
  directly: the 1929 crash halves stocks, 1973/1979 oil shocks spike OIL, 1987 Black Monday,
  2008 GFC, 2020 pandemic, 2022 AI boom, and more.
- **Business chains** — every purchase opens a *branch in a named region* (Old Town walking
  street, University quarter, Harbor promenade…). Each branch has a local mood that drifts
  monthly: branches can boom… or run at a loss.
- **Farm & factory supply chain** — farm expansion lines (dairy, orchard, aquaculture,
  hydroponics, agrivoltaics) unlock by era year; factory production lines (cannery, textile,
  appliances, solar, EV, semiconductor) require a factory branch, and food lines pay +30% when
  your farm supplies them. EV line needs the Assembly line upstream.
- **Stocks** — quantity input + **green Buy / red Sell** buttons, sparkline charts, prices move
  every 3 seconds.
- **Shop** — grouped category tiles with a popup catalogue per category.
- **Clubs** — join 6 elite clubs or **found your own** ($250k, needs $1M net worth, ×1.2 income).
- **Bank, taxes, charity & fame** — savings with 2%/yr interest, loans up to 50% of net worth at
  6%/yr, progressive income tax (0/15/25/35%, first $20k free) billed every 1 January, charity
  donations that raise **fame** (fame boosts business income up to +20% and fades each birthday).
- **Ranking boards** — richest overall, **young & rich** (under 35), **industry leaders**, and
  **richest by nation** — 26 simulated rivals with ages, countries and industries.
- **AI life twists** — an oracle button that asks the LLM backend to write a brand-new chapter
  of your life, tailored to your exact era/wealth/family, never repeating previous twists.

## Run the React + LLM edition

```bash
cd webapp
bun install        # or npm install
bun run dev        # http://localhost:3000
```

The story endpoint is `POST /api/story`. It uses `z-ai-web-dev-sdk` server-side and always
returns a valid event JSON — if the LLM is unreachable it falls back to a local generator, so
the game never breaks.

## Classic edition

Open `index.html` — no build, saves to `localStorage`. The AI oracle button calls `/api/story`
when the React app (or any backend) serves it, and silently falls back to a local tale
otherwise, so the game stays fully playable on GitHub Pages.

## Bug-fix history (v5 → v7)

1. **Frozen-game bug**: mid-game life events were rolled but their modal never opened, halting
   the game forever around age 19–20. Now the modal opens as soon as an event rolls.
2. **Unaffordable-event deadlock**: events whose every choice cost money could lock the modal
   with no clickable option. When nothing is affordable, all choices unlock.
3. **Input-loss fix**: stock quantity keeps its value across re-renders.
