import type { Battery, Craft, CraftSpec, Fighter } from "./types.ts";
import type { Vec } from "./geo.ts";
import {
  pointInPolygon,
  randomSpawnEdge,
  randomCity,
} from "./geo.ts";
import {
  SCENARIO,
  DIFFICULTY,
  SCORING,
  pickSpec,
  FIGHTERS,
  BATTERIES,
  DOME,
  INTERCEPT,
} from "./config.ts";
import { iconFor, F16_ICON, BATTERY_ICON, DOME_MISSILE_ICON } from "./icons.ts";

export interface GameResult {
  score: number;
  intercepted: number;
  mistakes: number;
}

export interface IntelItem {
  id: number;
  text: string; // Hebrew, e.g. "רחפן נפץ מגיע ממזרח"
  allegiance: "hostile" | "friendly" | "neutral";
}

export interface EngineCallbacks {
  onScore(score: number): void;
  onTime(secondsLeft: number): void;
  onLives(lives: number): void;
  onIntel(items: IntelItem[]): void;
  onEnd(result: GameResult): void;
}

export class GameEngine {
  private crafts: Craft[] = [];
  private fighters: Fighter[] = [];
  private batteries: Battery[] = [];
  private dragLine!: SVGLineElement;
  private rangeRing!: HTMLElement;

  private nextId = 1;
  private raf = 0;
  private lastTs = 0;
  private elapsed = 0;
  private spawnTimer = 0;
  private nextSpawnGap = 0;

  private score = 0;
  private intercepted = 0;
  private mistakes = 0;
  private lives = SCENARIO.lives;
  private running = false;
  private lastSecondShown = -1;
  private lastIntelSig = "";

  private selected: Battery | null = null;
  private selectedFighter: Fighter | null = null;
  private dragging: Fighter | null = null;
  private dragStart: Vec | null = null;
  private dragMoved = false;

  constructor(
    private arena: HTMLElement,
    private cb: EngineCallbacks,
  ) {}

  start(): void {
    this.running = true;
    this.nextSpawnGap = SCENARIO.firstSpawnDelayMs;
    this.buildUnits();
    this.cb.onScore(0);
    this.cb.onLives(this.lives);
    this.cb.onTime(Math.ceil(SCENARIO.durationMs / 1000));
    this.arena.addEventListener("pointerdown", this.onDown);
    this.arena.addEventListener("pointermove", this.onMove);
    this.arena.addEventListener("pointerup", this.onUp);
    this.arena.addEventListener("pointercancel", this.onUp);
    this.raf = requestAnimationFrame(this.tick);
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.arena.removeEventListener("pointerdown", this.onDown);
    this.arena.removeEventListener("pointermove", this.onMove);
    this.arena.removeEventListener("pointerup", this.onUp);
    this.arena.removeEventListener("pointercancel", this.onUp);
    this.arena.replaceChildren();
    this.crafts = [];
    this.fighters = [];
    this.batteries = [];
  }

