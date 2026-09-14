import { GameBoy } from '../shelf/props/GameBoy'
import { CardBinder } from '../shelf/props/CardBinder'
import { defineGame } from './types'
import type { GameDefinition } from './types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  THE SHELF
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * This array is the games. Order is left to right on the top plank, and the
 * slot geometry, the shelf height and the camera framing are all derived from
 * it — there are no coordinates to hand-tune.
 *
 * To add a game:
 *
 *   1. Build its prop in `src/shelf/props/`. It is both the object on the shelf
 *      and the game itself, so it takes `ShelfPropProps` (`focus`, `focused`,
 *      `hovered`) and animates itself from the `focus` ramp.
 *   2. Add it to the plan in `src/shelf/plan.ts`, or leave it out and it will
 *      be appended to the top row automatically.
 *   3. Append a `defineGame({...})` entry below.
 *
 * `focus` describes the move from the shelf into your hands:
 *   - `lift`   offset from the shelf slot at full focus
 *   - `turn`   rotation at full focus, radians
 *   - `scale`  how much bigger it gets coming towards you
 *   - `size`   bounding box at rest, used for the click target
 *   - `camera` where the camera ends up: how far in front, how high, and which
 *              point on the prop it should be looking at
 */
export const GAMES: GameDefinition[] = [
  defineGame({
    id: 'heartcatcher',
    title: 'Heart Catcher',
    accent: '#ff4d8d',
    focus: {
      size: [0.6, 0.88, 0.14],
      lift: [0, 0.3, 0.78],
      turn: [-0.04, 0, 0],
      // The prop sits at 0.4 of its modelled size on the shelf, so the pick-up
      // scales it up by roughly the inverse to land at the size the game is
      // meant to be played at.
      scale: 8.8,
      // Framed on the middle of the shell rather than on the screen, so the
      // D-pad and buttons stay in shot — they are the controls.
      camera: { distance: 4.6, height: 0, aim: [0, 0.44, 0.05] },
    },
    Prop: GameBoy,
  }),

  defineGame({
    id: 'cardcollection',
    title: 'Card Binder',
    accent: '#b98cff',
    focus: {
      size: [0.58, 0.76, 0.32],
      lift: [0, 0.44, 0.6],
      turn: [-0.1, 0, 0],
      scale: 3.6,
      // Aimed at the middle of the page, which is where a drawn card comes to
      // rest. The distance is set by the draw: the frame has to reach the top
      // of a card that has risen a full card clear of the top row's pocket.
      camera: { distance: 6.3, height: 0, aim: [0, 0.34, 0.07] },
    },
    Prop: CardBinder,
  }),
]

export function findGame(id: string | null): GameDefinition | undefined {
  if (!id) return undefined
  return GAMES.find((game) => game.id === id)
}
