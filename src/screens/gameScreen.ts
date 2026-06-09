import type { Navigator, Screen } from "../core/screen.ts";
import { createEndScreen } from "./endScreen.ts";

const mapUrl = "/assets/map-israel.jpg";

const HEART = `<svg class="heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-10-9.2C.3 8.6 1.6 5 5 5c2 0 3.2 1.2 4 2.3C9.8 6.2 11 5 13 5c3.4 0 4.7 3.6 3 6.8C19.5 16.4 12 21 12 21z"/></svg>`;

// Phase 1 / map pass. Full-bleed map with a game-style floating HUD
// (lives top-right, timer top-center, score top-left). The active-game
// engine (aircraft, drag/Iron Dome, scoring) lands in the next phase.
export function createGameScreen(nav: Navigator): Screen {
  let el: HTMLElement;

  return {
    mount(root) {
      el = document.createElement("div");
      el.className = "screen game-screen";
      el.innerHTML = `
        <img class="game-map" src="${mapUrl}" alt="מפת ישראל" draggable="false" />
        <div class="arena-overlay">
          <div class="hud-panel hud-score">
            <span class="hud-label">ניקוד</span>
            <span class="hud-score-val">0</span>
          </div>
          <div class="hud-panel hud-timer"><span class="hud-timer-val">90</span></div>
          <div class="hud-lives">${HEART}${HEART}${HEART}</div>
        </div>
        <button class="btn-secondary debug-end">סיים תרחיש (debug)</button>
      `;
      el.querySelector(".debug-end")!.addEventListener("click", () => {
        nav.go((n) => createEndScreen(n, { score: 0, intercepted: 0, mistakes: 0 }));
      });
      root.appendChild(el);
    },
    unmount() {
      el?.remove();
    },
  };
}
