import type { Vec } from "./geo.ts";

export type Allegiance = "hostile" | "friendly" | "neutral";

export type CraftKind =
  | "drone"
  | "fighter"
  | "missile"
  | "airliner"
  | "helicopter";

export interface CraftSpec {
  kind: CraftKind;
  allegiance: Allegiance;
  speed: number; // normalized units per second
  color: string;
  label: string; // Hebrew label for identification
  intel: string; // short Hebrew name for the intelligence feed (e.g. "רחפן נפץ")
  points: number; // score for correctly intercepting (hostile) — penalty if friendly/neutral hit
  spawnWeight: number; // relative spawn probability
}

export interface Craft {
  id: number;
  spec: CraftSpec;
  pos: Vec;
  vel: Vec; // normalized units per second
  heading: number; // degrees, for icon rotation
  el: HTMLElement;
  alive: boolean;
  crossed: boolean;
  engagedBy: number | null; // interceptor id that has claimed this target
  spawnMs: number; // engine elapsed time when this craft appeared
}

export type FighterState = "patrol" | "engaging" | "returning";

export interface Fighter {
  id: number;
  home: Vec;
  pos: Vec;
  speed: number;
  el: HTMLElement;
  iconEl: HTMLElement;
  state: FighterState;
  target: Craft | null;
  patrolAngle: number; // radians, for the loiter orbit
}

export interface DomeMissile {
  pos: Vec;
  vel: Vec;
  target: Craft;
  el: HTMLElement;
}

export interface Battery {
  id: number;
  pos: Vec;
  radarRadius: number; // normalized to arena WIDTH
  el: HTMLElement;
  radarEl: HTMLElement;
  ready: boolean;
  missile: DomeMissile | null;
}
