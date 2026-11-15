import fs from 'node:fs';
const src = fs.readFileSync('src/components/gameDeps.ts', 'utf8');
const m = src.match(/BUNDLED_VERSION\s*=\s*['"]([^'"]+)['"]/);
const ver = m ? m[1] : 'unknown';
console.log(`\n✦ HuyenBao build — version ${ver} ✦\n`);
// v13.23 A — version.json is synced from src/lib/changelog.ts (single source).
// No more regex-replacing v-numbers in headline/summary, no more stale
// "Version bumped to v13.11" features. If CHANGELOG has no entry for ver,
// keep the existing version.json content and only sync the version number.
try {
  const pj = 'public/version.json';
  const j = JSON.parse(fs.readFileSync(pj, 'utf8'));
  const cl = fs.readFileSync('src/lib/changelog.ts', 'utf8');
  const block = cl.match(new RegExp(`['"]${ver.replace('.', '\\.')}['"]\\s*:\\s*\\{([\\s\\S]*?)\\},?\\s*\\n\\s*\\}`));
  const getStr = (key) => {
    const mm = block ? block[1].match(new RegExp(key + `:\\s*'([^']*)'`)) : null;
    return mm ? mm[1] : null;
  };
  const headline = getStr('headline');
  const summary = getStr('summary');
  let features = null;
  if (block) {
    const fm = block[1].match(/features:\s*\[([\s\S]*?)\]/);
    if (fm) features = [...fm[1].matchAll(/'([^']*)'/g)].map(x => x[1]);
  }
  j.version = ver;
  j.releasedAt = new Date().toISOString().slice(0, 10);
  if (headline) j.headline = headline;
  if (summary) j.summary = summary;
  if (features) j.features = features;
  fs.writeFileSync(pj, JSON.stringify(j, null, 2) + '\n');
  console.log(`✦ version.json synced → ${ver} from CHANGELOG ✦`);
} catch (e) { console.log('version.json sync skipped:', e.message); }
