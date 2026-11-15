import fs from 'node:fs';
const src = fs.readFileSync('src/components/gameDeps.ts', 'utf8');
const m = src.match(/BUNDLED_VERSION\s*=\s*['"]([^'"]+)['"]/);
console.log(`\n✦ HuyenBao build — version ${m ? m[1] : 'unknown'} ✦\n`);
