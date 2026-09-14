import { useEffect } from 'react'
import { GAMES, findGame } from './games/registry'
import { PwaControls } from './pwa/PwaControls'
import { DECORATIONS } from './shelf/decorations'
import { poke } from './shelf/poke'
import { ShelfScene } from './shelf/ShelfScene'
import { ShelfProvider, useShelf } from './shelf/shelfState'

/**
 * Puts whatever is in your hands back on the shelf.
 *
 * If the focused prop has opened something of its own — a card lifted out of
 * the binder — Escape belongs to that first, and this stands down. The prop
 * says so through `subView` rather than by racing us for the key.
 */
function EscapeToShelf() {
  const { browsing, subView, busy, release } = useShelf()

  useEffect(() => {
    if (browsing || subView) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      // Mid-animation, the key is ignored outright.
      if (busy) return
      event.preventDefault()
      release()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [browsing, subView, busy, release])

  return null
}

/**
 * Keeps `location.hash` and the focused game in step, so a reload drops you
 * back into the same game and the browser's back button puts it away.
 */
function DeepLinks() {
  const { focusedId, focusTo, release } = useShelf()

  useEffect(() => {
    const game = findGame(window.location.hash.replace(/^#/, ''))
    if (game) focusTo(game.id)
  }, [focusTo])

  useEffect(() => {
    if (focusedId && window.location.hash !== `#${focusedId}`) {
      window.history.pushState(null, '', `#${focusedId}`)
      return
    }

    if (!focusedId && window.location.hash) {
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search,
      )
    }
  }, [focusedId])

  useEffect(() => {
    const onPopState = () => {
      const game = findGame(window.location.hash.replace(/^#/, ''))
      if (game) focusTo(game.id)
      else release()
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [focusTo, release])

  return null
}

/**
 * A keyboard and screen-reader path to the shelf.
 *
 * The shelf is WebGL, which is opaque to assistive technology, so its contents
 * exist here as real buttons. It sits off-screen and slides up when focused,
 * which means it is invisible until someone Tabs to it — the scene itself has
 * no text in it at all.
 */
function ShelfIndex() {
  const { browsing, focusTo } = useShelf()

  if (!browsing) return null

  return (
    <nav className="shelf-index" aria-label="Shelf contents">
      <p className="shelf-index__lede">Games</p>
      <ul>
        {GAMES.map((game) => (
          <li key={game.id}>
            <button
              type="button"
              style={{ '--entry-accent': game.accent } as React.CSSProperties}
              onClick={() => focusTo(game.id)}
            >
              {game.title}
            </button>
          </li>
        ))}
      </ul>

      <p className="shelf-index__lede">Small things on the shelf</p>
      <ul>
        {DECORATIONS.map((decoration) => (
          <li key={decoration.id}>
            <button
              type="button"
              className="shelf-index__plain"
              onClick={() => poke(decoration.id)}
            >
              {decoration.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default function App() {
  return (
    <ShelfProvider>
      <div className="app">
        <ShelfScene />
        <EscapeToShelf />
        <DeepLinks />
        <ShelfIndex />
        <PwaControls />
      </div>
    </ShelfProvider>
  )
}
