// The app installs on the phone (PWA). This worker only makes sure an installed app is always the latest build,
// the way Yarin's app does (see its sw.js): GitHub Pages keeps index.html for ten minutes, and an installed app has
// no refresh button. The page comes from the network first ('no-cache' asks GitHub whether it changed, so an unchanged
// build costs a 304), and the stored copy opens the app only when there is no signal at all.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

const SHELL = 'almog-shell-v1'
/** the whole app is one file, and the worker sits next to it */
const SHELL_URL = new URL('./index.html', self.registration.scope).href

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return
  event.respondWith(serveShell(event.request))
})

async function serveShell(request) {
  let fresh
  try {
    fresh = await fetch(new Request(request.url, { mode: 'same-origin', cache: 'no-cache', credentials: 'same-origin' }))
  } catch {
    const cached = await caches.match(SHELL_URL, { cacheName: SHELL })
    return cached || Response.error()
  }
  if (fresh.ok) {
    // awaited, or the worker can stop mid-write. a storage failure never costs the page itself
    const copy = fresh.clone()
    try {
      const cache = await caches.open(SHELL)
      await cache.put(SHELL_URL, copy)
    } catch (error) {
      console.warn('[sw] could not keep the app for offline use:', error)
    }
  }
  return fresh
}
