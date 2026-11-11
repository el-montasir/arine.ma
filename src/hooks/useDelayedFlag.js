import { useEffect, useState } from 'react'

// True only once `active` has stayed true for `delayMs`. Lets a loading
// placeholder appear on slow connections without flashing on fast ones.
export default function useDelayedFlag(active, delayMs = 350) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (!active) return undefined
    const timer = setTimeout(() => setShown(true), delayMs)
    return () => {
      clearTimeout(timer)
      setShown(false)
    }
  }, [active, delayMs])
  return active && shown
}
