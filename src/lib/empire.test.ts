import assert from 'node:assert/strict';
import test from 'node:test';
import { fresh, begin, donate, netWorth, worldYear, migrate, yearEnd, bizMultiplier, actDeclareAutonomy, actCourtRecognition, actDeclareIndependence } from './engine';
import {
  ENTITY_TIERS, CONSTITUTIONS, constitutionById, freshEntity, entityTierOf,
  qualifiedEntityTier, nextEntityTier, declareIndependence, declareAutonomy,
  courtRecognition, autoPromoteConglomerate, tickEntity,
  type EntityTier, type Constitution,
} from './empire';

test('v11.5: ENTITY_TIERS has 6 entries (none + 5 tiers)', () => {
  assert.equal(ENTITY_TIERS.length, 6);
  assert.equal(ENTITY_TIERS[0].tier, 'none');
  assert.equal(ENTITY_TIERS[1].tier, 'conglomerate');
  assert.equal(ENTITY_TIERS[2].tier, 'autonomous');
  assert.equal(ENTITY_TIERS[3].tier, 'nation');
  assert.equal(ENTITY_TIERS[4].tier, 'empire');
  assert.equal(ENTITY_TIERS[5].tier, 'federation');
});

test('v11.5: each tier has thresholds that increase monotonically', () => {
  for (let i = 1; i < ENTITY_TIERS.length - 1; i++) {
    assert.ok(ENTITY_TIERS[i].minNetWorth < ENTITY_TIERS[i + 1].minNetWorth,
      `tier ${i} nw ${ENTITY_TIERS[i].minNetWorth} should be < tier ${i + 1} ${ENTITY_TIERS[i + 1].minNetWorth}`);
    assert.ok(ENTITY_TIERS[i].minInfluence <= ENTITY_TIERS[i + 1].minInfluence,
      `tier ${i} influence ${ENTITY_TIERS[i].minInfluence} should be <= tier ${i + 1} ${ENTITY_TIERS[i + 1].minInfluence}`);
  }
});

test('v11.5: CONSTITUTIONS has 4 entries with distinct bizMult + taxRate', () => {
  assert.equal(CONSTITUTIONS.length, 4);
  const ids = CONSTITUTIONS.map(c => c.id);
  assert.deepEqual(ids.sort(), ['authoritarian', 'corporatist', 'democratic', 'technocratic']);
  // corporatist has the highest bizMult
  const corp = constitutionById('corporatist');
  assert.equal(corp.bizMult, 1.20);
  assert.equal(corp.taxRate, 0.15);
  // authoritarian has the lowest bizMult but lowest military upkeep
  const auth = constitutionById('authoritarian');
  assert.equal(auth.bizMult, 0.90);
  assert.equal(auth.militaryUpkeepMult, 0.7);
  // democratic has no closure risk
  assert.equal(constitutionById('democratic').closureRisk, 0);
});

test('v11.5: constitutionById returns the right constitution by id', () => {
  assert.equal(constitutionById('corporatist').id, 'corporatist');
  assert.equal(constitutionById('democratic').id, 'democratic');
  assert.equal(constitutionById('authoritarian').id, 'authoritarian');
  assert.equal(constitutionById('technocratic').id, 'technocratic');
});

test('v11.5: freshEntity returns a clean state with sensible defaults', () => {
  const e = freshEntity();
  assert.equal(e.tier, 'none');
  assert.equal(e.declaredDay, 0);
  assert.equal(e.recognition, 0);
  assert.equal(e.currency, 'USD');
  assert.equal(e.inflation, 0);
  assert.equal(e.constitution, null);
  assert.equal(e.originNation, null);
});

test('v11.5: entityTierOf reads GameState and returns the current tier', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  assert.equal(entityTierOf(s), 'none');
  s.entity.tier = 'conglomerate';
  assert.equal(entityTierOf(s), 'conglomerate');
  s.entity.tier = 'nation';
  assert.equal(entityTierOf(s), 'nation');
});

test('v11.5: autoPromoteConglomerate triggers when net worth ≥ $1M', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.entity = freshEntity();
  let logs: string[] = [];
  // Below threshold
  s.money = 500_000;
  assert.equal(autoPromoteConglomerate(s, netWorth(s), m => logs.push(m)), false);
  assert.equal(s.entity.tier, 'none');
  // Cross $1M
  s.money = 1_500_000;
  const r = autoPromoteConglomerate(s, netWorth(s), m => logs.push(m));
  assert.equal(r, true);
  assert.equal(s.entity.tier, 'conglomerate');
  assert.equal(s.entity.declaredDay, s.lastDay);
  assert.ok(logs.some(l => l.includes('conglomerate')));
  // Already conglomerate — no re-trigger
  s.money = 5_000_000;
  const r2 = autoPromoteConglomerate(s, netWorth(s), m => logs.push(m));
  assert.equal(r2, false);
});

