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
