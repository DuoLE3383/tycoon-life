// Static (GitHub Pages) build helper.
// Route handlers with POST cannot be exported statically, so /api/story is
// temporarily stashed for the export build and restored right after.
// On Pages the client oracle transparently falls back to the built-in
// generator (src/lib/story.ts); when self-hosted with `npm run dev`/`start`
// the real LLM endpoint answers.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const API_DIR = path.join('src', 'app', 'api');
const STASH = path.join('.next-api-stash');

function stash() {
  if (fs.existsSync(API_DIR)) {
    fs.renameSync(API_DIR, STASH);
    console.log('[static-build] stashed src/app/api (no server on Pages)');
  }
}
function restore() {
  if (fs.existsSync(STASH)) {
    fs.renameSync(STASH, API_DIR);
    console.log('[static-build] restored src/app/api');
  }
}

stash();
try {
  const r = spawnSync('npx', ['next', 'build'], {
    stdio: 'inherit',
    env: { ...process.env, STATIC_EXPORT: '1' },
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) process.exitCode = r.status ?? 1;
} finally {
  restore();
}
