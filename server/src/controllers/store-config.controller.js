import { prisma } from '../lib/prisma.js'

const DEFAULT_PUBLIC_CONFIG = {
  store: {
    name: 'مكتبة أرين للكتب الشرعية',
    description: 'مجموعة مختارة من الكتب الشرعية والمعرفية لعشاق القراءة وطلب العلم.',
    phone: '0665128821',
    email: 'arine.ma00@gmail.com',
    whatsapp: '0665128821',
    whatsappNumbers: ['0665128821', '0665128821'],
    whatsappContacts: [
      { id: '1', label: 'خدمة العملاء', number: '0665128821' },
      { id: '2', label: 'خط المساعدة والطلب', number: '0665128821' },
    ],
    address: 'Morocco, Fes, Route Narjis',
    googleMapsUrl: 'https://maps.google.com/?q=Morocco,+Fes,+Route+Narjis',
    workingDays: 'السبت - الخميس',
    openingTime: '09:00',
    closingTime: '20:00',
    businessHours: 'السبت - الخميس: 9:00 ص - 8:00 م',
    announcement: 'توصيل سريع لجميع المدن المغربية • الدفع عند الاستلام',
    customerServiceDesc: 'نحن هنا لمساعدتك في اختيار الكتب المناسبة والإجابة عن جميع استفساراتك.',
    instagram: 'https://instagram.com/arine_bookstore',
    tiktok: 'https://tiktok.com/@arine_bookstore',
    logo: null,
  },
  hero: {
    title: 'اكتشف كتابك القادم',
    subtitle: 'مجموعة مختارة من الكتب الشرعية والمعرفية لعشاق القراءة وطلب العلم.',
    badge: 'مكتبة أرين للكتب الشرعية',
    statBooks: '+2000',
    statDelivery: '24/48h',
    statCustomers: '+5000',
  },
  homepage: {
    featuredBookId: 3,
  },
}

function parseWhatsAppContacts(rawNumbers, fallbackPrimary) {
  let contacts = []
  if (rawNumbers) {
    try {
      const parsed = typeof rawNumbers === 'string' ? JSON.parse(rawNumbers) : rawNumbers
      if (Array.isArray(parsed) && parsed.length > 0) {
        contacts = parsed.map((item, idx) => {
          if (typeof item === 'object' && item !== null) {
            const num = String(item.number || item.phone || item.phoneNumber || '').trim()
            const lbl = String(item.label || item.name || item.displayName || '').trim()
            return {
              id: String(item.id || idx + 1),
              label: lbl || (idx === 0 ? 'خدمة العملاء' : 'خط المساعدة والطلب'),
              number: num,
            }
          }
          const str = String(item).trim()
          return {
            id: String(idx + 1),
            label: idx === 0 ? 'خدمة العملاء' : 'خط المساعدة والطلب',
            number: str,
          }
        }).filter((c) => Boolean(c.number || c.label))
      }
    } catch {
      if (typeof rawNumbers === 'string' && rawNumbers.includes(',')) {
        contacts = rawNumbers.split(',').map((n, idx) => ({
          id: String(idx + 1),
          label: idx === 0 ? 'خدمة العملاء' : 'خط المساعدة والطلب',
          number: n.trim(),
        })).filter((c) => Boolean(c.number))
      } else if (typeof rawNumbers === 'string' && rawNumbers.trim()) {
        contacts = [
          {
            id: '1',
            label: 'خدمة العملاء',
            number: rawNumbers.trim(),
          },
        ]
      }
    }
  }

  const primaryFallback = (fallbackPrimary && typeof fallbackPrimary === 'string' && fallbackPrimary.trim()) || '0665128821'
  const c1 = contacts[0] || {}
  const c2 = contacts[1] || {}

  return [
    {
      id: '1',
      label: c1.label || 'خدمة العملاء',
      number: c1.number || primaryFallback,
    },
    {
      id: '2',
      label: c2.label || 'خط المساعدة والطلب',
      number: c2.number || c1.number || primaryFallback,
    },
  ]
}

function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return ''
  const trimmed = url.trim()
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    return ''
  }
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed
  }
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`
  }
  if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(trimmed)) {
    return `https://${trimmed}`
  }
  return ''
}

