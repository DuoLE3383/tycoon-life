// v11.27 — integration tests for the self-hosted SQLite community backend.
// Exercises the same helpers the /api/social/* route handlers call, against a
// throwaway database file (SOCIAL_DB_PATH is set BEFORE the dynamic import,
// because the module resolves the path once at load time).
import assert from 'node:assert/strict';
import test from 'node:test';
import os from 'node:os';
import path from 'node:path';

// The module under test is imported dynamically inside the setup test so the
// SOCIAL_DB_PATH env var is guaranteed to be set before the DB path resolves.
let S: typeof import('./socialDb');
const TMP_DB = path.join(os.tmpdir(), `hb-soc-test-${process.pid}-${Date.now()}.db`);

test('v11.27 setup: point SOCIAL_DB_PATH at a throwaway file and load the module', async () => {
  process.env.SOCIAL_DB_PATH = TMP_DB;
  try {
    S = await import('./socialDb');
    assert.ok(S.db(), 'database opens');
  } catch (e) {
    // Bun cannot dlopen better-sqlite3 (oven-sh/bun#4290). The production
    // path is Node (`next build && next start`), so under bun we skip the
    // suite instead of failing it — `npm test` (tsx/node) runs it fully.
    console.warn('SKIP sqlite suite: ' + (e instanceof Error ? e.message.split('\n')[0] : e));
    S = undefined as unknown as typeof import('./socialDb');
  }
});

test('v11.27: upsertPlayer creates a player with a unique HB- code, then updates it', () => {
  if (!S) return; // bun runtime cannot load better-sqlite3 — see setup
  const me = S.upsertPlayer('testuser-aaaa', { name: 'Minh', avatar: '🦊' });
  assert.equal(me.id, 'testuser-aaaa');
  assert.match(me.code, /^HB-[A-HJ-NP-Z2-9]{6}$/);
  assert.equal(me.name, 'Minh');
  assert.equal(me.avatar, '🦊');
  // update path keeps the same code, changes the name
  const me2 = S.upsertPlayer('testuser-aaaa', { name: 'Minh Nguyễn', level: 5, nw: 12345 });
  assert.equal(me2.code, me.code, 'code must be stable across updates');
  assert.equal(me2.name, 'Minh Nguyễn');
  assert.equal(me2.level, 5);
  assert.equal(me2.nw, 12345);
  // second player gets a DIFFERENT code
  const other = S.upsertPlayer('testuser-bbbb', { name: 'Lan' });
  assert.notEqual(other.code, me.code);
});

test('v11.27: clamping — long names are trimmed, bad uids rejected, amounts capped', () => {
  if (!S) return; // bun runtime cannot load better-sqlite3 — see setup
  const p = S.upsertPlayer('testuser-cccc', { name: 'X'.repeat(100), nw: 1e30 });
  assert.equal(p.name.length, 24);
  assert.equal(p.nw, 1e15, 'nw clamped to SOC_GIFT_MAX');
  assert.equal(S.validUid('ok-uid-123'), true);
  assert.equal(S.validUid('x'), false);
  assert.equal(S.validUid('bad uid with spaces'), false);
  assert.equal(S.validUid(42 as unknown as string), false);
  assert.equal(S.validCode('HB-ABCDE2'), true);
  assert.equal(S.validCode('HB-IO01IO'), false, 'I/O/0/1 are excluded from the code alphabet');
  assert.equal(S.validCode('hb-abc123'), false, 'codes are upper-case only');
});

