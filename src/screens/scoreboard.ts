import { loadFullScores, type ScoreEntry } from "../game/leaderboard.ts";
import { escapeHtml } from "../core/html.ts";

// Shared row markup for any leaderboard list (end-overlay summary + the full
// scoreboard modal). highlightTs marks the player's just-saved row.
export function leaderboardRowsHtml(
  board: ScoreEntry[],
  highlightTs: number | null,
): string {
  if (board.length === 0) {
    return `<div class="lb-empty">אין עדיין שיאים — היה הראשון</div>`;
  }
  return board
    .map((e, i) => {
      const me = highlightTs !== null && e.ts === highlightTs ? " is-me" : "";
      return `<div class="lb-row${me}">
        <span class="lb-rank">${i + 1}</span>
        <span class="lb-name">${escapeHtml(e.name)}</span>
        <span class="lb-score">${e.score}</span>
      </div>`;
    })
    .join("");
}

// Full-table scoreboard modal, openable from the entry and end screens.
// Fetches the complete board (not just the top 10) and overlays it; closes on
// the ✕ button, a backdrop tap, or Escape.
export function openScoreboard(highlightTs: number | null = null): void {
  if (document.querySelector(".sb-modal")) return; // already open

  const modal = document.createElement("div");
  modal.className = "sb-modal";
  modal.innerHTML = `
    <div class="sb-card">
      <div class="sb-head">
        <span class="sb-title">טבלת ניקוד</span>
        <button class="sb-close" aria-label="סגור">✕</button>
      </div>
      <div class="sb-rows lb-rows"><div class="lb-empty">טוען טבלה…</div></div>
    </div>`;
  document.body.appendChild(modal);

  const rowsEl = modal.querySelector(".sb-rows")!;
  const close = (): void => {
    modal.remove();
    document.removeEventListener("keydown", onKey);
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") close();
  };
  document.addEventListener("keydown", onKey);
  modal.querySelector(".sb-close")!.addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });

  loadFullScores().then((board) => {
    rowsEl.innerHTML = leaderboardRowsHtml(board, highlightTs);
  });
}
