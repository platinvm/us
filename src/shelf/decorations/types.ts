import type { ComponentType } from 'react'

/** Props every decoration receives. */
export type DecorProps = {
  /** True while hovered or just poked, so the item can brighten in response. */
  active: boolean
}

export type DecorationDefinition = {
  id: string
  /** Screen-reader name. Never rendered as text anywhere in the scene. */
  label: string
  /** Bounding box, used for the click target and for spacing the shelf. */
  footprint: [width: number, height: number, depth: number]
  Component: ComponentType<DecorProps>
}
