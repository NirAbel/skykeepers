import { iconFor, F16_ICON, BATTERY_ICON } from "../game/icons.ts";
import { SCENARIO } from "../game/config.ts";

// One legend row: a colored craft icon next to its Hebrew description. `color`
// is applied to the icon wrapper exactly like the in-game craft wrappers, so
// the swatch matches what the player sees on the map.
function legendRow(icon: string, color: string, name: string, desc: string): string {
  return `
    <div class="instr-row">
      <span class="instr-icon" style="color:${color}">${icon}</span>
      <span class="instr-text"><strong>${name}</strong>${desc}</span>
    </div>`;
}

// Game-instructions modal, openable from the entry screen. Mirrors the
// scoreboard modal: overlay + card, closes on ✕, backdrop tap, or Escape.
export function openInstructions(): void {
  if (document.querySelector(".instr-modal")) return; // already open

  const seconds = Math.round(SCENARIO.durationMs / 1000);
  const lives = SCENARIO.lives;

  const enemies =
    legendRow(
      iconFor("drone"),
      "var(--red)",
      'כטב"ם נפץ עוין',
      " — רחפן תוקף. יש ליירט לפני שיחצה את הגבול.",
    ) +
    legendRow(
      iconFor("fighter"),
      "var(--red)",
      "מטוס קרב עוין",
      " — מהיר ומסוכן. יש ליירט.",
    ) +
    legendRow(
      iconFor("missile"),
      "var(--red)",
      "טיל שיוט",
      " — האיום המהיר ביותר, נפוץ יותר לקראת הסוף. יש ליירט.",
    );

  const friendlies = legendRow(
    iconFor("airliner"),
    "var(--white)",
    "מטוס אזרחי / נוסעים",
    " — ידידותי! אסור לפגוע בו. פגיעה במטוס אזרחי = אסון ואיבוד חיים.",
  );

  const tools =
    legendRow(
      F16_ICON,
      "var(--cyan)",
      'מטוס יירוט F-16',
      " — שני מטוסי הקרב שלך מסיירים לאורך הגבול.",
    ) +
    legendRow(
      BATTERY_ICON,
      "var(--green)",
      "סוללת כיפת ברזל",
      " — שתי סוללות שמיירטות מטרות בתוך טווח הראדאר בלבד.",
    );

  const modal = document.createElement("div");
  modal.className = "instr-modal";
  modal.innerHTML = `
    <div class="instr-card">
      <div class="instr-head">
        <span class="instr-title">הוראות המשחק</span>
        <button class="instr-close" aria-label="סגור">✕</button>
      </div>
      <div class="instr-body">
        <section class="instr-section">
          <h3>המטרה</h3>
          <p>הגן על ערי ישראל מפני איומים אוויריים במשך ${seconds} שניות.
             יש לך ${lives} חיים — כל פגיעה באזרחים או כל איום שחוצה את הגבול
             עולה חיים אחד.</p>
        </section>

        <section class="instr-section">
          <h3>איומים — יש ליירט (אדום)</h3>
          ${enemies}
        </section>

        <section class="instr-section">
          <h3>אזרחים — אין לפגוע (לבן)</h3>
          ${friendlies}
        </section>

        <section class="instr-section">
          <h3>הכלים שלך</h3>
          ${tools}
        </section>

        <section class="instr-section">
          <h3>איך מיירטים</h3>
          <ul class="instr-list">
            <li><strong>מטוס קרב:</strong> הקש על מטוס F-16 כדי לבחור אותו,
                ואז הקש על איום — המטוס ימריא וייירט. אפשר גם לגרור קו ממטוס
                הקרב ישירות אל האיום.</li>
            <li><strong>כיפת ברזל:</strong> הקש על סוללה כדי לפתוח את טווח
                הראדאר שלה, ואז הקש על איום שנמצא בתוך הטווח כדי לשגר מיירט.
                לאחר שיגור הסוללה נטענת מחדש לרגע.</li>
            <li>שים לב לעדכוני המודיעין בצד המסך — הם מתריעים על איומים מתקרבים
                ועל כיוון הגעתם.</li>
          </ul>
        </section>

        <section class="instr-section">
          <h3>ניקוד</h3>
          <ul class="instr-list">
            <li>יירוט איום: <strong>+800</strong> נקודות (ובונוס מהירות על יירוט מהיר).</li>
            <li>איום שחוצה את הגבול: <strong>−600</strong> נקודות ואיבוד חיים.</li>
            <li>פגיעה במטוס אזרחי: איבוד חיים — אסון.</li>
          </ul>
        </section>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const close = (): void => {
    modal.remove();
    document.removeEventListener("keydown", onKey);
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") close();
  };
  document.addEventListener("keydown", onKey);
  modal.querySelector(".instr-close")!.addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });
}
