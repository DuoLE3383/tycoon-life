// Verification that the TS port of tarot.ts matches the Python source output
// shape + spread logic. Run with: npx tsx --test src/lib/tarot.test.ts
//
// The Python source uses `secrets.SystemRandom` (cryptographic) so we can't
// compare exact card sequences — but we verify the deck structure (78 cards,
// 22 major + 56 minor, all ids unique), spread layouts, reversal semantics,
// and the "no duplicates in a draw" guarantee.

import { strict as assert } from 'node:assert';
import { deck, drawCards, SPREADS, spreadLabels, TAROT_GHI_CHU, type TarotCard } from './tarot';

const tests: { name: string; fn: () => void }[] = [];
function test(name: string, fn: () => void) { tests.push({ name, fn }); }

// Deterministic RNG for reproducible tests — returns values from a fixed sequence.
function makeRng(seq: number[]): () => number {
  let i = 0;
  return () => seq[i++ % seq.length];
}

// ---- deck construction ----
test('deck: 78 cards total', () => {
  assert.equal(deck().length, 78);
});
test('deck: 22 major arcana (indices 0..21)', () => {
  const d = deck();
  const majors = d.filter(c => c.loai === 'major');
  assert.equal(majors.length, 22);
  // ids are 'major-0' through 'major-21'
  for (let i = 0; i < 22; i++) {
    assert.ok(majors.some(c => c.id === `major-${i}`), `missing major-${i}`);
  }
});
test('deck: 56 minor arcana (4 suits × 14 ranks)', () => {
  const d = deck();
  const minors = d.filter(c => c.loai === 'minor');
  assert.equal(minors.length, 56);
  // 4 suits
  const suits = [...new Set(minors.map(c => c.suit))];
  assert.deepEqual(suits.sort(), ['Cups', 'Pentacles', 'Swords', 'Wands']);
  // 14 ranks per suit
  for (const suit of suits) {
    assert.equal(minors.filter(c => c.suit === suit).length, 14);
  }
});
test('deck: all ids unique', () => {
  const ids = deck().map(c => c.id);
  assert.equal(new Set(ids).size, ids.length);
});
test('deck: major cards have no suit/rank/element', () => {
  for (const c of deck().filter(c => c.loai === 'major')) {
    assert.equal(c.suit, undefined);
    assert.equal(c.suitVn, undefined);
    assert.equal(c.rank, undefined);
    assert.equal(c.element, undefined);
  }
});
test('deck: minor cards have suit + suitVn + rank + element', () => {
  for (const c of deck().filter(c => c.loai === 'minor')) {
    assert.ok(c.suit);
    assert.ok(c.suitVn);
    assert.ok(c.rank);
    assert.ok(c.element);
  }
});
test('deck: first major is The Fool (Kẻ Khờ)', () => {
  const fool = deck().find(c => c.id === 'major-0')!;
  assert.equal(fool.name, 'The Fool');
  assert.equal(fool.vn, 'Kẻ Khờ');
  assert.equal(fool.keyword, 'khởi đầu, tự do, tò mò');
});
test('deck: last major is The World (Thế Giới)', () => {
  const world = deck().find(c => c.id === 'major-21')!;
  assert.equal(world.name, 'The World');
  assert.equal(world.vn, 'Thế Giới');
  assert.equal(world.keyword, 'hoàn tất, hội nhập, mở rộng');
});
test('deck: Ace of Wands has correct shape', () => {
  const card = deck().find(c => c.id === 'wands-ace')!;
  assert.equal(card.loai, 'minor');
  assert.equal(card.name, 'Ace of Wands');
  assert.equal(card.vn, 'Át Gậy');
  assert.equal(card.suit, 'Wands');
  assert.equal(card.suitVn, 'Gậy');
  assert.equal(card.rank, 'Ace');
  assert.equal(card.element, 'Hỏa');
  // keyword = 'khởi đầu; động lực, sáng kiến' (rankKeyword + theme)
  assert.equal(card.keyword, 'khởi đầu; động lực, sáng kiến');
});
test('deck: King of Pentacles has correct shape', () => {
  const card = deck().find(c => c.id === 'pentacles-king')!;
  assert.equal(card.name, 'King of Pentacles');
  assert.equal(card.vn, 'Quốc Vương Tiền');
  assert.equal(card.element, 'Thổ');
  assert.equal(card.keyword, 'làm chủ; nguồn lực, thực tế');
});

// ---- SPREADS constant ----
test('SPREADS: 1/3/5 supported', () => {
  assert.deepEqual(Object.keys(SPREADS).sort(), ['1', '3', '5']);
});
test('SPREADS: position labels match Python source', () => {
  assert.deepEqual(SPREADS[1], ['Thông điệp chính']);
  assert.deepEqual(SPREADS[3], ['Quá khứ', 'Hiện tại', 'Bước tiếp theo']);
  assert.deepEqual(SPREADS[5], ['Tình huống', 'Thách thức', 'Lời khuyên', 'Khả năng', 'Bước tiếp theo']);
});