test('v11.5: declareAutonomy requires conglomerate + $50M + 50 influence', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.entity = freshEntity();
  s.entity.tier = 'conglomerate';
  let logs: string[] = [];
  // Wrong tier
  s.entity.tier = 'none';
  assert.equal(declareAutonomy(s, 100_000_000, 100, m => logs.push(m)).ok, false);
  s.entity.tier = 'conglomerate';
  // No net worth
  assert.equal(declareAutonomy(s, 10_000_000, 100, m => logs.push(m)).ok, false);
  // No influence
  assert.equal(declareAutonomy(s, 100_000_000, 30, m => logs.push(m)).ok, false);
  // Success
  const r = declareAutonomy(s, 60_000_000, 60, m => logs.push(m));
  assert.equal(r.ok, true);
  assert.equal(s.entity.tier, 'autonomous');
  assert.equal(s.entity.originNation, 'Vietnam');
  assert.ok(logs.some(l => l.includes('Autonomy declared')));
});

test('v11.5: courtRecognition requires autonomous tier + 30 influence', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.entity = freshEntity();
  let logs: string[] = [];
  // Wrong tier
  s.entity.tier = 'conglomerate';
  assert.equal(courtRecognition(s, 100, m => logs.push(m)).ok, false);
  // Autonomous tier
  s.entity.tier = 'autonomous';
  assert.equal(courtRecognition(s, 30, m => logs.push(m)).ok, true);
  assert.equal(s.entity.recognition, 1);
  assert.ok(logs.some(l => l.includes('recognition')));
  // No influence
  assert.equal(courtRecognition(s, 20, m => logs.push(m)).ok, false);
  // Cap at 12
  s.entity.recognition = 12;
  assert.equal(courtRecognition(s, 100, m => logs.push(m)).ok, false);
  assert.equal(courtRecognition(s, 100, m => logs.push(m)).reason, 'maxRecognition');
});

test('v11.5: declareIndependence requires autonomous + $500M + 200 infl + recognition 3', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.entity = freshEntity();
  let logs: string[] = [];
  // Wrong tier
  s.entity.tier = 'conglomerate';
  assert.equal(declareIndependence(s, 1e9, 300, 'democratic', 'NEW', m => logs.push(m)).ok, false);
  // Autonomous but missing other reqs
  s.entity.tier = 'autonomous';
  assert.equal(declareIndependence(s, 100e6, 300, 'democratic', 'NEW', m => logs.push(m)).ok, false);
  assert.equal(declareIndependence(s, 1e9, 100, 'democratic', 'NEW', m => logs.push(m)).ok, false);
  s.entity.recognition = 2;
  assert.equal(declareIndependence(s, 1e9, 300, 'democratic', 'NEW', m => logs.push(m)).ok, false);
  // All reqs met
  s.entity.recognition = 3;
  const r = declareIndependence(s, 600e6, 250, 'technocratic', 'ACM', m => logs.push(m));
  assert.equal(r.ok, true);
  assert.equal(s.entity.tier, 'nation');
  assert.equal(s.entity.constitution, 'technocratic');
  assert.equal(s.entity.currency, 'ACM');
  assert.equal(s.entity.inflation, 0.02);
  assert.ok(logs.some(l => l.includes('Independence declared')));
});

test('v11.5: declareIndependence uppercases + slices currency to 3 chars', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.entity = freshEntity();
  s.entity.tier = 'autonomous';
  s.entity.recognition = 3;
  declareIndependence(s, 600e6, 250, 'democratic', 'new', () => {});
  assert.equal(s.entity.currency, 'NEW');
  // Empty falls back to 'NEW'
  s.entity.tier = 'autonomous';
  s.entity.recognition = 3;
  declareIndependence(s, 600e6, 250, 'democratic', '', () => {});
  assert.equal(s.entity.currency, 'NEW');
  // Long string → first 3 chars uppercased
  s.entity.tier = 'autonomous';
  s.entity.recognition = 3;
  declareIndependence(s, 600e6, 250, 'democratic', 'acmeCoin', () => {});
  assert.equal(s.entity.currency, 'ACM');
});

test('v11.5: tickEntity auto-promotes conglomerate + applies inflation erosion at nation+ tiers', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.entity = freshEntity();
  let logs: string[] = [];
  // Cross $1M → promote
  s.money = 2_000_000;
  const r1 = tickEntity(s, netWorth(s), m => logs.push(m));
  assert.equal(r1.promotedTo, 'conglomerate');
  assert.equal(s.entity.tier, 'conglomerate');
  // At conglomerate tier, no inflation (uses host currency)
  s.money = 5_000_000;
  const r2 = tickEntity(s, netWorth(s), m => logs.push(m));
  assert.equal(r2.inflationErosion, 0);
  // Promote to nation manually, set inflation 5%
  s.entity.tier = 'nation';
  s.entity.inflation = 0.05;
  s.money = 10_000_000;
  const r3 = tickEntity(s, netWorth(s), m => logs.push(m));
  assert.equal(r3.inflationErosion, 500_000, `expected 5% erosion = 500_000, got ${r3.inflationErosion}`);
  assert.equal(s.money, 10_000_000 - 500_000);
});

