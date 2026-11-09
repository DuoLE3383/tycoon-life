// Static (GitHub Pages) build helper.
// STATIC_EXPORT makes next.config.ts ignore route.ts files, including the
// POST-only LLM endpoint, without moving or modifying source directories.
// On Pages the client oracle transparently falls back to the built-in
// generator (src/lib/story.ts); when self-hosted with `npm run dev`/`start`
// the real LLM endpoint answers.
import { spawnSync } from 'node:child_process';

const r = spawnSync('npx', ['next', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, STATIC_EXPORT: '1' },
  shell: process.platform === 'win32',
});
if (r.status !== 0) process.exitCode = r.status ?? 1;