// GET /api/store-config - Public endpoint
export async function getPublicStoreConfig(_req, res, next) {
  try {
    const entries = await prisma.storeConfig.findMany()
    const map = {}
    for (const e of entries) {
      map[e.key] = e.value
    }

    const getVal = (key, defaultVal) => (map[key] !== undefined ? map[key] : defaultVal)

    const rawWaNumbers = getVal('store.whatsapp_numbers', JSON.stringify(DEFAULT_PUBLIC_CONFIG.store.whatsappContacts))
    const rawPrimaryWa = getVal('store.whatsapp', DEFAULT_PUBLIC_CONFIG.store.whatsapp)
    const whatsappContacts = parseWhatsAppContacts(rawWaNumbers, rawPrimaryWa)
    const primaryContact = whatsappContacts.find((c) => c.isPrimary) || whatsappContacts[0]
    const primaryWhatsapp = primaryContact?.number || rawPrimaryWa || '0665128821'
    const whatsappNumbers = whatsappContacts.map((c) => c.number).filter(Boolean)

    // Compute business hours if not explicitly overridden
    let businessHours = getVal('store.business_hours', '')
    if (!businessHours && (map['store.working_days'] || map['store.opening_time'])) {
      const days = getVal('store.working_days', DEFAULT_PUBLIC_CONFIG.store.workingDays)
      const open = getVal('store.opening_time', DEFAULT_PUBLIC_CONFIG.store.openingTime)
      const close = getVal('store.closing_time', DEFAULT_PUBLIC_CONFIG.store.closingTime)
      businessHours = `${days}: ${open} - ${close}`
    } else if (!businessHours && map['store.business_hours'] === undefined) {
      businessHours = DEFAULT_PUBLIC_CONFIG.store.businessHours
    }

    const address = getVal('store.address', DEFAULT_PUBLIC_CONFIG.store.address)
    const rawMapsUrl = getVal('store.google_maps_url', null)
    let googleMapsUrl = ''
    if (rawMapsUrl !== null) {
      googleMapsUrl = sanitizeUrl(rawMapsUrl)
    } else if (address) {
      googleMapsUrl = `https://maps.google.com/?q=${encodeURIComponent(address)}`
    }

    const config = {
      store: {
        name: getVal('store.name', DEFAULT_PUBLIC_CONFIG.store.name),
        description: getVal('store.description', DEFAULT_PUBLIC_CONFIG.store.description),
        phone: getVal('store.contact_phone', DEFAULT_PUBLIC_CONFIG.store.phone),
        email: getVal('store.contact_email', DEFAULT_PUBLIC_CONFIG.store.email),
        whatsapp: primaryWhatsapp,
        whatsappNumbers: whatsappNumbers,
        whatsappContacts: whatsappContacts,
        address: address,
        googleMapsUrl: googleMapsUrl,
        workingDays: getVal('store.working_days', DEFAULT_PUBLIC_CONFIG.store.workingDays),
        openingTime: getVal('store.opening_time', DEFAULT_PUBLIC_CONFIG.store.openingTime),
        closingTime: getVal('store.closing_time', DEFAULT_PUBLIC_CONFIG.store.closingTime),
        businessHours: businessHours,
        announcement: getVal('store.announcement', DEFAULT_PUBLIC_CONFIG.store.announcement),
        customerServiceDesc: getVal('store.customer_service_desc', DEFAULT_PUBLIC_CONFIG.store.customerServiceDesc),
        instagram: map['store.instagram'] !== undefined ? sanitizeUrl(map['store.instagram']) : DEFAULT_PUBLIC_CONFIG.store.instagram,
        tiktok: map['store.tiktok'] !== undefined ? sanitizeUrl(map['store.tiktok']) : DEFAULT_PUBLIC_CONFIG.store.tiktok,
        logo: map['store.logo'] !== undefined ? (map['store.logo'] || null) : DEFAULT_PUBLIC_CONFIG.store.logo,
      },
      hero: {
        title: getVal('homepage.hero_title', DEFAULT_PUBLIC_CONFIG.hero.title),
        subtitle: getVal('homepage.hero_subtitle', DEFAULT_PUBLIC_CONFIG.hero.subtitle),
        badge: getVal('homepage.hero_badge', DEFAULT_PUBLIC_CONFIG.hero.badge),
        statBooks: getVal('homepage.hero_stat_books', DEFAULT_PUBLIC_CONFIG.hero.statBooks),
        statDelivery: getVal('homepage.hero_stat_delivery', DEFAULT_PUBLIC_CONFIG.hero.statDelivery),
        statCustomers: getVal('homepage.hero_stat_customers', DEFAULT_PUBLIC_CONFIG.hero.statCustomers),
      },
      homepage: {
        featuredBookId: Number(getVal('homepage.featured_book_id', DEFAULT_PUBLIC_CONFIG.homepage.featuredBookId)) || 3,
      },
    }

    return res.json({ success: true, data: config })
  } catch (err) {
    next(err)
  }
}
