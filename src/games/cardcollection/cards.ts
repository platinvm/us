import emptyUrl from './assets/cards/empty.png'
import piplupUrl from './assets/cards/piplup.png'

/**
 * The binder's contents.
 *
 * One page of nine pockets — the standard binder layout — with a single card in
 * it and the rest still waiting. Every unfilled pocket holds the empty card, as
 * it would in a real binder you are collecting into.
 *
 * To add a card, drop the PNG in `assets/cards/` and replace the next empty
 * entry below. Nothing else needs touching.
 */

export const POCKETS_PER_PAGE = 9

export type CardKind = 'card' | 'empty'

export type CardEntry = {
  id: string
  /** Read out when the card is opened. */
  label: string
  /** Set or series. */
  series: string
  kind: CardKind
  image: string
}

function emptyPocket(index: number): CardEntry {
  return {
    id: `pocket-${index}`,
    label: 'Empty pocket',
    series: 'Waiting for a new pull',
    kind: 'empty',
    image: emptyUrl,
  }
}

/** Every pocket in the binder, in page order. */
export const CARDS: CardEntry[] = [
  {
    id: 'piplup',
    label: 'Piplup',
    series: 'Diamond & Pearl',
    kind: 'card',
    image: piplupUrl,
  },
  ...Array.from({ length: POCKETS_PER_PAGE - 1 }, (_, index) => emptyPocket(index)),
]

/** The binder split into pages of nine. */
export const PAGES: CardEntry[][] = Array.from(
  { length: Math.ceil(CARDS.length / POCKETS_PER_PAGE) },
  (_, page) =>
    CARDS.slice(page * POCKETS_PER_PAGE, (page + 1) * POCKETS_PER_PAGE),
)

/** How many pockets actually hold a card. */
export const COLLECTED = CARDS.filter((card) => card.kind === 'card').length
