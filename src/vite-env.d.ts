/// <reference types="vite/client" />

// Types for `virtual:pwa-register/react`, the hook that registers the service
// worker and reports back when a new build is waiting.
/// <reference types="vite-plugin-pwa/react" />

/**
 * `beforeinstallprompt` is Chromium-only and has never made it into lib.dom,
 * so it is declared by hand. The browser hands out one of these when the app
 * qualifies for installation; holding on to it is the only way to offer an
 * install button of our own.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt: () => Promise<void>
}

interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent
  appinstalled: Event
}