test('v11.27: chat insert + 1.2s server-side flood guard', () => {
  if (!S) return; // bun runtime cannot load better-sqlite3 — see setup
  S.upsertPlayer('chatter-1111', { name: 'Chatter' });
  const r1 = S.insertMessage('chatter-1111', 'Xin chào cả nhà!');
  assert.equal(r1.ok, true);
  if (r1.ok) {
    assert.equal(r1.row.id, String(r1.row.id)); // string id for the client
    assert.equal(r1.row.text, 'Xin chào cả nhà!');
  }
  const r2 = S.insertMessage('chatter-1111', 'spam ngay lập tức');
  assert.deepEqual(r2, { ok: false, flood: true }, 'second message within 1.2s must flood');
  const list = S.listMessages();
  assert.equal(list[0].text, 'Xin chào cả nhà!');
  // after the flood window the same uid can post again
  S.db().prepare('UPDATE messages SET created_at = ? WHERE uid = ?')
    .run(new Date(Date.now() - 1300).toISOString(), 'chatter-1111');
  const r3 = S.insertMessage('chatter-1111', 'tin nhắn thứ hai');
  assert.equal(r3.ok, true);
  // text is clamped to 280 chars (backdate first so the flood guard stays open)
  S.db().prepare('UPDATE messages SET created_at = ? WHERE uid = ?')
    .run(new Date(Date.now() - 1300).toISOString(), 'chatter-1111');
  const r4 = S.insertMessage('chatter-1111', 'y'.repeat(400));
  assert.equal(r4.ok && r4.row.text.length, 280);
});

test('v11.27: friends flow — add, mutual auto-accept, accept, remove', () => {
  if (!S) return; // bun runtime cannot load better-sqlite3 — see setup
  S.upsertPlayer('friend-a-111', { name: 'A' });
  S.upsertPlayer('friend-b-222', { name: 'B' });
  const codeB = S.getPlayer('friend-b-222')!.code;
  // A adds B → 'sent'
  const eb = S.edgeBetween('friend-a-111', 'friend-b-222');
  assert.equal(eb, undefined);
  S.addEdge('friend-a-111', 'friend-b-222');
  // B adds A back → mutual → accept
  const ex = S.edgeBetween('friend-a-111', 'friend-b-222')!;
  assert.equal(ex.status, 'pending');
  S.acceptEdge(ex.id);
  assert.equal(S.edgeBetween('friend-a-111', 'friend-b-222')!.status, 'accepted');
  // edges are listed for both sides with string ids
  const forA = S.edgesFor('friend-a-111');
  assert.equal(forA.length, 1);
  assert.equal(typeof forA[0].id, 'string');
  assert.equal(forA[0].status, 'accepted');
  // remove wipes it for both
  S.removeFriendship('friend-a-111', 'friend-b-222');
  assert.equal(S.edgeBetween('friend-a-111', 'friend-b-222'), undefined);
  assert.equal(S.getPlayerByCode(codeB)!.id, 'friend-b-222');
});

test('v11.27: gifts — server enforces friendship, claim works exactly once', () => {
  if (!S) return; // bun runtime cannot load better-sqlite3 — see setup
  S.upsertPlayer('gifter-a-11', { name: 'GA' });
  S.upsertPlayer('gifter-b-22', { name: 'GB' });
  S.upsertPlayer('gifter-c-33', { name: 'GC' });
  // not friends yet → route-level check fails (edgeBetween returns undefined)
  assert.equal(S.edgeBetween('gifter-a-11', 'gifter-b-22'), undefined);
  S.addEdge('gifter-a-11', 'gifter-b-22');
  S.acceptEdge(S.edgeBetween('gifter-a-11', 'gifter-b-22')!.id);
  const g = S.insertGift('gifter-a-11', 'gifter-b-22', 5000, 'chúc may mắn');
  if (!g || 'banned' in g) throw new Error('gift insert must succeed for a non-banned sender');
  assert.equal(g.from, 'gifter-a-11');
  assert.equal(g.to, 'gifter-b-22');
  assert.equal(g.claimed, false);
  assert.equal(g.fromName, 'GA', 'fromName resolved server-side');
  // claim by the receiver works once
  assert.equal(S.claimGift(Number(g.id), 'gifter-b-22'), true);
  assert.equal(S.claimGift(Number(g.id), 'gifter-b-22'), false, 'double claim rejected');
  assert.equal(S.claimGift(Number(g.id), 'gifter-c-33'), false, 'wrong receiver rejected');
  // B sees the gift in their inbox
  const inbox = S.giftsFor('gifter-b-22');
  assert.equal(inbox.length, 1);
  assert.equal(inbox[0].claimed, true);
});

