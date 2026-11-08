'use client';
// External game store: engine state lives outside React; components subscribe via useSyncExternalStore.
import { useEffect, useState, useSyncExternalStore } from 'react';
import { fresh, migrate, type GameState } from './engine';

const KEY = 'tycoon_life_react_v1';
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
    const raw = localStorage.getItem(KEY);
    if (raw) S = migrate(JSON.parse(raw));
  } catch { /* ignore */ }
  bump();
}
export function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* ignore */ }
}
export function resetState() { S = fresh(); persist(); bump(); }
export function getState() { return S; }

function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }
function snap() { return ver; }

export function useGame(): { s: GameState } {
  useSyncExternalStore(subscribe, snap, snap);
  useEffect(() => { hydrate(); }, []);
  return { s: S };
}
