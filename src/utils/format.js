export function formatPrice(price) {
  const val = Number(price) || 0
  return new Intl.NumberFormat('ar-MA', {
    style: 'currency',
    currency: 'MAD',
    maximumFractionDigits: 0,
  }).format(val)
}

export function percentOff(price, oldPrice) {
  if (!oldPrice || oldPrice <= price) return 0
  return Math.round(((oldPrice - price) / oldPrice) * 100)
}

export function formatBookCount(count, lang = 'ar') {
  const n = Number(count) || 0
  if (lang === 'fr') {
    return n <= 1 ? `${n} livre` : `${n} livres`
  }
  if (lang === 'en') {
    return n === 1 ? `${n} book` : `${n} books`
  }
  // Arabic grammatical rules
  if (n === 0) return '0 كتب'
  if (n === 1) return 'كتاب واحد'
  if (n === 2) return 'كتابان'
  if (n >= 3 && n <= 10) return `${n} كتب`
  return `${n} كتاباً`
}

export function formatPackageContains(count, lang = 'ar') {
  const n = Number(count) || 0
  if (lang === 'fr') {
    return n <= 1 ? `Ce pack contient ${n} livre` : `Ce pack contient ${n} livres`
  }
  if (lang === 'en') {
    return n === 1 ? `This package contains ${n} book` : `This package contains ${n} books`
  }
  // Arabic grammatical rules
  if (n === 0) return 'هذه الباقة لا تحتوي على كتب حالياً'
  if (n === 1) return 'تحتوي هذه الباقة على كتاب واحد'
  if (n === 2) return 'تحتوي هذه الباقة على كتابين'
  if (n >= 3 && n <= 10) return `تحتوي هذه الباقة على ${n} كتب`
  return `تحتوي هذه الباقة على ${n} كتاباً`
}