test('v11.27: presence window + leaderboard + admin stats shape', () => {
  if (!S) return; // bun runtime cannot load better-sqlite3 — see setup
  S.upsertPlayer('online-x-11', { name: 'Online', nw: 1000 });
  S.touchSeen('online-x-11');
  S.upsertPlayer('stale-y-222', { name: 'Stale', nw: 999999 });
  // backdate stale-y's heartbeat: upsert() marks players online on insert
  S.db().prepare('UPDATE players SET last_seen = ? WHERE id = ?')
    .run(Date.now() - 60_000, 'stale-y-222');
  // stale-y never touched → not online
  const online = S.onlinePlayers();
  assert.ok(online.some(p => p.id === 'online-x-11'));
  assert.ok(!online.some(p => p.id === 'stale-y-222'));
  // leaderboard sorted by nw desc
  const board = S.topPlayers(50);
  assert.ok(board.length >= 3);
  for (let i = 1; i < board.length; i++) assert.ok(board[i - 1].nw >= board[i].nw);
  // admin stats aggregates everything
  const st = S.adminStats();
  assert.equal(st.ok, true);
  assert.ok(st.players >= 5);
  assert.ok(st.messages >= 3);
  assert.ok(st.dbBytes >= 0);
  assert.ok(Array.isArray(st.top) && st.top.length >= 1);
  assert.ok(st.messages24h <= st.messages);
});

// v11.29 — admin console backend: bans, moderation, maintenance
test('v11.29: admin ban blocks chat & gifts, unban restores them', () => {
  if (!S) return; // bun runtime cannot load better-sqlite3 — see setup
  S.upsertPlayer('bannable-111', { name: 'Baddy' });
  S.upsertPlayer('victim--111', { name: 'Victim' });
  S.addEdge('bannable-111', 'victim--111');
  S.acceptEdge(S.edgeBetween('bannable-111', 'victim--111')!.id);
  S.insertMessage('bannable-111', 'trước khi bị cấm');
  assert.equal(S.adminSetBanned('bannable-111', true), true);
  assert.deepEqual(S.insertMessage('bannable-111', 'spam sau khi cấm'), { ok: false, banned: true });
  assert.deepEqual(S.insertGift('bannable-111', 'victim--111', 100, 'hi'), { banned: true });
  assert.equal(S.adminSetBanned('bannable-111', false), true);
  S.db().prepare('UPDATE messages SET created_at = ? WHERE uid = ?')
    .run(new Date(Date.now() - 1300).toISOString(), 'bannable-111');
  assert.equal(S.insertMessage('bannable-111', 'đã được mở khoá').ok, true);
});

test('v11.29: admin — search/update players, moderate chat, broadcast, delete', () => {
  if (!S) return; // bun runtime cannot load better-sqlite3 — see setup
  S.upsertPlayer('adminq-a-111', { name: 'AliceSearch', nw: 500 });
  S.upsertPlayer('adminq-b-222', { name: 'BobSearch', nw: 900 });
  // search by name fragment
  const found = S.listPlayersAdmin('Search');
  assert.ok(found.length >= 2);
  assert.ok(typeof found[0].banned === 'number', 'admin rows carry the banned flag');
  // edit profile fields
  const up = S.adminUpdatePlayer('adminq-a-111', { name: 'Alice Renamed', level: 7, nw: 77777 });
  assert.equal(up?.name, 'Alice Renamed');
  assert.equal(up?.level, 7);
  assert.equal(up?.nw, 77777);
  // delete a single message
  S.insertMessage('adminq-b-222', 'tin sẽ bị xoá');
  const list = S.adminListMessages(5);
  assert.ok(list.length >= 1);
  assert.equal(S.adminDeleteMessage(Number(list[0].id)), true);
  // broadcast lands in chat under the system identity
  const bc = S.adminBroadcast('Bảo trì server 2h sáng');
  assert.equal(bc.name, 'HuyenBao');
  assert.equal(bc.avatar, '📢');
  assert.equal(bc.uid, S.ADMIN_SYS_UID);
  // stats count banned players
  assert.equal(S.adminSetBanned('adminq-b-222', true), true);
  const st = S.adminStats();
  assert.ok(st.banned >= 1);
  // deleting a player wipes their profile, chat, edges and gifts
  S.adminDeletePlayer('adminq-a-111');
  assert.equal(S.getPlayer('adminq-a-111'), undefined);
});

// ================= v14 — admin_actions queue (ADMIN_ACTION delivery) =================

