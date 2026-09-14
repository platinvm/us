import type { ComponentType } from 'react'

/**
 * How a prop presents itself when picked up.
 *
 * Nothing leaves the scene: the prop lifts off the shelf, comes forward and
 * turns to face the viewer, and the camera moves in to meet it. The furniture,
 * the wall and everything else on the shelf stay exactly where they were, which
 * is what makes it feel like reaching for something rather than opening a menu.
 */
export type GameFocus = {
  /** Offset from the shelf slot at full focus. */
  lift: [x: number, y: number, z: number]
  /** Rotation at full focus, in radians. */
  turn: [x: number, y: number, z: number]
  /** Scale at full focus. */
  scale: number
  /** Bounding box at rest, used for the hover target. */
  size: [width: number, height: number, depth: number]
  /** How the camera frames it once it has been picked up. */
  camera: {
    /** How far in front of the prop the camera sits. */
    distance: number
    /** Height above the point it is looking at. */
    height: number
    /**
     * The point on the prop the camera should look at, in the prop's own local
     * space with its base at the origin. Usually the screen, or the page.
     */
    aim: [x: number, y: number, z: number]
  }
}

/**
 * A live `0..1` value.
 *
 * Read it inside `useFrame`; it deliberately does not trigger a re-render. The
 * pick-up animation runs every frame for the better part of a second, and
 * pushing that through React state sixty times a second to move one group would
 * be silly.
 */
export type FocusSignal = {
  value: number
}

/** Props handed to the 3D representation of a game on the shelf. */
export type ShelfPropProps = {
  /** `0` resting on the shelf, `1` picked up and facing the viewer. */
  focus: FocusSignal
  /** True while this prop is the one that has been picked up. */
  focused: boolean
  /** True while the pointer is over it. */
  hovered: boolean
}

export type GameDefinition = {
  /** Stable id, also the URL hash. */
  id: string
  /** Screen-reader name. Never rendered as text in the scene. */
  title: string
  /** Accent used by the hover highlight. */
  accent: string
  focus: GameFocus
  /** The prop on the shelf. It is also the game. */
  Prop: ComponentType<ShelfPropProps>
}

/**
 * Identity function that exists purely to give autocomplete and type checking
 * at the registry. A malformed entry fails `tsc` instead of failing at runtime.
 */
export function defineGame(definition: GameDefinition): GameDefinition {
  return definition
}
