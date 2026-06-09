import type { Navigator, Screen } from "../core/screen.ts";
import { createEntryScreen } from "./entryScreen.ts";

export interface GameResult {
  score: number;
  intercepted: number;
  mistakes: number;
}

// Phase 1 stub. Recruitment popup + score-tiered copy + phone validation
// (spec 5.1-5.3, 7.6) land in a later phase.
export function createEndScreen(nav: Navigator, result: GameResult): Screen {
  let el: HTMLElement;
  const success = result.mistakes < 3;

  return {
    mount(root) {
      el = document.createElement("div");
      el.className = "screen end-screen";
      el.innerHTML = `
        <h2 class="end-title ${success ? "is-success" : "is-fail"}">
          ${success ? "הושלם בהצלחה" : "הסימולציה הסתיימה"}
        </h2>
        <div class="end-score">${result.score}</div>
        <div class="end-cards">
          <div class="end-card"><span>יורטו</span><strong>${result.intercepted}</strong></div>
          <div class="end-card"><span>טעויות</span><strong>${result.mistakes}/3</strong></div>
        </div>
        <button class="btn-primary end-replay">שחק שוב</button>
      `;
      el.querySelector(".end-replay")!.addEventListener("click", () => {
        nav.go(createEntryScreen);
      });
      root.appendChild(el);
    },
    unmount() {
      el?.remove();
    },
  };
}
