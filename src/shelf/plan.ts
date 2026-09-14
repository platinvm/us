import { GAMES } from '../games/registry'

/**
 * One thing on a plank.
 *
 * Positions are written out by hand rather than computed from an index,
 * because the whole point is that nothing lines up. Things sit where someone
 * put them down: a nudge off centre, turned a few degrees, some pushed back
 * against the wall and some left hanging over the front edge.
 */
export type Placement = {
  kind: 'game' | 'decor'
  id: string
  /** Where along the plank it sits. */
  x: number
  /**
   * How far *above* the plank it sits — for things resting on other things.
   * The height of whatever it is standing on, in world units.
   */
  y?: number
  /** How far forward on the plank. Never quite the same as its neighbours. */
  z?: number
  /** Rotation about the vertical, in radians. */
  yaw?: number
  /** Roll, for things lying down rather than standing up. */
  roll?: number
  scale?: number
}

export type ShelfRow = Placement[]

/**
 * What sits where.
 *
 * Two planks. Nothing is spaced out: things are pushed into clusters with gaps
 * where the gaps happen to be, heights are stacked on top of each other rather
 * than everything starting from the plank, and several items overlap the ones
 * next to them or hang off an end. The games sit among it rather than being
 * laid out on display — a shelf that has been lived with, not arranged.
 */
const CURATED: ShelfRow[] = [
  // Top plank - the games, and whatever ended up next to them.
  [
    // A stack of books, pulled in from the end and forward off the wall.
    { kind: 'decor', id: 'books', x: -1.02, z: 0.015, yaw: 0.11, scale: 1.45 },
    // With the little plant parked on top of them.
    {
      kind: 'decor',
      id: 'succulent',
      x: -1.05,
      y: 0.174,
      z: 0.015,
      yaw: 0.45,
      scale: 1.5,
    },
    // Small enough to read as a handheld someone put down here, not a
    // centrepiece: scale 0.4 against the 1.5 the shelf's own clutter carries.
    { kind: 'game', id: 'heartcatcher', x: -0.55, z: 0.02, yaw: 0.22, scale: 0.4 },
    { kind: 'game', id: 'cardcollection', x: 0.0, z: -0.02, yaw: -0.18 },
    { kind: 'decor', id: 'keyRing', x: 0.5, z: 0.1, yaw: 0.6, scale: 1.4 },
    { kind: 'decor', id: 'candle', x: 0.78, z: -0.04, yaw: -0.44, scale: 1.35 },
    { kind: 'decor', id: 'tin', x: 1.15, z: 0.05, yaw: -0.7, scale: 1.45 },
  ],

  // Middle plank - the shelf things get put down on.
  [
    { kind: 'decor', id: 'heartsJar', x: -1.24, z: 0.02, yaw: 0.31, scale: 1.5 },
    // A second, smaller stack that a stone got left on.
    { kind: 'decor', id: 'books', x: -0.96, z: -0.01, yaw: -0.26, scale: 1.25 },
    {
      kind: 'decor',
      id: 'pebble',
      x: -1.0,
      y: 0.15,
      z: -0.01,
      yaw: -0.52,
      scale: 1.5,
    },
    { kind: 'decor', id: 'mug', x: -0.56, z: 0.03, yaw: 0.36, scale: 1.55 },
    { kind: 'decor', id: 'looseCards', x: -0.24, z: 0.07, yaw: 0.74, scale: 1.6 },
    { kind: 'decor', id: 'earbuds', x: 0.03, z: 0.06, yaw: -0.58, scale: 1.6 },
    // A photo propped up against the wall. Only barely rolled — anything
    // past a few degrees swings the bottom corner down through the plank, and
    // the shelf surface then cuts that corner clean off. The small lift is
    // what keeps the corner resting on the wood instead of inside it.
    {
      kind: 'decor',
      id: 'polaroid',
      x: 0.3,
      y: 0.01,
      z: -0.01,
      yaw: 0.2,
      roll: 0.05,
      scale: 1.5,
    },
    { kind: 'decor', id: 'clock', x: 0.66, z: 0.0, yaw: -0.32, scale: 1.5 },
    // The cactus sits here rather than up top, so it grows up towards the games
    // instead of standing in front of them.
    { kind: 'decor', id: 'cactus', x: 1.12, z: 0.02, yaw: 0.26, scale: 1.3 },
  ],
]

/**
 * The arrangement, with any game that is in the registry but missing from
 * `CURATED` appended to the top plank — so a new game can never silently fail
 * to appear.
 */
export function buildPlan(): ShelfRow[] {
  const rows = CURATED.map((row) => [...row])

  const placed = new Set(
    rows
      .flat()
      .filter((item): item is Placement & { kind: 'game' } => item.kind === 'game')
      .map((item) => item.id),
  )

  const missing = GAMES.filter((game) => !placed.has(game.id))
  if (missing.length === 0) return rows

  let cursor = rows[0].reduce(
    (rightmost, item) => Math.max(rightmost, item.x + 0.5),
    0,
  )

  for (const game of missing) {
    cursor += 0.72
    rows[0].push({
      kind: 'game',
      id: game.id,
      x: cursor,
      yaw: (Math.random() - 0.5) * 0.3,
    })
  }

  return rows
}
