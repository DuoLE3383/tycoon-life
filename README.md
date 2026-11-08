# MOGUL

**MOGUL** (trước đây là *Tycoon Life*) — a life-simulation game: start at 18 in **your own historical era** (birth year + 18),
work gigs, study, build business chains across regions, supply factories from your
farm, trade stocks, get famous on social media, pay taxes, donate to charity —
and in the late game, take your empire **into space**.

▶ **Play:** <https://duole3383.github.io/tycoon-life/>

Languages: **English · Tiếng Việt · 中文** — pick it right in the **welcome popup**, or switch anytime in the header.

Themes: **dark** (default) & **light** — toggle with the ☀/☾ button in the header.

---

## Features

- **Two-level navigation (v9)** — 13 tabs grouped into 6 sections arranged as a
  life pipeline: **Đời sống/Life** (Home, Health, Mind & spirit) → **Tri thức/Growth**
  (Education, Jobs) → **Đế chế/Empire** (Business, Space) → **Tài sản/Wealth**
  (Stocks, Bank, Shop) → **Quan hệ/Network** (Social, Clubs) → **Thế giới/World**
  (Ranking, Links). Each group remembers your last sub-tab.
- **Links tab (v9)** — a live systems map (SVG): 13 nodes with real-time values and
  16 arrows showing **direct** (solid) and **indirect** (dashed) effects between
  systems, plus a formula table with each link's current numeric effect.
- **Character creation** — name, birth year (1900 → today−18), country, up to 3
  interests and 2 talents. Your birth year decides the era you play in and your
  start year (`birth year + 18`). Language is chosen in the same popup.
- **Dark & light themes** — a calm, neutral night palette by default; the header
  ☀/☾ toggle flips the whole UI and remembers your choice.
- **Separate Jobs & Education tabs** — careers in one tab, degrees & licences in
  their own tab.
- **Health** — health declines with age (faster after 45 and 75). Work out,
  get doctor check-ups and keep a healthy diet; weak characters earn less from
  gigs, and health reaching zero ends the run early.
- **Mind & spirit** — meditate, temple offerings and silent retreats raise
  spirit & karma. Inner peace (70+) gives ×1.10 business income and slows
  aging; cosmic alignment (80+) boosts space ventures ×1.25. Charity, weddings
  and grief all move your spirit too.
- **Era-driven world** — real historical headlines (1920–2026) plus era events that
  hit the economy directly: the 1929 crash halves stocks, 1973/1979 oil shocks,
  1987 Black Monday, 2008 GFC, 2020 pandemic, 2022 AI boom…
- **Quick gigs** — watch an ad (yes, really), deliver food, freelance, tutor,
  post sponsored content (needs followers) or take consulting calls. Each has a
  cooldown in game days.
- **Levels & XP** — earn XP from everything you do; each level adds **+2% income**.
- **Business chains** — every purchase opens a *branch in a named region*
  (Old Town walking street, University quarter…). Each branch has a local mood:
  branches can boom… or run at a loss. The next branch always costs 35% more.
- **Farm ⇄ factory supply chain** — farm lines (crops, dairy, orchards,
  aquaculture, hydroponics, agrivoltaics) unlock by era year; food factory lines
  pay **+30%** when your farm supplies them; EV plant needs the Assembly line.
- **Stocks** — quantity input, **green Buy / red Sell**, sparkline charts, prices
  move every 3 seconds.
- **Shop** — grouped category tiles with a popup catalogue per category.
- **Social media** — posts, likes, followers, a blue check at 100k followers,
  monthly **ad revenue**, and a follower-driven sponsored-post gig.
- **Clubs** — 6 elite clubs or found your own ($250k, needs $1M net worth).
- **Bank, taxes & charity** — savings 2%/yr, loans up to 50% of net worth at 6%/yr,
  progressive income tax (0/15/25/35%, first $20k free) billed every 1 January,
  donations that raise **fame** (fame boosts business income and attracts followers).
- **Ranking boards** — richest overall, **young & rich** (under 35), **industry
  leaders**, **richest by nation** — 26 simulated rivals.
- **The cosmic frontier** 🚀 — from **level 6** and the right era onward, found
  space ventures: satellite leasing (2000s), orbital tourism (2025+), asteroid
  mining (2040+), lunar helium-3 (2055+), Mars colony supply (2070+). A serious
  income stream that supplements jobs and businesses.
- **AI life twists** — the oracle writes a brand-new chapter of your life tailored
  to your era/wealth/family, remembering past twists so it never repeats.
  * On GitHub Pages it runs on the built-in story engine (offline, no key needed).
  * Self-hosted (`npm run dev` / `npm start`) it calls the real LLM backend at
    `POST /api/story` (z-ai-web-dev-sdk) with a local fallback.

## Tech

Next.js 16 (App Router, TypeScript) · React 19 · Tailwind 4 · static export for
GitHub Pages · npm only (no Bun).

## Run locally with npm

```bash
npm install
npm run dev          # http://localhost:3000 — full LLM story backend
```

Production self-host:

```bash
npm run build        # server build (keeps /api/story)
npm start
```

Static build (what GitHub Pages deploys — no server, oracle uses the local engine):

```bash
npm run build:static # → ./out
```

## Deployment

`.github/workflows/deploy.yml` builds the static export with npm and deploys the
`out/` folder to GitHub Pages on every push to `main`.

## Project layout

```
src/app/page.tsx        all game UI (6 grouped sections, 14 sub-tabs, links map)
src/app/api/story/      LLM story endpoint (self-hosted)
src/lib/engine.ts       game engine (economy, time, events, gigs, levels, social, space, health & spirit)
src/lib/gameData.ts     data: nav groups, businesses, items, stocks, jobs, space lines, history
src/lib/story.ts        built-in story generator (static fallback)
src/lib/i18n.tsx        EN / VI / ZH dictionaries + switcher
src/lib/art.tsx         SVG symbol art (neutral palette)
public/img/             AI-generated photography (hero, business categories, space)
```

## Version history

- **v9** — app renamed **MOGUL**, **two-level navigation** (6 groups × 14 sub-tabs,
  ordered as a life pipeline, each group remembers the last sub-tab), new
  **Links tab**: live SVG systems map with 13 nodes & 16 direct/indirect arrows
  plus a formula table showing every link's current numeric effect; fixed the
  duplicated age-track labels.

- **v8.1** — **dark theme** (default) with header ☀/☾ toggle, **language picker
  in the welcome popup**, **Jobs and Education split into separate tabs**, new
  **Health** and **Mind & spirit** systems (work out / check-ups / diet,
  meditation / temple / retreats, karma, spirit-powered income perks,
  death by poor health), burnout & monastery life events.
- **v8** — webapp moved to repo root (classic `index.html` retired), npm replaces
  bun, EN/VI/中文, gigs replace the single side hustle, level/XP system, social
  media with followers & ad revenue, cosmic frontier ventures, detailed but
  grouped Home tab, neutral visual redesign with generated photography.
- **v7** — business chains by region, farm/factory supply chain, bank/taxes/
  charity/fame, 4 ranking boards, character creation, stock quantity + colors,
  React webapp with LLM story backend.
- **v5–v6** — bug fixes: life-event modal never opening mid-game (frozen game),
  unaffordable-event deadlock, stock quantity input losing focus.
