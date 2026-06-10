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
import { escapeHtml } from "../core/html.ts";
import { leaderboardRowsHtml, openScoreboard } from "./scoreboard.ts";

const mapUrl = "/assets/map-israel.svg";

const HEART = `<svg class="heart" viewBox="0 0 32 29" aria-hidden="true"><path d="M15.7415 5.3805L13.6226 3.13114C10.6884 0.0161835 5.92959 0.0161835 2.99535 3.13114C0.0611187 6.24609 0.0611187 11.2979 2.99535 14.4129L15.4252 27.6083C15.6848 27.8839 16.1034 27.8839 16.363 27.6083L28.7929 14.4129C31.7271 11.2979 31.7271 6.24609 28.7929 3.13114C25.8586 0.0161835 21.0999 0.0161835 18.1656 3.13114L16.0468 5.3805C15.9627 5.46978 15.8256 5.46978 15.7415 5.3805Z"/></svg>`;

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

function intelHtml(items: IntelItem[]): string {
  return items
    .map(
      (i) =>
        `<div class="intel-item intel-${i.allegiance}${i.tone ? ` intel-${i.tone}` : ""}"><span class="intel-dot"></span><span>${escapeHtml(i.text)}</span></div>`,
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
      <button class="btn-secondary end-scoreboard">טבלת ניקוד</button>
    </div>`;
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
        <div class="game-stage">
          <img class="game-map" src="${mapUrl}" alt="מפת ישראל" draggable="false" />
          <div class="game-arena"></div>
          <div class="arena-overlay">
            <div class="hud-lives">${heartsHtml(SCENARIO.lives)}</div>
            <div class="hud-panel hud-timer"><span class="hud-timer-val">90</span></div>
            <div class="hud-readouts">
              <div class="hud-readout">
                <span class="hud-label">ניקוד</span>
                <span class="hud-score-val">0</span>
              </div>
              <div class="hud-readout">
                <span class="hud-label">יירוטים</span>
                <span class="hud-intercept-val">0</span>
              </div>
            </div>
            <div class="intel-feed"></div>
          </div>
        </div>
        <button class="btn-secondary debug-end">סיים את המשחק</button>
      `;
      root.appendChild(el);

      const scoreEl = el.querySelector(".hud-score-val")!;
      const interceptEl = el.querySelector(".hud-intercept-val")!;
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
        onIntercepted: (n) => (interceptEl.textContent = String(n)),
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

        rowsEl.innerHTML = `<div class="lb-empty">טוען טבלה…</div>`;
        loadScores().then((board) => {
          rowsEl.innerHTML = leaderboardRowsHtml(board, null);
        });

        let savedTs: number | null = null;
        const saveBtn = overlay.querySelector(
          ".end-save-btn",
        ) as HTMLButtonElement;

        // Can't save a score without a name: keep the button disabled until the
        // player types something.
        const syncSaveEnabled = (): void => {
          saveBtn.disabled = nickInput.value.trim().length === 0;
        };
        syncSaveEnabled();
        nickInput.addEventListener("input", syncSaveEnabled);

        saveBtn.addEventListener("click", async () => {
          const name = nickInput.value.trim().slice(0, NICK_MAX);
          if (!name) return; // guard: button is disabled, but be safe
          saveNick(name);
          const entry: ScoreEntry = {
            name,
            score: result.score,
            intercepted: result.intercepted,
            mistakes: result.mistakes,
            ts: Date.now(),
          };
          saveBtn.disabled = true;
          saveBtn.textContent = "שומר…";
          const { rank, board, shared } = await saveScore(entry);
          savedTs = entry.ts;
          rowsEl.innerHTML = leaderboardRowsHtml(board, entry.ts);
          saveEl.innerHTML = `<div class="end-saved">${
            shared ? "נשמרת בטבלה" : "נשמר מקומית"
          } — מקום ${rank}</div>`;
        });

        overlay.querySelector(".end-replay")!.addEventListener("click", () => {
          nav.go(createGameScreen);
        });

        overlay
          .querySelector(".end-scoreboard")!
          .addEventListener("click", () => openScoreboard(savedTs));
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