test('v11.5: actDeclareAutonomy wrapper integrates with engine pushLog', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power.influence = 100;
  s.money = 60_000_000;
  s.entity.tier = 'conglomerate';
  const r = actDeclareAutonomy(s);
  assert.equal(r.ok, true);
  assert.equal(s.entity.tier, 'autonomous');
  assert.ok(s.log.some(l => l.includes('Autonomy declared')));
});

test('v11.5: actCourtRecognition deducts 30 influence on success', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power.influence = 100;
  s.entity.tier = 'autonomous';
  const r = actCourtRecognition(s);
  assert.equal(r.ok, true);
  assert.equal(s.power.influence, 70);
  assert.equal(s.entity.recognition, 1);
  // Refuses when insufficient influence
  s.power.influence = 20;
  const r2 = actCourtRecognition(s);
  assert.equal(r2.ok, false);
  assert.equal(r2.reason, 'noInfluence');
  assert.equal(s.power.influence, 20, 'influence preserved on refusal');
});

test('v11.5: actDeclareIndependence passes constitution + currency through', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power.influence = 300;
  s.money = 700_000_000;
  s.entity.tier = 'autonomous';
  s.entity.recognition = 3;
  const r = actDeclareIndependence(s, 'corporatist', 'ACM');
  assert.equal(r.ok, true);
  assert.equal(s.entity.tier, 'nation');
  assert.equal(s.entity.constitution, 'corporatist');
  assert.equal(s.entity.currency, 'ACM');
});

test('v11.5: bizMultiplier stacks constitution bizMult on top of everything', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.deg.business = 1;
  s.fame = 10;
  s.money = 12_000_000;
  const baseline = bizMultiplier(s); // no constitution → democratic default 1.0
  // Apply corporatist
  s.entity.constitution = 'corporatist';
  const corp = bizMultiplier(s);
  assert.ok(Math.abs(corp / baseline - 1.20) < 1e-6, `expected +20%, got ${corp / baseline}`);
  // Apply authoritarian
  s.entity.constitution = 'authoritarian';
  const auth = bizMultiplier(s);
  assert.ok(Math.abs(auth / baseline - 0.90) < 1e-6, `expected -10%, got ${auth / baseline}`);
});

test('v11.5: yearEnd promotes to conglomerate when net worth crosses $1M', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.money = 1_500_000;
  yearEnd(s, 30, () => 0.5);
  assert.equal(s.entity.tier, 'conglomerate');
  assert.ok(s.log.some(l => l.includes('conglomerate')));
});

test('v11.5: migrate() backfills the entity state on old saves', () => {
  const state = migrate({
    schemaVersion: 4, money: 50_000_000, level: 7,
    // No entity field on the old save
  });
  assert.ok(state.entity, 'entity field backfilled');
  assert.equal(state.entity.tier, 'none');
  assert.equal(state.entity.recognition, 0);
  assert.equal(state.entity.currency, 'USD');
});

test('v11.5: migrate() preserves partial entity state on saves that already have it', () => {
  const state = migrate({
    schemaVersion: 4, money: 50_000_000,
    entity: { tier: 'nation', declaredDay: 100, recognition: 5, currency: 'ACM', inflation: 0.05, constitution: 'technocratic', originNation: 'Vietnam' },
  });
  assert.equal(state.entity.tier, 'nation');
  assert.equal(state.entity.recognition, 5);
  assert.equal(state.entity.currency, 'ACM');
  assert.equal(state.entity.constitution, 'technocratic');
  assert.equal(state.entity.originNation, 'Vietnam');
});

test('v11.5: qualifiedEntityTier computes the highest tier qualified for', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.entity = freshEntity();
  // Below all thresholds
  assert.equal(qualifiedEntityTier(s, 100_000, 0), 'none');
  // ≥$1M → conglomerate
  assert.equal(qualifiedEntityTier(s, 1_500_000, 0), 'conglomerate');
  // ≥$50M + 50 infl → autonomous
  assert.equal(qualifiedEntityTier(s, 60_000_000, 60), 'autonomous');
  // ≥$500M + 200 infl + recognition 3 → nation
  s.entity.recognition = 3;
  assert.equal(qualifiedEntityTier(s, 600_000_000, 250), 'nation');
  // ≥$500M + 200 infl but recognition < 3 → still autonomous
  s.entity.recognition = 2;
  assert.equal(qualifiedEntityTier(s, 600_000_000, 250), 'autonomous');
});

test('v11.5: nextEntityTier returns the next tier with its threshold; null at top', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.entity = freshEntity();
  s.entity.tier = 'none';
  const r1 = nextEntityTier(s);
  assert.ok(r1);
  assert.equal(r1!.tier, 'conglomerate');
  s.entity.tier = 'autonomous';
  const r2 = nextEntityTier(s);
  assert.ok(r2);
  assert.equal(r2!.tier, 'nation');
  // At nation tier — next is empire which is gated → null for v11.5
  s.entity.tier = 'nation';
  assert.equal(nextEntityTier(s), null);
});