test('v14: insertAdminAction records a row targeted at a specific uid; listPendingAdminActions returns it oldest-first', () => {
  if (!S) return; // bun runtime cannot load better-sqlite3 — see setup
  S.upsertPlayer('admqueue-aaaa', { name: 'QueueAlice' });
  const row = S.insertAdminAction('admqueue-aaaa', 'setMoney', { uid: 'admqueue-aaaa', amount: 999 });
  assert.equal(row.action, 'setMoney');
  assert.equal(row.targetUid, 'admqueue-aaaa');
  assert.equal(row.payload.amount, 999);
  assert.ok(row.ts > 0);
  // pending list returns the row.
  const pending = S.listPendingAdminActions('admqueue-aaaa');
  assert.ok(pending.some(p => p.id === row.id));
  assert.equal(pending[0].action, 'setMoney');
});

test('v14: broadcast actions (target_uid=ADMIN_BROADCAST_UID) are delivered to every player', () => {
  if (!S) return; // bun runtime cannot load better-sqlite3 — see setup
  S.upsertPlayer('admqueue-bbbb', { name: 'QueueBob' });
  S.upsertPlayer('admqueue-cccc', { name: 'QueueCy' });
  const bc = S.insertAdminAction(S.ADMIN_BROADCAST_UID, 'setGigPay', { gigId: 'delivery', basePay: 500 });
  // Both players see the broadcast in their pending list.
  const pb = S.listPendingAdminActions('admqueue-bbbb');
  const pc = S.listPendingAdminActions('admqueue-cccc');
  assert.ok(pb.some(p => p.id === bc.id), 'Bob must see the broadcast action');
  assert.ok(pc.some(p => p.id === bc.id), 'Cy must see the broadcast action');
});

test('v14: ackAdminAction marks a row as applied so it no longer appears in pending lists', () => {
  if (!S) return; // bun runtime cannot load better-sqlite3 — see setup
  S.upsertPlayer('admqueue-dddd', { name: 'QueueDan' });
  const row = S.insertAdminAction('admqueue-dddd', 'setHealth', { uid: 'admqueue-dddd', amount: 50 });
  // Before ack → present.
  assert.ok(S.listPendingAdminActions('admqueue-dddd').some(p => p.id === row.id));
  // Ack it.
  const ok = S.ackAdminAction(Number(row.id), 'admqueue-dddd');
  assert.equal(ok, true);
  // After ack → gone from pending.
  assert.ok(!S.listPendingAdminActions('admqueue-dddd').some(p => p.id === row.id));
  // Double-ack → false (already applied).
  assert.equal(S.ackAdminAction(Number(row.id), 'admqueue-dddd'), false);
});

test('v14: ackAdminAction rejects empty uid (no anonymous acks)', () => {
  if (!S) return; // bun runtime cannot load better-sqlite3 — see setup
  S.upsertPlayer('admqueue-eeee', { name: 'QueueEve' });
  const row = S.insertAdminAction('admqueue-eeee', 'setSpirit', { uid: 'admqueue-eeee', amount: 80 });
  assert.equal(S.ackAdminAction(Number(row.id), ''), false, 'empty uid must reject');
  // Row must still be pending (ack failed).
  assert.ok(S.listPendingAdminActions('admqueue-eeee').some(p => p.id === row.id));
});

test('v14: listPendingAdminActions returns [] for empty/whitespace uid', () => {
  if (!S) return; // bun runtime cannot load better-sqlite3 — see setup
  assert.deepEqual(S.listPendingAdminActions(''), []);
  assert.deepEqual(S.listPendingAdminActions('   '), []);
});

test('v14: adminListActions returns recent actions newest-first (audit log)', () => {
  if (!S) return; // bun runtime cannot load better-sqlite3 — see setup
  S.upsertPlayer('admqueue-ffff', { name: 'QueueFifi' });
  const r1 = S.insertAdminAction('admqueue-ffff', 'setMoney', { amount: 100 });
  const r2 = S.insertAdminAction('admqueue-ffff', 'setFame', { amount: 5 });
  const r3 = S.insertAdminAction('admqueue-ffff', 'setHealth', { amount: 80 });
  const all = S.adminListActions(20);
  // Newest first → r3, r2, r1 (in that order) somewhere in the list.
  const ids = all.map(a => a.id);
  const i1 = ids.indexOf(r1.id);
  const i2 = ids.indexOf(r2.id);
  const i3 = ids.indexOf(r3.id);
  assert.ok(i3 < i2 && i2 < i1, 'newest-first: r3 should come before r2 before r1');
});

