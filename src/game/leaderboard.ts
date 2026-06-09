// Shared cloud high-score table, served by the Netlify Function at ENDPOINT
// (Netlify Blobs store). localStorage is kept as an offline cache + fallback
// so the board still renders when the function is unreachable (e.g. `vite`
// dev with no functions runtime, or a network blip).

export interface ScoreEntry {
  name: string;
  score: number;
  intercepted: number;
  mistakes: number;
  ts: number; // epoch ms — also used to highlight the just-saved row
}

const ENDPOINT = "/.netlify/functions/leaderboard";
const CACHE_KEY = "sk_scores_v1";
const NICK_KEY = "sk_nick_v1";
const MAX_ROWS = 10;
export const NICK_MAX = 12;

function readCache(): ScoreEntry[] {
  try {
    const arr = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "[]");
    return Array.isArray(arr) ? (arr as ScoreEntry[]) : [];
  } catch {
    return [];
  }
}

function writeCache(board: ScoreEntry[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(board));
  } catch {
    /* quota / private-mode — ignore */
  }
}

// Fetch the shared board; on any failure fall back to the local cache.
export async function loadScores(): Promise<ScoreEntry[]> {
  try {
    const res = await fetch(ENDPOINT, { method: "GET" });
    if (!res.ok) throw new Error(String(res.status));
    const board = (await res.json()) as ScoreEntry[];
    const trimmed = board.slice(0, MAX_ROWS);
    writeCache(trimmed);
    return trimmed;
  } catch {
    return readCache();
  }
}

// Fetch the full table (not just the top MAX_ROWS) for the scoreboard view.
export async function loadFullScores(): Promise<ScoreEntry[]> {
  try {
    const res = await fetch(`${ENDPOINT}?full=1`, { method: "GET" });
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as ScoreEntry[];
  } catch {
    return readCache();
  }
}

// Submit a result. Returns the server-assigned rank + board; `shared` is false
// when we fell back to a local-only ranking (function unreachable).
export async function saveScore(entry: ScoreEntry): Promise<{
  rank: number;
  board: ScoreEntry[];
  shared: boolean;
}> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(entry),
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { rank: number; board: ScoreEntry[] };
    const board = data.board.slice(0, MAX_ROWS);
    writeCache(board);
    return { rank: data.rank, board, shared: true };
  } catch {
    const all = [...readCache(), entry].sort((a, b) => b.score - a.score);
    const rank = all.indexOf(entry) + 1;
    const board = all.slice(0, MAX_ROWS);
    writeCache(board);
    return { rank, board, shared: false };
  }
}

export function loadNick(): string {
  try {
    return localStorage.getItem(NICK_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveNick(name: string): void {
  try {
    localStorage.setItem(NICK_KEY, name);
  } catch {
    /* ignore */
  }
}
