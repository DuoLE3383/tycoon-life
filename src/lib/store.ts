'use client';
// External game store: engine state lives outside React; components subscribe via useSyncExternalStore.
import { useEffect, useState, useSyncExternalStore } from 'react';
import { fresh, migrate, reincarnate as engineReincarnate, type GameState } from './engine';

const KEY = 'tycoon_life_react_v1';
// v13.21 — save per user id. Active id in localStorage 'tycoon_user_id'.
// No id → legacy single key above (old saves keep working, never deleted).
// With id → 'tycoon_life_react_v1_<id>'. Continue = set id + reload so
// hydrate() loads the right key.
const USER_KEY = 'tycoon_user_id';
export function sanitizeUserId(raw: string): string | null {
  const id = (raw || '').trim().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32);
  return id || null;
}
export function getActiveUserId(): string | null {
  try { return sanitizeUserId(localStorage.getItem(USER_KEY) || ''); } catch { return null; }
}
export function getSaveKey(userId?: string | null): string {
  const id = userId === undefined ? getActiveUserId() : sanitizeUserId(userId || '');
  return id ? `${KEY}_${id}` : KEY;
}
export function hasSaveFor(userId: string): boolean {
  const id = sanitizeUserId(userId);
  if (!id) return false;
  try {
    const raw = localStorage.getItem(getSaveKey(id));
    if (!raw) return false;
    const j = JSON.parse(raw);
    return !!j && j.started === true;
  } catch { return false; }
}
export function setActiveUserId(raw: string): string | null {
  const id = sanitizeUserId(raw);
  try { if (id) localStorage.setItem(USER_KEY, id); else localStorage.removeItem(USER_KEY); } catch { /* ignore */ }
  return id;
}
let S: GameState = fresh();
let ver = 0;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() { listeners.forEach(l => l()); }
export function bump() { ver++; emit(); }

export function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(getSaveKey());
    if (raw) S = migrate(JSON.parse(raw));
  } catch { /* ignore */ }
  bump();
}
// v13.30 - Cloud save: persist() ghi local + day len server (fire-and-forget, khong block game).
// Duong mo game 1 lan tren may cu -> save Duong len server -> may Maika tai ve duoc.
let _saveTimer: ReturnType<typeof setTimeout> | null = null;
export function persist() {
  let raw = '';
  try { raw = JSON.stringify(S); localStorage.setItem(getSaveKey(), raw); } catch { /* ignore */ }
  try {
    const id = getActiveUserId();
    if (!id || !raw) return;
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => {
      fetch('/api/social/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid: id, data: raw }) }).catch(() => {});
    }, 800);
  } catch { /* ignore */ }
}
// v13.30 - Tai save tu server ve localStorage, tra true neu co.
export async function fetchServerSave(userId: string): Promise<boolean> {
  const id = sanitizeUserId(userId);
  if (!id) return false;
  try {
    const r = await fetch('/api/social/save?uid=' + encodeURIComponent(id), { cache: 'no-store' });
    if (!r.ok) return false;
    const j = await r.json().catch(() => ({})) as { ok?: boolean; data?: string };
    if (!j.ok || typeof j.data !== 'string') return false;
    const parsed = JSON.parse(j.data);
    if (!parsed || parsed.started !== true) return false;
    localStorage.setItem(getSaveKey(id), j.data);
    return true;
  } catch { return false; }
}
export function resetState() { S = fresh(); persist(); bump(); }
// v10.5 — reincarnation: keep identity (name / nation / religion / talents /
// interests), reduce knowledge 30-80% at random, reset assets to age 18,
// push the past life into s.pastLives so the player can look back.
export function reincarnateState() { engineReincarnate(S); persist(); bump(); }
export function getState() { return S; }

function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }
function snap() { return ver; }

export function useGame(): { s: GameState } {
  useSyncExternalStore(subscribe, snap, snap);
  useEffect(() => { hydrate(); }, []);
  return { s: S };
}
