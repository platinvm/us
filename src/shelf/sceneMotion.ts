/**
 * Whether anything in the scene is actually moving.
 *
 * The shadow map draws the whole shelf a second time — every mesh that casts
 * one, from the game props down to the keys on the ring — and on a phone that
 * pass costs more than the frame it is drawn for. Almost none of the time is it
 * worth doing: the shelf sits still while the flame flickers, the lights
 * breathe and the camera drifts, and none of that moves a shadow.
 *
 * Anything that animates a transform marks itself for as long as it is moving.
 * `ShadowBudget` redraws on every frame that something is marked, and otherwise
 * falls back to a slow tick — so a mover that forgets to mark itself is late,
 * never wrong.
 */
let moving = 0

/** Marks the scene as moving. Call the returned function to stop. */
export function beginMoving(): () => void {
  moving += 1
  let stopped = false

  return () => {
    if (stopped) return
    stopped = true
    moving -= 1
  }
}

export function isMoving(): boolean {
  return moving > 0
}
