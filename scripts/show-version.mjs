import fs from 'node:fs';
const src = fs.readFileSync('src/components/gameDeps.ts', 'utf8');
const m = src.match(/BUNDLED_VERSION\s*=\s*['"]([^'"]+)['"]/);
const ver = m ? m[1] : 'unknown';
console.log(`\n✦ HuyenBao build — version ${ver} ✦\n`);
// v13.22 — FIX stale what's-new: show-version runs on every prebuild, so it
// is the single place that syncs public/version.json to BUNDLED_VERSION.
// Previously only release.sh wrote version.json, manual bumps left it at
// v13.11 while the bundle was v13.21 → modal showed v13.11 forever.
try {
  const pj = 'public/version.json';
  const j = JSON.parse(fs.readFileSync(pj, 'utf8'));
  if (j.version !== ver) {
    j.version = ver;
    j.releasedAt = new Date().toISOString().slice(0, 10);
    if (typeof j.headline === 'string') j.headline = j.headline.replace(/v\d+\.\d+/, ver);
    if (typeof j.summary === 'string') j.summary = j.summary.replace(/v\d+\.\d+/, ver);
    fs.writeFileSync(pj, JSON.stringify(j, null, 2) + '\n');
    console.log(`✦ version.json synced → ${ver} ✦`);
  }
} catch (e) { console.log('version.json sync skipped:', e.message); }
