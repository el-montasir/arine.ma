import { lazy } from 'react'

const RELOAD_KEY = 'arine-chunk-reload-at'

/**
 * After a deploy, a tab opened on the previous build asks for old hashed
 * chunks (e.g. Shop-<hash>.js) that no longer exist. Reload once to pick up
 * the new build. The timestamp guard stops a reload loop when a chunk is
 * genuinely broken. Returns true when a reload was started.
 */
export function reloadOnceForNewBuild() {
  let last = 0
  try {
    last = Number(sessionStorage.getItem(RELOAD_KEY)) || 0
  } catch {}
  if (Date.now() - last < 10_000) return false
  try {
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch {}
  window.location.reload()
  return true
}

/**
 * React.lazy for route pages. If the page's chunk cannot be loaded (usually a
 * stale tab after a deploy) the page reloads onto the new build; meanwhile the
 * import never settles, so the route's loading spinner stays on screen
 * instead of the app crashing to a blank page.
 */
export function lazyPage(load) {
  return lazy(() =>
    load().catch((err) => {
      if (reloadOnceForNewBuild()) return new Promise(() => {})
      throw err
    })
  )
}
