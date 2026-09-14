import { useMemo } from 'react'

export type SceneQuality = {
  /** What `dpr` the canvas is allowed to render at. */
  dpr: [number, number]
  antialias: boolean
  /** Side of the shadow map, in pixels. */
  shadowMapSize: number
}

/**
 * How much of the scene the device is asked to draw.
 *
 * Fill rate is what hurts on a phone, not triangle count. A 390x844 screen at
 * device pixel ratio 2 is 1.3 million pixels, multisampling multiplies the
 * fragment work behind that by four again, and the shadow pass draws the shelf
 * a second time on top. A touch-first device gets a smaller budget on all three
 * fronts; anything with a mouse in front of it keeps the full one.
 *
 * The pointer is the signal rather than a user-agent sniff: it is what actually
 * separates a phone from a laptop, and it survives new devices being invented.
 * `antialias` is read from this before the canvas exists, so it cannot be
 * changed later — the rest is fixed for the life of the session too, because
 * re-creating the scene to change it would cost more than it saves.
 */
export function useSceneQuality(): SceneQuality {
  return useMemo<SceneQuality>(() => {
    const touchFirst = window.matchMedia('(pointer: coarse)').matches

    return touchFirst
      ? { dpr: [1, 1.5], antialias: false, shadowMapSize: 1024 }
      : { dpr: [1, 2], antialias: true, shadowMapSize: 2048 }
  }, [])
}
