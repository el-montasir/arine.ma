import { useEffect, useCallback, useState } from 'react'
import { api } from './api.js'

// Tiny data hook: GETs a path when it (or `deps`) changes; `reload()` re-runs it.
// A falsy path means "no fetch" (used for optional data), returning idle state.
export default function useFetch(path, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(Boolean(path))
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!path) {
      setData(null)
      setLoading(false)
      setError('')
      return undefined
    }
    let active = true
    setLoading(true)
    setError('')
    api
      .get(path)
      .then((json) => {
        if (active) {
          const payload = json?.data !== undefined ? json.data : (json?.users !== undefined ? json.users : json)
          setData(payload)
        }
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, version, ...deps])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  return { data, loading, error, reload }
}