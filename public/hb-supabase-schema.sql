-- ============================================================
-- HuyenBao — Community / multiplayer schema (v11.25)
-- Run this ONCE in Supabase → SQL Editor → New query → Run.
--
-- Sau đó bật: Authentication → Sign In / Up → "Anonymous sign-ins" = ON
--
-- Security model:
--   * Every browser gets an anonymous auth identity (auth.uid()).
--   * Row Level Security scopes every write to its owner:
--     - you can only edit YOUR player row,
--     - only send chat rows / friend requests / gifts as YOURSELF,
--     - only read conversations you are part of,
--     - only claim gifts addressed to you.
--   * The anon key is safe to ship in a static site — it is public by design.
-- ============================================================

-- 1) players ------------------------------------------------
create table if not exists public.hb_players (
  id      uuid primary key default auth.uid(),   -- = auth user id
  code    text unique not null,                  -- HB-XXXXXX friend code
  name    text not null check (char_length(name) between 1 and 24),
  avatar  text not null default '🐯',
  level   int  not null default 1,
  nw      numeric not null default 0,            -- net worth (leaderboard)
  ts      bigint  not null default 0,            -- last-seen epoch ms
  created_at timestamptz not null default now()
);

-- 2) global chat --------------------------------------------
create table if not exists public.hb_messages (
  id         bigint generated always as identity primary key,
  uid        uuid not null default auth.uid(),
  name       text not null,
  avatar     text not null default '🐯',
  text       text not null check (char_length(text) between 1 and 280),
  created_at timestamptz not null default now()
);

-- 3) friend edges (a = requester, b = target) ----------------
create table if not exists public.hb_friend_edges (
  id     bigint generated always as identity primary key,
  a      uuid not null default auth.uid(),
  b      uuid not null,
  status text not null default 'pending' check (status in ('pending','accepted')),
  ts     bigint not null default 0,
  unique (a, b)
);

-- 4) gifts ---------------------------------------------------
create table if not exists public.hb_gifts (
  id      bigint generated always as identity primary key,
  from_uid uuid not null default auth.uid(),
  to_uid   uuid not null,
  amount   numeric not null check (amount > 0),
  note     text,
  claimed  boolean not null default false,
  ts       bigint not null default 0
);

create index if not exists hb_messages_id_idx   on public.hb_messages (id desc);
create index if not exists hb_edges_a_idx       on public.hb_friend_edges (a);
create index if not exists hb_edges_b_idx       on public.hb_friend_edges (b);
create index if not exists hb_gifts_to_idx      on public.hb_gifts (to_uid);
create index if not exists hb_players_nw_idx    on public.hb_players (nw desc);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.hb_players      enable row level security;
alter table public.hb_messages     enable row level security;
alter table public.hb_friend_edges enable row level security;
alter table public.hb_gifts        enable row level security;

-- players: public read (leaderboard), write only your own row
create policy "hb_players_read"   on public.hb_players for select to authenticated using (true);
create policy "hb_players_insert" on public.hb_players for insert to authenticated with check (id = auth.uid());
create policy "hb_players_update" on public.hb_players for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- chat: everyone signed-in reads, inserts only as yourself
create policy "hb_messages_read"   on public.hb_messages for select to authenticated using (true);
create policy "hb_messages_insert" on public.hb_messages for insert to authenticated with check (uid = auth.uid());

-- friend edges: participants read; request as yourself; both sides may accept/decline
create policy "hb_edges_read"   on public.hb_friend_edges for select to authenticated using (a = auth.uid() or b = auth.uid());
create policy "hb_edges_insert" on public.hb_friend_edges for insert to authenticated with check (a = auth.uid());
create policy "hb_edges_update" on public.hb_friend_edges for update to authenticated using (a = auth.uid() or b = auth.uid());
create policy "hb_edges_delete" on public.hb_friend_edges for delete to authenticated using (a = auth.uid() or b = auth.uid());

-- gifts: sender & receiver only; send as yourself; receiver claims
create policy "hb_gifts_read"   on public.hb_gifts for select to authenticated using (from_uid = auth.uid() or to_uid = auth.uid());
create policy "hb_gifts_insert" on public.hb_gifts for insert to authenticated with check (from_uid = auth.uid());
create policy "hb_gifts_update" on public.hb_gifts for update to authenticated using (from_uid = auth.uid() or to_uid = auth.uid());

-- ============================================================
-- Realtime (live chat). If the publication doesn't exist yet,
-- create it first (Supabase projects ship it by default):
--   create publication supabase_realtime;
-- ============================================================
alter publication supabase_realtime add table public.hb_messages;
