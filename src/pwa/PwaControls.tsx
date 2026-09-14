import { useEffect, useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useInstallPrompt } from './useInstallPrompt'

/**
 * Backstop for a tab left open for days. A week-long session should still
 * notice a new build eventually even if nothing else pokes it.
 */
const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000

/** How long the "ready offline" note lingers before it excuses itself. */
const OFFLINE_READY_TIMEOUT = 7000

/**
 * The two things an installable, offline-first site has to tell you about:
 * that it can be kept, and that a fresher copy is waiting.
 *
 * Updates are downloaded whole, in the background, the moment a check finds
 * one: workbox fetches every file in the new build before the worker installs,
 * and if any of it fails to arrive the old copy simply stays in place. Nothing
 * half-updated is ever served. The reload below is only about handing the open
 * page over to the build that has already finished downloading.
 *
 * Only one card is ever shown, and only in production — in dev the service
 * worker is rebuilt on every request, which would make this flash constantly.
 */
export function PwaControls() {
  const { canInstall, install } = useInstallPrompt()
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      registrationRef.current = registration ?? null
    },
  })

  /**
   * The shelf is usually launched with no connection at all, so the moment one
   * comes back is the moment worth checking. Coming back to the window counts
   * too — an installed app spends most of its life backgrounded.
   */
  useEffect(() => {
    if (!import.meta.env.PROD) return

    const check = () => {
      // A failed check just means there is still no connection. Whatever went
      // wrong, the next online or visible event tries again.
      registrationRef.current?.update().catch(() => {})
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }

    window.addEventListener('online', check)
    document.addEventListener('visibilitychange', onVisible)
    const timer = window.setInterval(check, UPDATE_CHECK_INTERVAL)

    return () => {
      window.removeEventListener('online', check)
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    if (!offlineReady) return

    const timer = window.setTimeout(setOfflineReady, OFFLINE_READY_TIMEOUT, false)
    return () => window.clearTimeout(timer)
  }, [offlineReady, setOfflineReady])

  const showUpdate = import.meta.env.PROD && needRefresh
  const showOffline = import.meta.env.PROD && !showUpdate && offlineReady

  if (!showUpdate && !showOffline && !canInstall) return null

  return (
    <div className="pwa" aria-live="polite">
      {showUpdate && (
        <div className="pwa__card">
          <p className="pwa__text">A newer shelf is ready.</p>
          <button
            type="button"
            className="pwa__button"
            onClick={() => void updateServiceWorker(true)}
          >
            Reload
          </button>
        </div>
      )}

      {showOffline && (
        <div className="pwa__card">
          <p className="pwa__text">Cached — it plays offline now.</p>
          <button
            type="button"
            className="pwa__dismiss"
            onClick={() => setOfflineReady(false)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {canInstall && (
        <div className="pwa__card">
          <p className="pwa__text">Keep the shelf on this device.</p>
          <button type="button" className="pwa__button" onClick={() => void install()}>
            Install
          </button>
        </div>
      )}
    </div>
  )
}
