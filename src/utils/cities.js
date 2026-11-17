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
