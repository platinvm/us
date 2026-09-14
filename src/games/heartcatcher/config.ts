/* ==========================================================================
   ♥  EDIT EVERYTHING IN THIS BLOCK — no other file needs touching  ♥
   ========================================================================== */

/** Her name or nickname. */
export const HER_NAME = 'Amore'

/** Your name. */
export const YOUR_NAME = 'Me'

/**
 * Little notes that pop up as hearts are caught. Add or remove freely — the
 * game paces itself to however many you write.
 */
export const NOTES: string[] = [
  "Two years ago I was hoping you'd text back. You did. Everything good started there.",
  'You laugh at your own jokes before you finish them. It is my favourite sound.',
  'Boring Tuesdays stopped being boring somewhere around you.',
  'I would pick you again today, and tomorrow, and on all the days I am bad at texting.',
]

/** The big one, shown when she wins. */
export const FINAL_MESSAGE =
  'Happy second anniversary. Thank you for catching me too.'

/* ========================================================================== */

export const HEARTS_TO_WIN = 40
export const LIVES = 3

/**
 * The handheld's screen, at twice its native 160x144.
 *
 * Everything in the engine is in these units: the canvas is this size, and this
 * canvas is the texture on the little screen on the shelf.
 */
export const VIEW_W = 320
export const VIEW_H = 288

/** Height of the strip of ground along the bottom. */
export const GROUND = 26

export const PLAYER_W = 24
export const PLAYER_H = 32

/** Horizontal speed while a direction is held. */
export const MOVE_SPEED = 190

/**
 * The four greens the screen can actually produce.
 *
 * The whole game is drawn from these, not as a style filter but because that is
 * genuinely all the hardware had. Anything that needs to read as "gold" has to
 * earn it with shape and motion instead of colour.
 */
export const DMG = {
  lightest: '#9bbc0f',
  light: '#8bac0f',
  dark: '#306230',
  darkest: '#0f380f',
} as const
