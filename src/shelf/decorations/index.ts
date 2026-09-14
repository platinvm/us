import { Earbuds, LooseCards, Mug, Pebble, Tin } from './clutter'
import {
  Books,
  Cactus,
  Candle,
  Clock,
  HeartsJar,
  KeyRing,
  Polaroid,
  Succulent,
} from './items'
import type { DecorationDefinition } from './types'

export type { DecorProps, DecorationDefinition } from './types'

/**
 * Everything that can stand on the shelf.
 *
 * The small things a bedroom shelf accumulates, roughly in the order they would
 * have arrived: a plant, then a candle, then the clutter that never gets put
 * away.
 *
 * None of them are labelled in the scene — a shelf should look like someone's
 * shelf, not a museum case — but each carries a name for screen readers.
 */
export const DECORATIONS: DecorationDefinition[] = [
  {
    id: 'cactus',
    label: 'A little cactus',
    footprint: [0.24, 0.4, 0.24],
    Component: Cactus,
  },
  {
    id: 'succulent',
    label: 'Little succulent',
    footprint: [0.18, 0.2, 0.16],
    Component: Succulent,
  },
  {
    id: 'candle',
    label: 'Candle',
    footprint: [0.18, 0.24, 0.16],
    Component: Candle,
  },
  {
    id: 'heartsJar',
    label: 'Jar of little hearts',
    footprint: [0.24, 0.28, 0.22],
    Component: HeartsJar,
  },
  {
    id: 'books',
    label: 'Stack of books',
    footprint: [0.36, 0.12, 0.28],
    Component: Books,
  },
  {
    id: 'keyRing',
    label: 'Keys on a ring',
    footprint: [0.26, 0.09, 0.2],
    Component: KeyRing,
  },
  {
    id: 'polaroid',
    label: 'A photo',
    footprint: [0.18, 0.22, 0.16],
    Component: Polaroid,
  },
  {
    id: 'clock',
    label: 'A little clock',
    footprint: [0.24, 0.25, 0.12],
    Component: Clock,
  },
  {
    id: 'mug',
    label: 'A mug',
    footprint: [0.22, 0.12, 0.2],
    Component: Mug,
  },
  {
    id: 'looseCards',
    label: 'A few loose cards',
    footprint: [0.16, 0.03, 0.15],
    Component: LooseCards,
  },
  {
    id: 'earbuds',
    label: 'Tangled earbuds',
    footprint: [0.16, 0.04, 0.14],
    Component: Earbuds,
  },
  {
    id: 'tin',
    label: 'A small tin',
    footprint: [0.15, 0.06, 0.15],
    Component: Tin,
  },
  {
    id: 'pebble',
    label: 'A smooth stone',
    footprint: [0.12, 0.05, 0.1],
    Component: Pebble,
  },
]

export function findDecoration(id: string): DecorationDefinition | undefined {
  return DECORATIONS.find((decoration) => decoration.id === id)
}
