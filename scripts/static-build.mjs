// Static (GitHub Pages) build helper.
// STATIC_EXPORT makes next.config.ts ignore route.ts files, including the
// POST-only LLM endpoint, without moving or modifying source directories.
// On Pages the client oracle transparently falls back to the built-in
// generator (src/lib/story.ts); when self-hosted with `npm run dev`/`start`
// the real LLM endpoint answers.
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const r = spawnSync('npx', ['next', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, STATIC_EXPORT: '1' },
  shell: process.platform === 'win32',
});
if (r.status !== 0) process.exitCode = r.status ?? 1;

// The game now lives at https://huyenbao.com/ (custom-domain root). Keep the
// legacy GitHub Pages URL working: anything that still lands on
// .../tycoon-life/ gets redirected to the canonical root.
try {
  mkdirSync('out/tycoon-life', { recursive: true });
  writeFileSync(
    'out/tycoon-life/index.html',
    `<!doctype html><meta charset="utf-8">
<title>MOGUL moved</title>
<meta http-equiv="refresh" content="0;url=/">
<link rel="canonical" href="https://huyenbao.com/">
<script>location.replace('/');</script>
<p style="font:16px/1.5 system-ui;padding:24px">MOGUL now lives at <a href="/">huyenbao.com</a> — redirecting…</p>
`,
  );
} catch (e) {
  console.error('redirect stub failed:', e);
}
