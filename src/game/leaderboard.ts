// Local high-score table. Persists to localStorage on this device only;
// a shared cloud leaderboard (Supabase / Netlify) is a later swap behind
// these same functions.

export interface ScoreEntry {
  name: string;
  score: number;
  intercepted: number;
  mistakes: number;
  ts: number; // epoch ms — also used to highlight the just-saved row
}

const SCORES_KEY = "sk_scores_v1";
const NICK_KEY = "sk_nick_v1";
const MAX_ROWS = 10;
export const NICK_MAX = 12;

export function loadScores(): ScoreEntry[] {
  try {
    const arr = JSON.parse(localStorage.getItem(SCORES_KEY) ?? "[]");
    return Array.isArray(arr) ? (arr as ScoreEntry[]) : [];
  } catch {
    return [];
  }
}

// Insert a result, keep the top MAX_ROWS by score, and report the new
// entry's 1-based rank within the full (untrimmed) ranking.
export function saveScore(entry: ScoreEntry): {
  rank: number;
  board: ScoreEntry[];
} {
  const all = [...loadScores(), entry].sort((a, b) => b.score - a.score);
  const rank = all.indexOf(entry) + 1;
  const board = all.slice(0, MAX_ROWS);
  try {
    localStorage.setItem(SCORES_KEY, JSON.stringify(board));
  } catch {
    /* quota / private-mode — keep the in-memory board */
  }
  return { rank, board };
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
