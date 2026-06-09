import type { Navigator, Screen } from "../core/screen.ts";
import { GameEngine, type IntelItem, type GameResult } from "../game/engine.ts";
import { SCENARIO } from "../game/config.ts";
import { BORDER, CITIES } from "../game/geo.ts";
import {
  loadScores,
  saveScore,
  loadNick,
  saveNick,
  NICK_MAX,
  type ScoreEntry,
} from "../game/leaderboard.ts";

const mapUrl = "/assets/map-israel.jpg";

const HEART = `<svg class="heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-10-9.2C.3 8.6 1.6 5 5 5c2 0 3.2 1.2 4 2.3C9.8 6.2 11 5 13 5c3.4 0 4.7 3.6 3 6.8C19.5 16.4 12 21 12 21z"/></svg>`;

function drawDebugGeo(arena: HTMLElement): void {
  const w = arena.clientWidth;
  const h = arena.clientHeight;
  const pts = BORDER.map((p) => `${p.x * w},${p.y * h}`).join(" ");
  const cities = CITIES.map(
    (c) =>
      `<circle cx="${c.pos.x * w}" cy="${c.pos.y * h}" r="4" fill="#f59e0b"/>` +
      `<text x="${c.pos.x * w + 6}" y="${c.pos.y * h + 4}" fill="#fff" font-size="11">${c.name}</text>`,
  ).join("");
  arena.innerHTML = `<svg style="position:absolute;inset:0;width:100%;height:100%" viewBox="0 0 ${w} ${h}">
    <polygon points="${pts}" fill="rgba(0,180,216,0.18)" stroke="#00b4d8" stroke-width="2"/>
    ${cities}
  </svg>`;
}

function heartsHtml(lives: number): string {
  let out = "";
  for (let i = 0; i < SCENARIO.lives; i++) {
    out += i < lives ? HEART : HEART.replace("heart", "heart lost");
  }
  return out;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;",
  );
}

function intelHtml(items: IntelItem[]): string {
  return items
    .map(
      (i) =>
        `<div class="intel-item intel-${i.allegiance}"><span class="intel-dot"></span><span>${escapeHtml(i.text)}</span></div>`,
    )
    .join("");
}

// Translucent result card layered over the still-visible map (spec 5).
function endOverlayHtml(result: GameResult, nick: string): string {
  const success = result.mistakes < SCENARIO.lives;
  return `
    <div class="end-overlay">
      <h2 class="end-title ${success ? "is-success" : "is-fail"}">
        ${success ? "הסימולציה הושלמה" : "הסימולציה הסתיימה"}
      </h2>
      <div class="end-score-label">ניקוד סופי</div>
      <div class="end-score">${result.score}</div>
      <div class="end-cards">
        <div class="end-card"><span>יורטו</span><strong>${result.intercepted}</strong></div>
        <div class="end-card"><span>טעויות</span><strong>${result.mistakes}/${SCENARIO.lives}</strong></div>
      </div>
      <div class="end-save">
        <input class="end-nick" type="text" maxlength="${NICK_MAX}"
               placeholder="הכנס כינוי" value="${escapeHtml(nick)}" />
        <button class="btn-primary end-save-btn">שמור לטבלה</button>
      </div>
      <div class="leaderboard">
        <div class="lb-title">טבלת השיאים</div>
        <div class="lb-rows"></div>
      </div>
      <button class="btn-secondary end-replay">שחק שוב</button>
    </div>`;
}

function leaderboardRowsHtml(
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

// Full-bleed map + floating game HUD. The .game-arena layer holds the live
// aircraft (pointer-events:auto for tap-to-intercept); the HUD overlay sits
// on top and is non-interactive except the debug button.
export function createGameScreen(nav: Navigator): Screen {
  let el: HTMLElement;
  let engine: GameEngine | null = null;

  return {
    mount(root) {
      el = document.createElement("div");
      el.className = "screen game-screen";
      el.innerHTML = `
        <img class="game-map" src="${mapUrl}" alt="מפת ישראל" draggable="false" />
        <div class="game-arena"></div>
        <div class="arena-overlay">
          <div class="hud-panel hud-score">
            <span class="hud-label">ניקוד</span>
            <span class="hud-score-val">0</span>
          </div>
          <div class="hud-panel hud-timer"><span class="hud-timer-val">90</span></div>
          <div class="hud-lives">${heartsHtml(SCENARIO.lives)}</div>
          <div class="intel-feed"></div>
        </div>
        <button class="btn-secondary debug-end">סיים תרחיש (debug)</button>
      `;
      root.appendChild(el);

      const scoreEl = el.querySelector(".hud-score-val")!;
      const timerEl = el.querySelector(".hud-timer-val")!;
      const livesEl = el.querySelector(".hud-lives")!;
      const intelEl = el.querySelector(".intel-feed")!;
      const arena = el.querySelector(".game-arena") as HTMLElement;

      // #debug — draw the border polygon + cities over the map and skip the
      // engine, so the geo can be tuned against the satellite image.
      if (location.hash.includes("debug")) {
        requestAnimationFrame(() => drawDebugGeo(arena));
        return;
      }

      engine = new GameEngine(arena, {
        onScore: (s) => (scoreEl.textContent = String(s)),
        onTime: (sec) => (timerEl.textContent = String(sec)),
        onLives: (lives) => (livesEl.innerHTML = heartsHtml(lives)),
        onIntel: (items) => (intelEl.innerHTML = intelHtml(items)),
        onEnd: (result) => {
          engine = null;
          showEndOverlay(result);
        },
      });

      // Layer the result card over the frozen map instead of swapping screens,
      // so the player sees the final board and their score together.
      function showEndOverlay(result: GameResult): void {
        el.insertAdjacentHTML("beforeend", endOverlayHtml(result, loadNick()));
        const overlay = el.querySelector(".end-overlay")!;
        const rowsEl = overlay.querySelector(".lb-rows")!;
        const saveEl = overlay.querySelector(".end-save") as HTMLElement;
        const nickInput = overlay.querySelector(".end-nick") as HTMLInputElement;

        rowsEl.innerHTML = leaderboardRowsHtml(loadScores(), null);

        overlay.querySelector(".end-save-btn")!.addEventListener("click", () => {
          const name = (nickInput.value.trim() || "אנונימי").slice(0, NICK_MAX);
          saveNick(name);
          const entry: ScoreEntry = {
            name,
            score: result.score,
            intercepted: result.intercepted,
            mistakes: result.mistakes,
            ts: Date.now(),
          };
          const { rank, board } = saveScore(entry);
          rowsEl.innerHTML = leaderboardRowsHtml(board, entry.ts);
          saveEl.innerHTML = `<div class="end-saved">נשמרת בטבלה — מקום ${rank}</div>`;
        });

        overlay.querySelector(".end-replay")!.addEventListener("click", () => {
          nav.go(createGameScreen);
        });
      }

      // start once the arena has a measured size
      requestAnimationFrame(() => engine?.start());

      (window as unknown as { __engine: GameEngine | null }).__engine = engine;

      el.querySelector(".debug-end")!.addEventListener("click", () => {
        engine?.finish();
      });
    },
    unmount() {
      engine?.destroy();
      engine = null;
      el?.remove();
    },
  };
}
