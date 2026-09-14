import { useCallback, useEffect, useState } from 'react'

/**
 * True once the app is already running as an installed window, from the
 * launcher or the desktop rather than from a tab.
 */
function isInstalled(): boolean {
  const displayModes = ['standalone', 'fullscreen', 'minimal-ui']

  if (displayModes.some((mode) => window.matchMedia?.(`(display-mode: ${mode})`).matches)) {
    return true
  }

  // iOS Safari has no `display-mode` for this; it sets a flag instead.
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}

/**
 * Offers the browser's install prompt on our own terms.
 *
 * Chromium hands out a single-use `beforeinstallprompt` event once the app
 * qualifies, and shows its own button in the address bar at the same time. We
 * swallow that event so the shelf can offer installation somewhere people will
 * actually notice it, then spend it on a click.
 *
 * Firefox and Safari never fire the event — Firefox desktop has no way to
 * install a site at all — so nothing is shown there and the shelf carries on
 * as an ordinary page.
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isInstalled)

  useEffect(() => {
    const onPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault()
      setDeferred(event)
    }

    const onInstalled = () => {
      setDeferred(null)
      setInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferred) return

    await deferred.prompt()
    // Whatever the answer, the event cannot be replayed, so it is spent.
    await deferred.userChoice
    setDeferred(null)
  }, [deferred])

  return { canInstall: deferred !== null && !installed, install }
}
