// Geography in normalized [0,1] space relative to the arena box.
// x = left→right, y = top→bottom. Coordinates are derived directly from the
// vector map (public/assets/map-israel.svg, 1080×1920 viewBox): the border
// is sampled from the country outline path and the cities from the marker
// circles, both divided by the viewBox size. Refine in-app via #debug.

export interface Vec {
  x: number;
  y: number;
}

export interface City {
  name: string;
  pos: Vec;
}

// Israel outline (north at top), sampled clockwise from the north-east down
// the Jordan-valley/Arava border to the Eilat tip, back up the Mediterranean
// coast, and across the northern border. Traced from the SVG country path.
export const BORDER: Vec[] = [
  { x: 0.681, y: 0.249 },
  { x: 0.651, y: 0.261 },
  { x: 0.626, y: 0.279 },
  { x: 0.601, y: 0.29 },
  { x: 0.583, y: 0.294 },
  { x: 0.578, y: 0.309 },
  { x: 0.572, y: 0.341 },
  { x: 0.562, y: 0.394 },
  { x: 0.571, y: 0.446 },
  { x: 0.548, y: 0.511 },
  { x: 0.545, y: 0.547 },
  { x: 0.535, y: 0.582 },
  { x: 0.516, y: 0.596 },
  { x: 0.504, y: 0.623 },
  { x: 0.471, y: 0.667 },
  { x: 0.466, y: 0.711 },
  { x: 0.454, y: 0.736 },
  { x: 0.448, y: 0.761 },
  { x: 0.423, y: 0.811 },
  { x: 0.401, y: 0.829 }, // Eilat tip (south point)
  { x: 0.395, y: 0.796 },
  { x: 0.315, y: 0.658 },
  { x: 0.275, y: 0.591 }, // west Negev / Gaza coast
  { x: 0.374, y: 0.391 }, // coast near Tel Aviv
  { x: 0.432, y: 0.271 }, // coast near Haifa
  { x: 0.485, y: 0.221 }, // north
  { x: 0.529, y: 0.229 },
  { x: 0.558, y: 0.225 },
  { x: 0.573, y: 0.191 },
  { x: 0.586, y: 0.192 },
  { x: 0.611, y: 0.181 },
  { x: 0.653, y: 0.188 },
  { x: 0.672, y: 0.195 },
  { x: 0.68, y: 0.218 },
];

export const CITIES: City[] = [
  { name: "חיפה", pos: { x: 0.429, y: 0.275 } },
  { name: "תל אביב", pos: { x: 0.372, y: 0.391 } },
  { name: "ירושלים", pos: { x: 0.485, y: 0.443 } },
  { name: "באר שבע", pos: { x: 0.376, y: 0.53 } },
  { name: "אילת", pos: { x: 0.406, y: 0.816 } },
];

// Ray-casting point-in-polygon. p inside BORDER?
export function pointInPolygon(p: Vec, poly: Vec[] = BORDER): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    const intersects =
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function dist(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// --- entry edges (just outside the border, so craft fly inward) ---------
function westEdge(): Vec {
  // Mediterranean coast band, Haifa down toward the Gaza envelope.
  return { x: -0.05, y: 0.28 + Math.random() * 0.4 };
}
function northWestEdge(): Vec {
  // high over the sea, running inland toward the northern cities.
  return { x: -0.05, y: 0.12 + Math.random() * 0.14 };
}
function eastEdge(): Vec {
  // Jordan-valley border; enters below the top-right HUD so it stays visible.
  return { x: 1.05, y: 0.34 + Math.random() * 0.36 };
}
function southEdge(): Vec {
  // up from the Negev / Eilat approaches.
  return { x: 0.3 + Math.random() * 0.18, y: 1.05 };
}
function northEdge(): Vec {
  // down from the northern border — azimuth ~330–360. The new map shows the
  // north, so this vector is now in play (it was avoided on the old map).
  return { x: 0.4 + Math.random() * 0.2, y: -0.05 };
}

// Pick where a craft enters, by threat type and how far the scenario has run.
// The opening leans on the western (sea) approach so it stays readable; as
// progress climbs, the north and south vectors open up so threats arrive from
// several directions at once. Cruise missiles bore in from the eastern border
// (with a few slipping down from the north late game), forcing the player to
// cover the east with batteries while patrols hold the sea and the Negev.
export function spawnOrigin(
  kind: string,
  allegiance: string,
  progress: number,
): Vec {
  if (allegiance === "hostile" && kind === "missile") {
    if (progress > 0.45 && Math.random() < 0.25) return northEdge();
    return eastEdge();
  }
  // Spread the threat across all four approaches so the player must watch
  // every sector and juggle both patrols and batteries — not just camp the
  // sea. The coast leads slightly; north/east/south each carry a real share
  // that grows as the scenario heats up.
  const choices: Array<{ edge: () => Vec; w: number }> = [
    { edge: westEdge, w: 1.6 }, // Mediterranean coast
    { edge: northWestEdge, w: 0.8 }, // high over the sea
    { edge: northEdge, w: 1.3 + 0.6 * progress },
    { edge: eastEdge, w: 1.2 + 0.6 * progress },
    { edge: southEdge, w: 1.0 + 0.6 * progress },
  ];
  const total = choices.reduce((s, c) => s + c.w, 0);
  let r = Math.random() * total;
  for (const c of choices) {
    r -= c.w;
    if (r <= 0) return c.edge();
  }
  return westEdge();
}

export function randomCity(): City {
  return CITIES[Math.floor(Math.random() * CITIES.length)];
}
