import { useEffect, useState } from 'react'
import api from './api'

// Delivery cities come from the courier (DIGYLOG) through the API. Fetched once
// per page load and shared by every checkout form.
let citiesPromise = null

function loadCities() {
  if (!citiesPromise) {
    citiesPromise = api
      .get('/shipping/cities')
      .then((res) => (Array.isArray(res.data) ? res.data : []))
      .catch(() => {
        citiesPromise = null // retry on the next mount
        return []
      })
  }
  return citiesPromise
}

// [] while loading or when the courier list is unavailable — callers then
// accept the city as free text, exactly as before.
export function useCities() {
  const [cities, setCities] = useState([])
  useEffect(() => {
    let active = true
    loadCities().then((list) => active && setCities(list))
    return () => {
      active = false
    }
  }, [])
  return cities
}

// Same folding as the server: "Fès", " fes ", "FES" and "فاس" compare equal.
export function normalizeCityName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]/g, '')
}

// "FES" → "Fes", "AIT MELLOUL" → "Ait Melloul"
export function titleCaseCity(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/(^|[\s'-])\S/g, (m) => m.toUpperCase())
}

// The courier's key for a typed/picked city ("FES"), or null.
export function resolveCityKey(cities, text) {
  const key = normalizeCityName(text)
  if (!key) return null
  const hit = cities.find((c) => normalizeCityName(c.name) === key || normalizeCityName(c.nameAr) === key)
  return hit ? hit.name : null
}

// What the customer sees and what is saved on the order.
export function cityLabel(city, language) {
  return language === 'ar' && city.nameAr ? city.nameAr : titleCaseCity(city.name)
}

// Edit distance, for "did you mean" suggestions on a misspelled city.
function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[b.length]
}

// Closest names to a typed (normalized) query: compares against the whole
// name and its same-length prefix, so "casablanka" and "casab" both find
// Casablanca. `items` carry n1/n2 normalized names.
export function closestCities(items, query, limit = 5) {
  if (!query) return []
  const score = (n) => {
    if (!n) return Infinity
    return Math.min(levenshtein(query, n), levenshtein(query, n.slice(0, query.length)) + 1)
  }
  const maxDistance = Math.max(2, Math.ceil(query.length / 3))
  return items
    .map((it) => ({ it, d: Math.min(score(it.n1), score(it.n2)) }))
    .filter((x) => x.d <= maxDistance)
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map((x) => x.it)
}
