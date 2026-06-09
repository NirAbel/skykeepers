import { getStore } from "@netlify/blobs";

// Shared cloud leaderboard. GET returns the top board; POST submits a score
// and returns its rank + the trimmed board. Backed by a single Netlify Blob
// (read-modify-write) — fine for MVP traffic; not strictly race-safe.

const KEY = "scores";
const STORED_ROWS = 200; // full table cap; GET ?full=1 returns up to this
const RETURN_ROWS = 10; // default GET / POST summary
const NICK_MAX = 12;

function clampInt(v, min, max) {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, n));
}

// Trust nothing from the client: clamp every field, server-stamp nothing we
// can derive, and reject anything that isn't a plausible score.
function sanitize(body) {
  if (typeof body !== "object" || body === null) return null;
  const score = clampInt(body.score, 0, 1_000_000);
  const intercepted = clampInt(body.intercepted, 0, 10_000);
  const mistakes = clampInt(body.mistakes, 0, 1_000);
  if (score === null || intercepted === null || mistakes === null) return null;
  const name =
    String(body.name ?? "").trim().slice(0, NICK_MAX) || "אנונימי";
  const ts = clampInt(body.ts, 0, Number.MAX_SAFE_INTEGER) ?? Date.now();
  return { name, score, intercepted, mistakes, ts };
}

export default async (req) => {
  const store = getStore("leaderboard");

  if (req.method === "GET") {
    const board = (await store.get(KEY, { type: "json" })) ?? [];
    const full = new URL(req.url).searchParams.get("full") === "1";
    return Response.json(board.slice(0, full ? STORED_ROWS : RETURN_ROWS));
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response("bad json", { status: 400 });
    }
    const entry = sanitize(body);
    if (!entry) return new Response("invalid score", { status: 400 });

    const existing = (await store.get(KEY, { type: "json" })) ?? [];
    const all = [...existing, entry].sort((a, b) => b.score - a.score);
    const rank = all.indexOf(entry) + 1;
    const board = all.slice(0, STORED_ROWS);
    await store.setJSON(KEY, board);

    return Response.json({ rank, board: board.slice(0, RETURN_ROWS) });
  }

  return new Response("method not allowed", { status: 405 });
};
