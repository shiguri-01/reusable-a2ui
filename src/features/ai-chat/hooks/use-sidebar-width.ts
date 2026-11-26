import { useSyncExternalStore } from "react";
import { createLocalStorage } from "@ui-sdk/core";

export const DEFAULT_SIDEBAR_WIDTH = 448;
export const MIN_SIDEBAR_WIDTH = 320;
export const MAX_SIDEBAR_WIDTH = 720;

const sidebarWidthStorage = createLocalStorage("reusable-a2ui:sidebar-width:v1");

export function clampSidebarWidth(width: number): number {
  return Math.round(Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width)));
}

function readStoredSidebarWidth(): number {
  const raw = sidebarWidthStorage.get();
  if (!raw) return DEFAULT_SIDEBAR_WIDTH;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= MIN_SIDEBAR_WIDTH && parsed <= MAX_SIDEBAR_WIDTH
    ? parsed
    : DEFAULT_SIDEBAR_WIDTH;
}

function subscribeSidebarWidth(listener: () => void): () => void {
  return sidebarWidthStorage.subscribe(() => listener());
}

export function saveSidebarWidth(width: number): void {
  sidebarWidthStorage.set(String(clampSidebarWidth(width)));
}

export function useSidebarWidth(): number {
  return useSyncExternalStore(
    subscribeSidebarWidth,
    readStoredSidebarWidth,
    () => DEFAULT_SIDEBAR_WIDTH,
  );
}