// ---- drawCards ----
test('drawCards(1) returns 1 card with "Thông điệp chính" position', () => {
  const drawn = drawCards(1, makeRng([0.5, 0.5, 0.5, 0.5]));
  assert.equal(drawn.length, 1);
  assert.equal(drawn[0].viTri, 'Thông điệp chính');
});
test('drawCards(3) returns 3 cards with Quá khứ/Hiện tại/Bước tiếp theo', () => {
  const drawn = drawCards(3, makeRng([0.5, 0.4, 0.6, 0.7, 0.5, 0.5]));
  assert.equal(drawn.length, 3);
  assert.deepEqual(drawn.map(c => c.viTri), ['Quá khứ', 'Hiện tại', 'Bước tiếp theo']);
});
test('drawCards(5) returns 5 cards with correct positions', () => {
  const drawn = drawCards(5, makeRng(Array(20).fill(0.5)));
  assert.equal(drawn.length, 5);
  assert.deepEqual(drawn.map(c => c.viTri), ['Tình huống', 'Thách thức', 'Lời khuyên', 'Khả năng', 'Bước tiếp theo']);
});
test('drawCards: all cards unique (no duplicates)', () => {
  // Run several draws and verify uniqueness within each draw.
  for (const soLa of [1, 3, 5] as const) {
    for (let trial = 0; trial < 10; trial++) {
      const drawn = drawCards(soLa);
      const ids = drawn.map(c => c.id);
      assert.equal(new Set(ids).size, ids.length, `duplicates in draw of ${soLa}`);
    }
  }
});
test('drawCards: each card has id, loai, name, vn, keyword, reversed, viTri', () => {
  const drawn = drawCards(5, makeRng(Array(20).fill(0.5)));
  for (const c of drawn) {
    assert.ok(c.id, 'missing id');
    assert.ok(c.loai, 'missing loai');
    assert.ok(c.name, 'missing name');
    assert.ok(c.vn, 'missing vn');
    assert.ok(c.keyword, 'missing keyword');
    assert.equal(typeof c.reversed, 'boolean', 'reversed must be boolean');
    assert.ok(c.viTri, 'missing viTri');
  }
});
test('drawCards: original deck cards are not mutated (no reversed/viTri on cached deck)', () => {
  // Draw — this adds reversed + viTri to copies, not the cached deck entries.
  drawCards(5, makeRng(Array(20).fill(0.5)));
  const all = deck();
  for (const c of all) {
    assert.equal(c.reversed, undefined, `deck card ${c.id} got reversed leaked`);
    assert.equal(c.viTri, undefined, `deck card ${c.id} got viTri leaked`);
  }
});
test('drawCards: invalid count throws', () => {
  assert.throws(() => drawCards(2 as never, makeRng([0.5])), /1, 3 hoặc 5/);
  assert.throws(() => drawCards(7 as never, makeRng([0.5])), /1, 3 hoặc 5/);
});

// ---- Reversal logic (rng < 0.3 → reversed) ----
test('drawCards: rng always returns 0.0 → all cards reversed', () => {
  // 0.0 < 0.3 → reversed = true
  const drawn = drawCards(5, () => 0);
  assert.ok(drawn.every(c => c.reversed === true));
});
test('drawCards: rng always returns 0.5 → no cards reversed', () => {
  // 0.5 >= 0.3 → reversed = false
  const drawn = drawCards(5, () => 0.5);
  assert.ok(drawn.every(c => c.reversed === false));
});
test('drawCards: rng returns 0.29 → reversed, 0.31 → upright (boundary)', () => {
  // The Python source uses `rng.random() < 0.3`, so 0.29 reverses, 0.31 doesn't.
  // We feed a fixed alternating sequence so both values are sampled for the
  // reversal check (after the Fisher-Yates shuffle consumes its own batch).
  const seq: number[] = [];
  for (let i = 0; i < 200; i++) seq.push(i % 2 === 0 ? 0.29 : 0.31);
  const drawn = drawCards(5, makeRng(seq));
  // We can't predict exactly which cards land on 0.29 vs 0.31 (depends on
  // shuffle draw count), but with 200 alternating values sampled for 5
  // reversals, we should see both states.
  const reversedCount = drawn.filter(c => c.reversed).length;
  const uprightCount = drawn.filter(c => !c.reversed).length;
  assert.ok(reversedCount > 0 && uprightCount > 0, `expected mix of reversed/upright, got ${reversedCount}/${uprightCount}`);
});

// ---- Statistical reversal rate (~30%) ----
test('drawCards: reversal rate is ~30% over 1000 draws', () => {
  let reversed = 0, total = 0;
  for (let i = 0; i < 1000; i++) {
    const drawn = drawCards(5);  // Math.random
    for (const c of drawn) {
      total++;
      if (c.reversed) reversed++;
    }
  }
  const rate = reversed / total;
  // Allow a wide band (0.25 - 0.35) — 5000 samples is still noisy.
  assert.ok(rate > 0.25 && rate < 0.35, `reversal rate ${rate.toFixed(3)} outside [0.25, 0.35]`);
});

// ---- spreadLabels ----
test('spreadLabels: vi returns source labels', () => {
  assert.deepEqual(spreadLabels(3, 'vi'), ['Quá khứ', 'Hiện tại', 'Bước tiếp theo']);
});
test('spreadLabels: en returns English', () => {
  assert.deepEqual(spreadLabels(3, 'en'), ['Past', 'Present', 'Next step']);
});
test('spreadLabels: zh returns Chinese', () => {
  assert.deepEqual(spreadLabels(5, 'zh'), ['处境', '挑战', '建议', '可能', '下一步']);
});

// ---- TAROT_GHI_CHU ----
test('TAROT_GHI_CHU matches Python source', () => {
  assert.equal(TAROT_GHI_CHU, 'Bài rút ngẫu nhiên, chỉ phục vụ tự chiêm nghiệm và giải trí.');
});

// ---- runner ----
let pass = 0, fail = 0;
for (const { name, fn } of tests) {
  try { fn(); pass++; }
  catch (e) {
    fail++;
    console.error(`  ✗ ${name}`);
    console.error('    ' + (e as Error).message);
  }
}
console.log(`\ntarot.test.ts: ${pass}/${tests.length} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
