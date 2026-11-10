// v11.27 — global leaderboard: top 50 by net worth.
// GET /api/social/leaderboard → { board }
import { NextResponse } from 'next/server';
import { db, topPlayers } from '@/lib/server/socialDb';

export function GET() {
  try {
    db();
    return NextResponse.json({ board: topPlayers(50) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'board-failed' }, { status: 500 });
  }
}
