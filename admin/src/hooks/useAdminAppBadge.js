import { useEffect, useCallback } from 'react'

/**
 * Set the app badge count on supported platforms (PWA / desktop / mobile).
 * Safely ignores if Badging API is not supported or if count is invalid/undefined/null.
 * Only clears when count is explicitly 0.
 * Only sets when count is a positive number.
 */
export async function setAppBadge(count) {
  if (typeof navigator === 'undefined') return
  if (count === null || count === undefined) return

  const num = Number(count)
  if (isNaN(num) || num < 0) return

  try {
    if (num > 0 && 'setAppBadge' in navigator) {
      await navigator.setAppBadge(Math.floor(num))
    } else if (num === 0) {
      if ('clearAppBadge' in navigator) {
        await navigator.clearAppBadge()
      } else if ('setAppBadge' in navigator) {
        await navigator.setAppBadge(0)
      }
    }
  } catch (err) {
    console.warn('[Badge] Failed to set badge:', err)
  }
}

/**
 * Explicitly clear the app badge count.
 */
export async function clearAppBadge() {
  if (typeof navigator === 'undefined') return
  try {
    if ('clearAppBadge' in navigator) {
      await navigator.clearAppBadge()
    } else if ('setAppBadge' in navigator) {
      await navigator.setAppBadge(0)
    }
  } catch (err) {
    console.warn('[Badge] Failed to clear badge:', err)
  }
}

/**
 * Hook to synchronize the PWA app icon badge with a count value.
 */
export function useAdminAppBadge(count) {
  const isSupported =
    typeof navigator !== 'undefined' &&
    ('setAppBadge' in navigator || 'clearAppBadge' in navigator)

  useEffect(() => {
    if (!isSupported) return
    if (count === null || count === undefined) return
    const num = Number(count)
    if (isNaN(num) || num < 0) return

    setAppBadge(num)
  }, [count, isSupported])

  const setBadge = useCallback((val) => setAppBadge(val), [])
  const clearBadge = useCallback(() => clearAppBadge(), [])

  return {
    isSupported,
    setBadge,
    clearBadge,
  }
}

export default useAdminAppBadge
