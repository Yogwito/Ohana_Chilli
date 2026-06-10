import { useState } from 'react';
import type { CustomBowl } from '@/types';

const STORAGE_KEY = 'ohana-saved-bowls';
const MAX_SAVED = 10;

export interface SavedBowl {
  id: string;
  name: string;
  createdAt: string;
  config: CustomBowl;
}

function readStorage(): SavedBowl[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedBowl[]) : [];
  } catch {
    return [];
  }
}

function writeStorage(bowls: SavedBowl[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bowls));
  } catch {
    // storage full or unavailable — fail silently
  }
}

export function useSavedBowls() {
  const [saved, setSaved] = useState<SavedBowl[]>(readStorage);

  const saveBowl = (name: string, config: CustomBowl) => {
    const entry: SavedBowl = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim() || 'Mi bowl',
      createdAt: new Date().toISOString(),
      config,
    };
    setSaved((prev) => {
      const updated = [entry, ...prev].slice(0, MAX_SAVED);
      writeStorage(updated);
      return updated;
    });
    return entry.id;
  };

  const removeBowl = (id: string) => {
    setSaved((prev) => {
      const updated = prev.filter((b) => b.id !== id);
      writeStorage(updated);
      return updated;
    });
  };

  return { saved, saveBowl, removeBowl };
}
