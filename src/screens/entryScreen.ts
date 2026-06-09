import type { Navigator, Screen } from "../core/screen.ts";
import { createGameScreen } from "./gameScreen.ts";

export function createEntryScreen(nav: Navigator): Screen {
  let el: HTMLElement;

  return {
    mount(root) {
      el = document.createElement("div");
      el.className = "screen entry-screen";
      el.innerHTML = `
        <div class="entry-logo" aria-hidden="true"></div>
        <h1 class="entry-title">מערך הבקרה האווירית</h1>
        <p class="entry-subtitle">סימולטור משימה</p>
        <button class="btn-primary entry-start">התחל משחק</button>
        <p class="entry-tagline">הגן על שמי המדינה!</p>
      `;
      el.querySelector(".entry-start")!.addEventListener("click", () => {
        nav.go(createGameScreen);
      });
      root.appendChild(el);
    },
    unmount() {
      el?.remove();
    },
  };
}
