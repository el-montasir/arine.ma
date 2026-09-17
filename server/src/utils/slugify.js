// Slugify a category name into a URL-safe latin slug (used by the Admin Panel).
// Arabic input has no latin letters, so we fall back to a unique stable suffix
// rather than producing an empty slug. The public frontend also matches
// categories by name, so these remain functional either way.
export function slugify(name, suffix = '') {
  const base = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '') // drop non-word chars (incl. Arabic), keep accents' letters
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return (base || 'category') + (suffix ? `-${suffix}` : '')
}