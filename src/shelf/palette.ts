/**
 * Colours for the shelf and the props. Kept in one place so the whole scene can
 * be re-lit without hunting through geometry files.
 *
 * The palette deliberately echoes the two games: warm wood so the pixel art and
 * the card art both read against it, plus a little neon for the arcade cabinet.
 */
export const PALETTE = {
  woodDeckTop: '#8a6045',
  woodDeckFront: '#73503a',
  woodDeckEdge: '#9d7657',
  woodSide: '#6f4227',
  woodSideOuter: '#5c3520',
  woodBack: '#3a2317',
  wallTop: '#2a1b33',
  wallBottom: '#150d1f',
  floor: '#1b1424',
  brass: '#d9a441',
  ghost: '#4c3a5e',
} as const

/** Shared emissive tints, so the props and the shelf lighting agree. */
export const GLOW = {
  arcadePink: '#ff4d8d',
  arcadeCyan: '#5ce1e6',
  arcadeGold: '#ffd166',
  cardViolet: '#b98cff',
} as const
