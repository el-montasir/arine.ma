import { prisma } from '../lib/prisma.js'

const DEFAULT_PUBLIC_CONFIG = {
  store: {
    name: 'مكتبة أرين للكتب الشرعية',
    description: 'مجموعة مختارة من الكتب الشرعية والمعرفية لعشاق القراءة وطلب العلم.',
    phone: '+212 600-000000',
    email: 'contact@arine.ma',
    whatsapp: '+212 600-000000',
    address: 'المغرب — توصيل لجميع المدن',
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

// GET /api/store-config - Public endpoint
export async function getPublicStoreConfig(_req, res, next) {
  try {
    const entries = await prisma.storeConfig.findMany()
    const map = {}
    for (const e of entries) {
      map[e.key] = e.value
    }

    const config = {
      store: {
        name: map['store.name'] || DEFAULT_PUBLIC_CONFIG.store.name,
        description: map['store.description'] || DEFAULT_PUBLIC_CONFIG.store.description,
        phone: map['store.contact_phone'] || DEFAULT_PUBLIC_CONFIG.store.phone,
        email: map['store.contact_email'] || DEFAULT_PUBLIC_CONFIG.store.email,
        whatsapp: map['store.whatsapp'] || DEFAULT_PUBLIC_CONFIG.store.whatsapp,
        address: map['store.address'] || DEFAULT_PUBLIC_CONFIG.store.address,
        logo: map['store.logo'] || null,
      },
      hero: {
        title: map['homepage.hero_title'] || DEFAULT_PUBLIC_CONFIG.hero.title,
        subtitle: map['homepage.hero_subtitle'] || DEFAULT_PUBLIC_CONFIG.hero.subtitle,
        badge: map['homepage.hero_badge'] || DEFAULT_PUBLIC_CONFIG.hero.badge,
        statBooks: map['homepage.hero_stat_books'] || DEFAULT_PUBLIC_CONFIG.hero.statBooks,
        statDelivery: map['homepage.hero_stat_delivery'] || DEFAULT_PUBLIC_CONFIG.hero.statDelivery,
        statCustomers: map['homepage.hero_stat_customers'] || DEFAULT_PUBLIC_CONFIG.hero.statCustomers,
      },
      homepage: {
        featuredBookId: Number(map['homepage.featured_book_id']) || DEFAULT_PUBLIC_CONFIG.homepage.featuredBookId,
      },
    }

    return res.json({ success: true, data: config })
  } catch (err) {
    next(err)
  }
}
