/**
 * Geometry of the wall shelf, in world units.
 *
 * A modest bedroom shelf rather than a display case: short planks, shallow, and
 * stacked closely enough that it reads as flat-pack bought for a specific gap
 * in a wall.
 *
 * Nothing here reaches into the registries — callers pass counts and heights in,
 * which keeps the layout a pure function of numbers.
 */
export const SHELF = {
  /**
   * Length of each plank. Roughly 3:1 with its depth, which is what a real
   * wall shelf is — a long thin shelf reads as a rail, and makes everything on
   * it look like a speck.
   */
  width: 2.85,
  /** Depth of a plank. */
  depth: 0.3,
  /** Thickness of a plank. */
  plank: 0.06,
  /** Vertical distance between one plank and the next. */
  deckGap: 0.86,
  /** Height of the top plank's surface. */
  topDeckY: 1.3,
  /** How far the brackets drop below a plank. */
  bracketDrop: 0.24,
  /** How far a bracket's arm reaches out from the wall. */
  bracketReach: 0.18,
} as const

/** Y of the `row`-th plank's top surface, counted from the top. */
export function rowY(row: number): number {
  return SHELF.topDeckY - row * SHELF.deckGap
}

/** Y of the top surface of the lowest plank. */
export function lowestDeckY(rows: number): number {
  return rowY(Math.max(0, rows - 1))
}

/**
 * Where the brackets go under a plank, as x offsets. Three across a shelf this
 * long, inset from the ends.
 */
export function bracketOffsets(): number[] {
  const inset = SHELF.width / 2 - 0.34
  return [-inset, 0, inset]
}