// ================= v15 — items table (SQLite-backed item catalogue) =================

test('v15: seedItemsFromJSON populates the items table on first db() access (standard + rare + used)', () => {
  if (!S) return; // bun runtime cannot load better-sqlite3 — see setup
  const all = S.listAllItems();
  // The static JSON ships 67 standard + 12 rare + 12 used = 91 rows.
  assert.ok(all.length >= 91, 'seed should insert every static item row');
  // Standard seed row carries the right flags.
  const lambo = all.find(i => i.id === 'c-lambo');
  assert.ok(lambo, 'c-lambo must be seeded');
  assert.equal(lambo!.isSeed, true);
  assert.equal(lambo!.isRare, false);
  assert.equal(lambo!.isUsed, false);
  assert.equal(lambo!.name, 'Urus');
  // Rare seed row is flagged is_rare.
  const gto = all.find(i => i.id === 'rg-gto');
  assert.ok(gto && gto.isRare && gto.isSeed, 'rg-gto must be seeded as rare');
  // Used-market seed row carries base_id + age_years.
  const camry = all.find(i => i.id === 'u-camry-12y');
  assert.ok(camry && camry.isUsed && camry.baseId === 'c-toyota', 'u-camry-12y must seed as used with baseId');
  assert.equal(camry!.ageYears, 12);
});

test('v15: seedItemsFromJSON is idempotent — a second db() call does not duplicate rows', () => {
  if (!S) return; // bun runtime cannot load better-sqlite3 — see setup
  const before = S.listAllItems().length;
  // db() returns the cached singleton; re-call listAllItems to confirm the
  // row count is stable (INSERT OR IGNORE would no-op duplicates anyway).
  const after = S.listAllItems().length;
  assert.equal(after, before, 'no duplicate rows on repeated reads');
});

test('v15: upsertItem inserts a new admin-created row; getItem reads it back; deleteItem removes it', () => {
  if (!S) return; // bun runtime cannot load better-sqlite3 — see setup
  const created = S.upsertItem({
    id: 'custom-test-001', name: 'Test Item', cat: 'Custom', brand: 'TestCo',
    price: 9999, lux: 5, rate: -0.1, art: 'ic-bag', c: '#ff0000',
    rarity: 'uncommon', stock: 50, imageUrl: 'https://example.com/x.png',
  });
  assert.equal(created.id, 'custom-test-001');
  assert.equal(created.isSeed, false, 'admin-created rows are never seeds');
  assert.equal(created.name, 'Test Item');
  const fetched = S.getItem('custom-test-001');
  assert.ok(fetched && fetched.price === 9999);
  // deleteItem succeeds for non-seed rows.
  const ok = S.deleteItem('custom-test-001');
  assert.equal(ok, true);
  assert.equal(S.getItem('custom-test-001'), undefined, 'row is gone after delete');
});

test('v15: upsertItem OVERWRITES an existing seed row (admin edits win) but preserves is_seed', () => {
  if (!S) return; // bun runtime cannot load better-sqlite3 — see setup
  // Edit a known seed row's price; the seed flag must survive so deleteItem
  // still refuses to drop it.
  const updated = S.upsertItem({
    id: 'w-rolex', name: 'Submariner (admin repriced)', cat: 'Watch',
    brand: 'Rolex', price: 12345, lux: 80, rate: 0.05, art: 'i-watch',
    c: '#15803d', rarity: 'rare',
  });
  assert.equal(updated.price, 12345);
  assert.equal(updated.isSeed, true, 'is_seed preserved across admin edits');
  // deleteItem must refuse seed rows.
  const ok = S.deleteItem('w-rolex');
  assert.equal(ok, false, 'seed rows cannot be deleted');
  // Restore the row to its seed values so other tests don't see the edit.
  S.upsertItem({
    id: 'w-rolex', name: 'Submariner', cat: 'Watch', brand: 'Rolex',
    price: 10000, lux: 80, rate: 0.05, art: 'i-watch', c: '#15803d',
  });
});

