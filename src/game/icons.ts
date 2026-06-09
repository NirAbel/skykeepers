import type { CraftKind } from "./types.ts";

// Placeholder icons — all point "up" (toward -y) so the engine can rotate
// them by heading. Real aircraft SVGs from the user slot in here later.
// Each uses fill="currentColor"; the craft wrapper sets color per spec.
const ICONS: Record<CraftKind, string> = {
  drone: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2 6h-4l2-6zm0 7a3 3 0 013 3v6l-3 2-3-2v-6a3 3 0 013-3zM3 6l4 2-1 2-4-2 1-2zm18 0l-1 2-4-2 1-2 4 2z"/></svg>`,
  fighter: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1l1.5 7L22 13v2l-8.5-2.5L13 20l2 1.5V23l-3-1-3 1v-1.5L11 20l-.5-7.5L2 15v-2l8.5-5L12 1z"/></svg>`,
  missile: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1c2 2 3 5 3 9v6l2 4h-2l-1-2h-4l-1 2H8l2-4v-6c0-4 1-7 2-9zm0 6a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/></svg>`,
  airliner: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 0 1.5 1.5 1.5 4v3l8 4.5V15l-8-2v4l2.5 2v1.5L12 19l-3.5 1.5V19L11 17v-4l-8 2v-1.5L11 9V6c0-2.5.5-4 1-4z"/></svg>`,
  helicopter: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v1.5h-8.25V8H15a4 4 0 014 4v3h-1.5v-3a2.5 2.5 0 00-2.5-2.5H9A2.5 2.5 0 006.5 12v3H5v-3a4 4 0 014-4h2.25V5.5H3V4zm8 12h2.5l1.5 3v1.5h-7V19l1.5-3H11z"/></svg>`,
};

export function iconFor(kind: CraftKind): string {
  return ICONS[kind];
}

// Player units (point "up"). Real assets slot in here later.
export const F16_ICON = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1l1.2 6.5L23 13.5v1.8l-9.4-2.6.4 5.4 2.6 1.9v1.4L12 21l-4.6.4v-1.4l2.6-1.9.4-5.4L1 15.3v-1.8l9.8-6L12 1z"/></svg>`;

export const BATTERY_ICON = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 20v-2h18v2H3zm2-3l2-7h2l-1 7H5zm5 0V9h1.5l3.5 8h-2l-.8-2H11l-.2 2H10zm.9-3.5h2l-1-2.5-1 2.5zM16 17l1-5h2l-1 5h-2zM10.5 8a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z"/></svg>`;

export const DOME_MISSILE_ICON = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1.6 1.8 2.4 4 2.4 7v7l1.6 3h-1.6l-1-1.8h-2.8L9.6 19H8l1.6-3v-7c0-3 .8-5.2 2.4-7z"/></svg>`;
