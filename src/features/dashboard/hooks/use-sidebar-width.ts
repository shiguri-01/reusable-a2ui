import { useSyncExternalStore } from "react";
import {
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_STORAGE_KEY,
} from "../constants";

const listeners = new Set<() => void>();

function readStoredSidebarWidth(): number {
  if (typeof window === "undefined") return DEFAULT_SIDEBAR_WIDTH;
  const raw = window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
  if (!raw) return DEFAULT_SIDEBAR_WIDTH;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= MIN_SIDEBAR_WIDTH && parsed <= MAX_SIDEBAR_WIDTH
    ? parsed
    : DEFAULT_SIDEBAR_WIDTH;
}

function subscribeSidebarWidth(listener: () => void): () => void {
  listeners.add(listener);
  const handleStorage = (event: StorageEvent) => {
    if (event.key === SIDEBAR_WIDTH_STORAGE_KEY) {
      listener();
    }
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function saveSidebarWidth(width: number): void {
  const clamped = Math.round(Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width)));
  window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(clamped));
  for (const listener of listeners) {
    listener();
  }
}

export function useSidebarWidth(): number {
  return useSyncExternalStore(
    subscribeSidebarWidth,
    readStoredSidebarWidth,
    () => DEFAULT_SIDEBAR_WIDTH,
  );
}