  // --- setup -------------------------------------------------------------
  private buildUnits(): void {
    const { w, h } = this.box();

    // radar + dome batteries
    BATTERIES.forEach((b, i) => {
      const radarEl = document.createElement("div");
      radarEl.className = "radar";
      const r = b.radarRadius * w;
      radarEl.style.width = radarEl.style.height = `${r * 2}px`;
      radarEl.style.left = `${b.pos.x * w}px`;
      radarEl.style.top = `${b.pos.y * h}px`;
      this.arena.appendChild(radarEl);

      const el = document.createElement("div");
      el.className = "battery";
      el.innerHTML = `<span class="unit-icon">${BATTERY_ICON}</span>`;
      el.style.left = `${b.pos.x * w}px`;
      el.style.top = `${b.pos.y * h}px`;
      this.arena.appendChild(el);

      this.batteries.push({
        id: 1000 + i,
        pos: b.pos,
        radarRadius: b.radarRadius,
        el,
        radarEl,
        ready: true,
        missile: null,
      });
    });

    // F-16 patrols
    FIGHTERS.forEach((f, i) => {
      const el = document.createElement("div");
      el.className = "fighter";
      el.innerHTML = `<span class="unit-icon f16-icon">${F16_ICON}</span>`;
      el.style.left = `${f.home.x * w}px`;
      el.style.top = `${f.home.y * h}px`;
      this.arena.appendChild(el);
      this.fighters.push({
        id: 2000 + i,
        home: { ...f.home },
        pos: { ...f.home },
        speed: f.speed,
        el,
        iconEl: el.querySelector(".unit-icon") as HTMLElement,
        state: "patrol",
        target: null,
        patrolAngle: Math.random() * Math.PI * 2,
      });
    });

    // F-16 reach ring (shown only while a patrol is selected)
    this.rangeRing = document.createElement("div");
    this.rangeRing.className = "range-ring";
    const rr = INTERCEPT.fighterRangePx;
    this.rangeRing.style.width = this.rangeRing.style.height = `${rr * 2}px`;
    this.arena.appendChild(this.rangeRing);

    // drag line overlay
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "drag-layer");
    const line = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line",
    );
    line.setAttribute("class", "drag-line");
    svg.appendChild(line);
    this.arena.appendChild(svg);
    this.dragLine = line;
  }

  // --- geometry helpers --------------------------------------------------
  private box(): { w: number; h: number } {
    return { w: this.arena.clientWidth, h: this.arena.clientHeight };
  }
  private pxDist(a: Vec, b: Vec): number {
    const { w, h } = this.box();
    return Math.hypot((a.x - b.x) * w, (a.y - b.y) * h);
  }
  private toNorm(clientX: number, clientY: number): Vec {
    const r = this.arena.getBoundingClientRect();
    return { x: (clientX - r.left) / r.width, y: (clientY - r.top) / r.height };
  }

  // --- loop --------------------------------------------------------------
  // Scenario progress 0 → 1, used to ramp difficulty over time.
  private progress(): number {
    return Math.min(1, this.elapsed / SCENARIO.durationMs);
  }

  private randGap(): number {
    const t = this.progress();
    const lo = lerp(DIFFICULTY.spawnGapMsStart[0], DIFFICULTY.spawnGapMsEnd[0], t);
    const hi = lerp(DIFFICULTY.spawnGapMsStart[1], DIFFICULTY.spawnGapMsEnd[1], t);
    return lo + Math.random() * (hi - lo);
  }

  private maxConcurrent(): number {
    return Math.round(
      lerp(DIFFICULTY.maxConcurrentStart, DIFFICULTY.maxConcurrentEnd, this.progress()),
    );
  }

  private tick = (ts: number): void => {
    if (!this.running) return;
    if (!this.lastTs) this.lastTs = ts;
    const dt = Math.min((ts - this.lastTs) / 1000, 0.05);
    this.lastTs = ts;
    this.elapsed += dt * 1000;
    this.spawnTimer += dt * 1000;

    const secLeft = Math.max(
      0,
      Math.ceil((SCENARIO.durationMs - this.elapsed) / 1000),
    );
    if (secLeft !== this.lastSecondShown) {
      this.lastSecondShown = secLeft;
      this.cb.onTime(secLeft);
    }

    if (
      this.spawnTimer >= this.nextSpawnGap &&
      this.crafts.length < this.maxConcurrent() &&
      this.elapsed < SCENARIO.durationMs
    ) {
      this.spawnTimer = 0;
      this.nextSpawnGap = this.randGap();
      this.spawn();
    }

    this.updateCrafts(dt);
    this.updateFighters(dt);
    this.updateDome(dt);
    this.updateSelectionVisuals();
    this.maybeEmitIntel();

    if (this.elapsed >= SCENARIO.durationMs || this.lives <= 0) {
      this.end();
      return;
    }
    this.raf = requestAnimationFrame(this.tick);
  };

  // Hebrew compass bearing the craft is arriving FROM, based on its heading.
  private approachFrom(v: Vec): string {
    if (Math.abs(v.x) >= Math.abs(v.y)) return v.x >= 0 ? "ממערב" : "ממזרח";
    return v.y >= 0 ? "מצפון" : "מדרום";
  }

  // Push the live-enemy intelligence feed, but only when it actually changes.
  private maybeEmitIntel(): void {
    const items: IntelItem[] = this.crafts
      .filter((c) => c.alive)
      .map((c) => ({
        id: c.id,
        text: `${c.spec.intel} מגיע ${this.approachFrom(c.vel)}`,
        allegiance: c.spec.allegiance,
      }));
    const sig = items.map((i) => `${i.id}:${i.text}`).join("|");
    if (sig === this.lastIntelSig) return;
    this.lastIntelSig = sig;
    this.cb.onIntel(items);
  }

  // --- enemies -----------------------------------------------------------
  private spawn(): void {
    const spec = pickSpec();
    const origin = randomSpawnEdge();
    const target =
      spec.allegiance === "hostile"
        ? randomCity().pos
        : this.transitTarget(origin);
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const len = Math.hypot(dx, dy) || 1;
    const speedMul = lerp(
      DIFFICULTY.speedMulStart,
      DIFFICULTY.speedMulEnd,
      this.progress(),
    );
    const speed = spec.speed * speedMul;
    const vel: Vec = { x: (dx / len) * speed, y: (dy / len) * speed };
    const heading = (Math.atan2(vel.y, vel.x) * 180) / Math.PI + 90;

    const el = this.makeCraftEl(spec, heading);
    this.arena.appendChild(el);
    const craft: Craft = {
      id: this.nextId++,
      spec,
      pos: { ...origin },
      vel,
      heading,
      el,
      alive: true,
      crossed: false,
      engagedBy: null,
      spawnMs: this.elapsed,
    };
    this.positionCraft(craft);
    this.crafts.push(craft);
  }

  private transitTarget(origin: Vec): Vec {
    return { x: 1 - origin.x, y: 0.2 + Math.random() * 0.6 };
  }

  private makeCraftEl(spec: CraftSpec, heading: number): HTMLElement {
    const el = document.createElement("div");
    el.className = `craft craft-${spec.allegiance}`;
    el.style.color = spec.color;
    el.innerHTML = `<span class="craft-icon" style="transform:rotate(${heading}deg)">${iconFor(
      spec.kind,
    )}</span>`;
    return el;
  }

  private positionCraft(c: Craft): void {
    const { w, h } = this.box();
    c.el.style.left = `${c.pos.x * w}px`;
    c.el.style.top = `${c.pos.y * h}px`;
  }

  private updateCrafts(dt: number): void {
    for (const c of this.crafts) {
      if (!c.alive) continue;
      c.pos.x += c.vel.x * dt;
      c.pos.y += c.vel.y * dt;
      this.positionCraft(c);

      // mark whether an Iron Dome battery can reach this enemy
      const inDome = this.inAnyRadar(c.pos);
      c.el.classList.toggle("dome-in", inDome);
      c.el.classList.toggle("dome-out", !inDome);

      if (c.spec.allegiance === "hostile" && !c.crossed && pointInPolygon(c.pos)) {
        c.crossed = true;
        this.breach(c);
        continue;
      }
      if (
        c.pos.x < -0.15 ||
        c.pos.x > 1.15 ||
        c.pos.y < -0.15 ||
        c.pos.y > 1.15
      ) {
        c.alive = false;
        c.el.remove();
      }
    }
    this.crafts = this.crafts.filter((c) => c.alive);
  }

  private inAnyRadar(p: Vec): boolean {
    const { w } = this.box();
    return this.batteries.some(
      (b) => this.pxDist(p, b.pos) <= b.radarRadius * w,
    );
  }

  private breach(c: Craft): void {
    c.alive = false;
    c.el.classList.add("craft-breach");
    setTimeout(() => c.el.remove(), 300);
    this.score = Math.max(0, this.score + SCORING.breach);
    this.mistakes++;
    this.lives = Math.max(0, SCENARIO.lives - this.mistakes);
    this.cb.onScore(this.score);
    this.cb.onLives(this.lives);
    vibrate(120);
  }

  // resolve a kill caused by an interceptor reaching an enemy
  private resolveKill(c: Craft): void {
    c.alive = false;
    if (c.spec.allegiance === "hostile") {
      let gain = c.spec.points; // +800
      if (this.elapsed - c.spawnMs <= SCORING.speedBonusMs) {
        gain += SCORING.speedBonus; // +200 speed bonus
      }
      this.score += gain;
      this.intercepted++;
      c.el.classList.add("craft-hit");
      vibrate(40);
    } else {
      // friendly/neutral hit: costs a life only, no score penalty
      this.mistakes++;
      this.lives = Math.max(0, SCENARIO.lives - this.mistakes);
      this.cb.onLives(this.lives);
      c.el.classList.add("craft-wrong");
      vibrate(160);
    }
    this.cb.onScore(this.score);
    setTimeout(() => c.el.remove(), 300);
    this.crafts = this.crafts.filter((x) => x.alive);
  }

  // --- F-16 fighters -----------------------------------------------------
  private updateFighters(dt: number): void {
    const { w, h } = this.box();
    for (const f of this.fighters) {
      if (f.state === "engaging") {
        const t = f.target;
        if (!t || !t.alive) {
          this.releaseFighter(f);
          continue;
        }
        this.stepToward(f.pos, t.pos, f.speed * dt);
        this.faceToward(f, t.pos);
        if (this.pxDist(f.pos, t.pos) < INTERCEPT.fighterHitPx) {
          this.resolveKill(t);
          this.releaseFighter(f);
        }
      } else if (f.state === "returning") {
        this.stepToward(f.pos, f.home, f.speed * INTERCEPT.returnSpeedMul * dt);
        this.faceToward(f, f.home);
        if (this.pxDist(f.pos, f.home) < 4) {
          f.state = "patrol";
          f.el.classList.remove("busy");
        }
      } else {
        // patrol: loiter in a circle around the home anchor
        f.patrolAngle += INTERCEPT.patrolSpeed * dt;
        const rx = INTERCEPT.patrolRadiusPx / w;
        const ry = INTERCEPT.patrolRadiusPx / h;
        f.pos.x = f.home.x + Math.cos(f.patrolAngle) * rx;
        f.pos.y = f.home.y + Math.sin(f.patrolAngle) * ry;
        // face along the tangent of the orbit
        const ang =
          (Math.atan2(
            Math.cos(f.patrolAngle) * INTERCEPT.patrolRadiusPx,
            -Math.sin(f.patrolAngle) * INTERCEPT.patrolRadiusPx,
          ) *
            180) /
            Math.PI +
          90;
        f.iconEl.style.transform = `rotate(${ang}deg)`;
      }
      f.el.style.left = `${f.pos.x * w}px`;
      f.el.style.top = `${f.pos.y * h}px`;
    }
  }

  private engageFighter(f: Fighter, enemy: Craft): void {
    f.state = "engaging";
    f.target = enemy;
    enemy.engagedBy = f.id;
    f.el.classList.add("busy");
  }

  private releaseFighter(f: Fighter): void {
    if (f.target) f.target.engagedBy = null;
    f.target = null;
    f.state = "returning";
  }

  private stepToward(pos: Vec, dest: Vec, step: number): void {
    const dx = dest.x - pos.x;
    const dy = dest.y - pos.y;
    const len = Math.hypot(dx, dy) || 1;
    if (len <= step) {
      pos.x = dest.x;
      pos.y = dest.y;
    } else {
      pos.x += (dx / len) * step;
      pos.y += (dy / len) * step;
    }
  }

  private faceToward(f: Fighter, dest: Vec): void {
    const { w, h } = this.box();
    const ang =
      (Math.atan2((dest.y - f.pos.y) * h, (dest.x - f.pos.x) * w) * 180) /
        Math.PI +
      90;
    f.iconEl.style.transform = `rotate(${ang}deg)`;
  }

  // --- Iron Dome ---------------------------------------------------------
  private fireDome(bat: Battery, enemy: Craft): void {
    bat.ready = false;
    bat.el.classList.add("busy");
    enemy.engagedBy = bat.id;
    const el = document.createElement("div");
    el.className = "dome-missile";
    el.innerHTML = `<span class="unit-icon">${DOME_MISSILE_ICON}</span>`;
    this.arena.appendChild(el);
    bat.missile = { pos: { ...bat.pos }, vel: { x: 0, y: 0 }, target: enemy, el };
    vibrate(30);
  }

  private updateDome(dt: number): void {
    const { w, h } = this.box();
    for (const bat of this.batteries) {
      const m = bat.missile;
      if (!m) continue;
      if (!m.target.alive) {
        this.clearMissile(bat);
        continue;
      }
      this.stepToward(m.pos, m.target.pos, DOME.missileSpeed * dt);
      const ang =
        (Math.atan2((m.target.pos.y - m.pos.y) * h, (m.target.pos.x - m.pos.x) * w) *
          180) /
          Math.PI +
        90;
      m.el.style.left = `${m.pos.x * w}px`;
      m.el.style.top = `${m.pos.y * h}px`;
      (m.el.firstElementChild as HTMLElement).style.transform = `rotate(${ang}deg)`;
      if (this.pxDist(m.pos, m.target.pos) < DOME.hitPx) {
        this.resolveKill(m.target);
        this.clearMissile(bat);
      }
    }
  }

  private clearMissile(bat: Battery): void {
    if (bat.missile) {
      if (bat.missile.target) bat.missile.target.engagedBy = null;
      bat.missile.el.remove();
      bat.missile = null;
    }
    setTimeout(() => {
      bat.ready = true;
      bat.el.classList.remove("busy");
    }, DOME.reloadMs);
  }

  // --- selection visuals -------------------------------------------------
  // F-16 patrols can reach any enemy now (they just fly there), so there is
  // no reach ring or "reachable" hint to draw. Kept hidden defensively.
  private updateSelectionVisuals(): void {
    this.rangeRing.classList.remove("on");
  }

  // --- input -------------------------------------------------------------
  private enemyNear(p: Vec, radiusPx: number, filter?: (c: Craft) => boolean): Craft | null {
    let best: Craft | null = null;
    let bestD = radiusPx;
    for (const c of this.crafts) {
      if (!c.alive || c.engagedBy !== null) continue;
      if (filter && !filter(c)) continue;
      const d = this.pxDist(c.pos, p);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return best;
  }

  private onDown = (e: PointerEvent): void => {
    const p = this.toNorm(e.clientX, e.clientY);

    // 1) a selected fighter + tap on any enemy => fly out and engage
    if (this.selectedFighter && this.selectedFighter.state === "patrol") {
      const f = this.selectedFighter;
      const enemy = this.enemyNear(p, INTERCEPT.tapRadiusPx);
      if (enemy) {
        this.engageFighter(f, enemy);
        this.clearSelection();
        return;
      }
    }

    // 2) a selected battery + tap on an enemy: fire if it's inside the radar,
    //    otherwise keep the battery selected (radar stays open) and do nothing
    if (this.selected && this.selected.ready) {
      const bat = this.selected;
      const enemy = this.enemyNear(p, INTERCEPT.tapRadiusPx);
      if (enemy) {
        const inRange =
          this.pxDist(enemy.pos, bat.pos) <= bat.radarRadius * this.box().w;
        if (inRange) {
          this.fireDome(bat, enemy);
          this.clearSelection();
        }
        return; // swallow the tap either way — never deselect on an enemy tap
      }
    }

    // 3) tap on a ready battery => toggle selection
    for (const bat of this.batteries) {
      if (this.pxDist(p, bat.pos) < INTERCEPT.tapRadiusPx) {
        if (!bat.ready) return;
        const next = this.selected === bat ? null : bat;
        this.clearSelection();
        if (next) this.selectBattery(next);
        return;
      }
    }

    // 4) tap/drag on a patrolling fighter => select it + arm a drag
    for (const f of this.fighters) {
      if (f.state === "patrol" && this.pxDist(p, f.pos) < INTERCEPT.tapRadiusPx) {
        this.dragging = f;
        this.dragStart = p;
        this.dragMoved = false;
        this.clearSelection();
        this.selectFighter(f);
        return;
      }
    }

    // 5) empty tap => clear selection
    this.clearSelection();
  };

  private onMove = (e: PointerEvent): void => {
    if (!this.dragging || !this.dragStart) return;
    const p = this.toNorm(e.clientX, e.clientY);
    if (
      !this.dragMoved &&
      this.pxDist(p, this.dragStart) > INTERCEPT.tapSlopPx
    ) {
      this.dragMoved = true;
    }
    if (this.dragMoved) this.showDrag(this.dragging.pos, p);
  };

  private onUp = (e: PointerEvent): void => {
    const f = this.dragging;
    this.dragging = null;
    this.hideDrag();
    if (!f) return;
    if (!this.dragMoved) return; // a tap: leave the fighter selected
    const p = this.toNorm(e.clientX, e.clientY);
    const enemy = this.enemyNear(p, INTERCEPT.tapRadiusPx);
    if (enemy && f.state === "patrol") {
      this.engageFighter(f, enemy);
      this.clearSelection();
    }
  };

  private selectFighter(f: Fighter): void {
    this.selectedFighter = f;
    f.el.classList.add("selected");
  }

  private selectBattery(bat: Battery): void {
    this.selected = bat;
    bat.radarEl.classList.add("active");
  }

  private clearSelection(): void {
    if (this.selected) {
      this.selected.radarEl.classList.remove("active");
      this.selected = null;
    }
    if (this.selectedFighter) {
      this.selectedFighter.el.classList.remove("selected");
      this.selectedFighter = null;
    }
  }

  private showDrag(from: Vec, to: Vec): void {
    const { w, h } = this.box();
    this.dragLine.setAttribute("x1", String(from.x * w));
    this.dragLine.setAttribute("y1", String(from.y * h));
    this.dragLine.setAttribute("x2", String(to.x * w));
    this.dragLine.setAttribute("y2", String(to.y * h));
    this.dragLine.classList.add("on");
  }
  private hideDrag(): void {
    this.dragLine.classList.remove("on");
  }

  // dev-only: freeze/unfreeze the sim for inspection
  pause(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
  resume(): void {
    if (this.running) return;
    this.running = true;
    this.lastTs = 0;
    this.raf = requestAnimationFrame(this.tick);
  }

  // Force the scenario to end now, reporting the real score (used by the
  // debug "end" button so it shows actual points, not zeros).
  finish(): void {
    this.end();
  }

  // --- end ---------------------------------------------------------------
  private end(): void {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.arena.removeEventListener("pointerdown", this.onDown);
    this.arena.removeEventListener("pointermove", this.onMove);
    this.arena.removeEventListener("pointerup", this.onUp);
    this.arena.removeEventListener("pointercancel", this.onUp);
    this.cb.onEnd({
      score: this.score,
      intercepted: this.intercepted,
      mistakes: this.mistakes,
    });
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function vibrate(ms: number): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {
      /* ignore */
    }
  }
}
