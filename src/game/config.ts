import type { CraftSpec } from "./types.ts";

// Easy-level roster. Hostiles head for cities; friendlies/neutrals transit
// and must NOT be intercepted. Speeds are normalized units/sec (arena
// height ≈ 1.0), so 0.04 ≈ crosses the map in ~25s.
export const SPECS: Record<string, CraftSpec> = {
  drone: {
    kind: "drone",
    allegiance: "hostile",
    speed: 0.026,
    color: "var(--red)",
    label: "כטב\"ם עוין",
    intel: "רחפן נפץ",
    points: 800,
    spawnWeight: 3,
  },
  fighter: {
    kind: "fighter",
    allegiance: "hostile",
    speed: 0.04,
    color: "var(--red)",
    label: "מטוס קרב עוין",
    intel: "מטוס קרב עוין",
    points: 800,
    spawnWeight: 2,
  },
  missile: {
    kind: "missile",
    allegiance: "hostile",
    speed: 0.055,
    color: "var(--yellow)",
    label: "טיל שיוט",
    intel: "טיל שיוט",
    points: 800,
    spawnWeight: 0.8,
  },
  airliner: {
    kind: "airliner",
    allegiance: "neutral",
    speed: 0.028,
    color: "var(--white)",
    label: "מטוס נוסעים",
    intel: "מטוס נוסעים",
    points: -400,
    spawnWeight: 1.5,
  },
  helicopter: {
    kind: "helicopter",
    allegiance: "friendly",
    speed: 0.032,
    color: "var(--cyan)",
    label: "מטוס אזרחי",
    intel: "מטוס אזרחי",
    points: -400,
    spawnWeight: 1,
  },
};

// Scoring per spec §4.7
export const SCORING = {
  speedBonus: 200, // intercept within speedBonusMs of the enemy appearing
  speedBonusMs: 5000,
  breach: -600, // hostile crossed the border without being intercepted
  friendlyHitLives: 1, // life lost for hitting a friendly/neutral
  breachLives: 1, // life lost for a border breach
};

export const SPEC_LIST = Object.values(SPECS);

// Scenario tuning (easy level).
export const SCENARIO = {
  durationMs: 90_000,
  lives: 3,
  firstSpawnDelayMs: 1500, // grace period before the first contact
  spawnIntervalMs: [2400, 4000] as [number, number], // random gap between spawns
  maxConcurrent: 5,
  interceptRadius: 0.07, // tap within this normalized radius destroys craft
};

// Two F-16 patrols inside the border — drag onto an enemy to intercept.
// north covers Galilee/Haifa; south covers the Negev/Eilat approaches.
export const FIGHTERS = [
  { home: { x: 0.41, y: 0.11 }, speed: 0.11 }, // north
  { home: { x: 0.48, y: 0.47 }, speed: 0.11 }, // south
];

// Two Iron Dome batteries with radar coverage — can only hit enemies inside
// their radar circle. radarRadius is normalized to arena WIDTH.
export const BATTERIES = [
  { pos: { x: 0.43, y: 0.22 }, radarRadius: 0.33 }, // left-middle, near Tel Aviv
  { pos: { x: 0.51, y: 0.36 }, radarRadius: 0.33 }, // middle, east of Beer Sheva
];

export const DOME = {
  missileSpeed: 0.16, // normalized units/sec
  reloadMs: 1200, // battery locked while firing + this reload
  hitPx: 24,
};

export const INTERCEPT = {
  fighterHitPx: 26, // contact distance for an F-16 kill
  returnSpeedMul: 1.5,
  tapRadiusPx: 38, // how close a tap/drop must be to grab an enemy/unit
  fighterRangePx: 165, // F-16 reach — only enemies inside can be sent
  patrolRadiusPx: 20, // orbit radius while loitering
  patrolSpeed: 0.8, // radians/sec around the patrol anchor
  tapSlopPx: 9, // movement under this = a tap, not a drag
};

export function pickSpec(): CraftSpec {
  const total = SPEC_LIST.reduce((s, c) => s + c.spawnWeight, 0);
  let r = Math.random() * total;
  for (const spec of SPEC_LIST) {
    r -= spec.spawnWeight;
    if (r <= 0) return spec;
  }
  return SPEC_LIST[0];
}
