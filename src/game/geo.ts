// Geography in normalized [0,1] space relative to the arena box.
// x = left→right, y = top→bottom. Tuned to the satellite map of Israel
// rendered object-fit:cover at the 375×812 mobile preview; refine in-app
// via the debug overlay if the visible crop shifts.

export interface Vec {
  x: number;
  y: number;
}

export interface City {
  name: string;
  pos: Vec;
}

// Rough Israel outline (north at top). ~12 points, clockwise from the
// north (Galilee) panhandle down to Eilat and back up the coast.
export const BORDER: Vec[] = [
  { x: 0.46, y: 0.05 }, // north tip (Metula)
  { x: 0.55, y: 0.09 }, // Golan
  { x: 0.55, y: 0.16 }, // Sea of Galilee / east
  { x: 0.5, y: 0.22 }, // Jordan valley
  { x: 0.55, y: 0.3 }, // Dead Sea north
  { x: 0.53, y: 0.4 }, // Arava east
  { x: 0.515, y: 0.55 }, // Arava lower
  { x: 0.515, y: 0.61 }, // Eilat tip (south point)
  { x: 0.48, y: 0.55 }, // Negev west
  { x: 0.43, y: 0.42 }, // Gaza envelope / west Negev
  { x: 0.41, y: 0.28 }, // coast south of Tel Aviv
  { x: 0.42, y: 0.18 }, // coast Tel Aviv
  { x: 0.42, y: 0.1 }, // coast Haifa / north
];

export const CITIES: City[] = [
  { name: "חיפה", pos: { x: 0.44, y: 0.13 } },
  { name: "תל אביב", pos: { x: 0.45, y: 0.21 } },
  { name: "ירושלים", pos: { x: 0.5, y: 0.25 } },
  { name: "באר שבע", pos: { x: 0.47, y: 0.36 } },
  { name: "אילת", pos: { x: 0.51, y: 0.59 } },
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

// Random point on the arena edge, biased to where hostiles realistically
// approach (sea to the west, borders to north/east/south). Returns a point
// just outside the border so the aircraft flies inward.
export function randomSpawnEdge(): Vec {
  const side = Math.random();
  if (side < 0.4) {
    // west (Mediterranean) — most common
    return { x: -0.05, y: 0.14 + Math.random() * 0.44 };
  } else if (side < 0.65) {
    // north-west — enters high over the sea and runs inland toward the
    // northern cities. Replaces the old straight-north spawn (azimuth
    // ~340–045), which dropped enemies onto the top HUD/intel feed and
    // left no time or space to intercept near Haifa/Tel Aviv.
    return { x: -0.05, y: -0.04 + Math.random() * 0.16 };
  } else if (side < 0.9) {
    // east — start at ~azimuth 060 (not 050); the top-right corner sits
    // under the lives HUD where an incoming craft is hard to spot.
    return { x: 1.05, y: 0.18 + Math.random() * 0.42 };
  } else {
    // south
    return { x: 0.35 + Math.random() * 0.3, y: 1.05 };
  }
}

export function randomCity(): City {
  return CITIES[Math.floor(Math.random() * CITIES.length)];
}
