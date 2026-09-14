import { useMemo } from 'react'

export type SceneQuality = {
  /** Floor of the adaptive resolution range. */
  dprMin: number
  /** Ceiling, further limited by the device's own pixel ratio. */
  dprMax: number
  antialias: boolean
  /** Side of the shadow map, in pixels. */
  shadowMapSize: number
  /** How many frames a second to ask for while nothing is happening. */
  idleFps: number
}

/**
 * How much of the scene the device is asked to draw.
 *
 * Fill rate is what hurts on a phone, not triangle count. A 390x844 screen at
 * device pixel ratio 3 is 3.5 million pixels, multisampling multiplies the
 * fragment work behind that again, and the shadow pass draws the shelf a second
 * time on top. A touch-first device gets a smaller budget on all three fronts;
 * anything with a mouse in front of it keeps the full one.
 *
 * The pointer is the signal rather than a user-agent sniff: it is what actually
 * separates a phone from a laptop, and it survives new devices being invented.
 * `antialias` is read before the canvas exists, so it cannot be changed later —
 * the rest is fixed for the session too, because re-creating the scene to change
 * it would cost more than it saves. What *is* settled at runtime is the
 * resolution, which `FramePacer` walks up and down to hold the frame rate, and
 * the frame rate itself, which drops once the shelf is sitting still.
 */
export function useSceneQuality(): SceneQuality {
  return useMemo<SceneQuality>(() => {
    const touchFirst = window.matchMedia('(pointer: coarse)').matches

    return touchFirst
      ? {
          // Never render above 1.25x on a phone. The difference between that
          // and 1.5x is 40% of the pixels in every frame, and at arm's length
          // on a small screen nobody can tell the two apart.
          dprMin: 0.7,
          dprMax: 1.25,
          antialias: false,
          shadowMapSize: 1024,
          idleFps: 30,
        }
      : {
          dprMin: 0.85,
          dprMax: 2,
          antialias: true,
          shadowMapSize: 2048,
          idleFps: 60,
        }
  }, [])
}
