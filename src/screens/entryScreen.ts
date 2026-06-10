import type { Navigator, Screen } from "../core/screen.ts";
import { createGameScreen } from "./gameScreen.ts";
import { openScoreboard } from "./scoreboard.ts";
import { unlockAudio } from "../game/sound.ts";

export function createEntryScreen(nav: Navigator): Screen {
  let el: HTMLElement;

  return {
    mount(root) {
      el = document.createElement("div");
      el.className = "screen entry-screen";
      el.innerHTML = `
        <img class="entry-logo" src="/assets/logo.png" alt="סמל מערך הבקרה האווירית" draggable="false" />
        <h1 class="entry-title">מערך הבקרה האווירית</h1>
        <p class="entry-subtitle">סימולטור משימה</p>
        <button class="btn-primary entry-start">התחל משחק</button>
        <button class="btn-secondary entry-scoreboard">טבלת ניקוד</button>
        <p class="entry-tagline">הגן על שמי המדינה!</p>
      `;
      el.querySelector(".entry-start")!.addEventListener("click", () => {
        // Unlock audio synchronously inside this tap — iOS won't resume the
        // AudioContext from the later requestAnimationFrame in engine.start().
        unlockAudio();
        nav.go(createGameScreen);
      });
      el.querySelector(".entry-scoreboard")!.addEventListener("click", () =>
        openScoreboard(),
      );
      root.appendChild(el);
    },
    unmount() {
      el?.remove();
    },
  };
}
