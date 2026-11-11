// Typo-tolerant, Arabic-aware matching for the storefront search overlay.

// Arabic-aware matching: ignore tashkeel and tatweel, and treat the common
// spelling variants as one letter (أ/إ/آ → ا, ى → ي, ة → ه, ؤ → و, ئ → ي),
// so "الاحكام" finds "الأحكام".
export function normalizeSearch(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a, b) {
  if (a === b) return 0
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[b.length]
}

const stripArticle = (w) => (w.length > 4 && w.startsWith('ال') ? w.slice(2) : w)

// 0..1: how close a (possibly misspelled or half-typed) query word is to a
// word, comparing the whole word and its prefix. The article "ال" is dropped
// first: nearly every title word starts with it, so it would make unrelated
// words look alike.
function wordSimilarity(qw, w) {
  const a = stripArticle(qw)
  const b = stripArticle(w)
  let best = 0
  for (const target of [b, b.slice(0, a.length + 1)]) {
    const len = Math.max(a.length, target.length)
    if (len) best = Math.max(best, 1 - levenshtein(a, target) / len)
  }
  return best
}

// Matches found only in the author/category/package contents count a bit
// less, so a book outranks packages that merely contain it.
const SECONDARY_WEIGHT = 0.9

// Typo-tolerant score for a whole query against an item: every query word is
// matched to its closest word in the title (or author/category/contents).
function fuzzyScore(item, q) {
  const qWords = q.split(' ').filter((w) => w.length >= 2)
  if (qWords.length === 0) return 0
  const [title, ...rest] = item.fields
  const titleWords = title.split(' ').filter(Boolean)
  const otherWords = rest.join(' ').split(' ').filter(Boolean)
  let total = 0
  for (const qw of qWords) {
    let best = 0
    for (const w of titleWords) best = Math.max(best, wordSimilarity(qw, w))
    for (const w of otherWords) best = Math.max(best, wordSimilarity(qw, w) * SECONDARY_WEIGHT)
    total += best
  }
  return total / qWords.length
}

const FUZZY_MIN_QUERY = 3
const FUZZY_THRESHOLD = 0.6
// When the query already matches some items exactly, only add near-certain
// fuzzy matches so the real results are not buried.
export const FUZZY_THRESHOLD_WITH_EXACT = 0.8

// Lower is better: title starts with the query, then a title word starts with
// it, then the title contains it, then author/category/package contents, and
// finally close-but-misspelled matches (rank 4, ordered by similarity).
export function rank(item, q) {
  const [title, ...rest] = item.fields
  if (title.startsWith(q)) return { r: 0, score: 1 }
  if (title.split(' ').some((w) => w.startsWith(q))) return { r: 1, score: 1 }
  if (title.includes(q)) return { r: 2, score: 1 }
  if (rest.some((f) => f.includes(q))) return { r: 3, score: 1 }
  if (q.replace(/\s/g, '').length >= FUZZY_MIN_QUERY) {
    const score = fuzzyScore(item, q)
    if (score >= FUZZY_THRESHOLD) return { r: 4, score }
  }
  return { r: -1, score: 0 }
}
