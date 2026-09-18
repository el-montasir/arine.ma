import { prisma } from '../../lib/prisma.js'

const DEFAULT_CONFIG = {
  'store.name': 'مكتبة أرين للكتب الشرعية',
  'store.description': 'مجموعة مختارة من الكتب الشرعية والمعرفية لعشاق القراءة وطلب العلم.',
  'store.logo': '',
  'store.contact_phone': '+212 600-000000',
  'store.contact_email': 'contact@arine.ma',
  'store.whatsapp': '+212 600-000000',
  'store.address': 'المغرب — توصيل لجميع المدن',
  'homepage.hero_title': 'اكتشف كتابك القادم',
  'homepage.hero_subtitle': 'مجموعة مختارة من الكتب الشرعية والمعرفية لعشاق القراءة وطلب العلم.',
  'homepage.hero_badge': 'مكتبة أرين للكتب الشرعية',
  'homepage.hero_stat_books': '+2000',
  'homepage.hero_stat_delivery': '24/48h',
  'homepage.hero_stat_customers': '+5000',
  'homepage.featured_book_id': '3',
}

// Helper to convert key-value list to structured object
function formatConfig(entries) {
  const map = { ...DEFAULT_CONFIG }
  for (const entry of entries) {
    map[entry.key] = entry.value
  }
  return {
    store: {
      name: map['store.name'],
      description: map['store.description'],
      phone: map['store.contact_phone'],
      email: map['store.contact_email'],
      whatsapp: map['store.whatsapp'],
      address: map['store.address'],
      logo: map['store.logo'] || null,
    },
    hero: {
      title: map['homepage.hero_title'],
      subtitle: map['homepage.hero_subtitle'],
      badge: map['homepage.hero_badge'],
      statBooks: map['homepage.hero_stat_books'],
      statDelivery: map['homepage.hero_stat_delivery'],
      statCustomers: map['homepage.hero_stat_customers'],
    },
    homepage: {
      featuredBookId: Number(map['homepage.featured_book_id']) || 3,
    },
    raw: map,
  }
}

// GET /api/admin/store-config
export async function getStoreConfigHandler(_req, res, next) {
  try {
    const entries = await prisma.storeConfig.findMany()
    return res.json({ success: true, data: formatConfig(entries) })
  } catch (err) {
    next(err)
  }
}

// PUT /api/admin/store-config
export async function updateStoreConfigHandler(req, res, next) {
  try {
    const { store, hero, homepage, raw } = req.body

    const updates = []

    // Support both structured and raw key-value updates
    if (raw && typeof raw === 'object') {
      for (const [key, value] of Object.entries(raw)) {
        if (typeof key === 'string' && value !== undefined) {
          updates.push(
            prisma.storeConfig.upsert({
              where: { key },
              update: { value: String(value) },
              create: { key, value: String(value) },
            })
          )
        }
      }
    }

    if (store) {
      if (store.name !== undefined) {
        updates.push(
          prisma.storeConfig.upsert({
            where: { key: 'store.name' },
            update: { value: String(store.name) },
            create: { key: 'store.name', value: String(store.name) },
          })
        )
      }
      if (store.description !== undefined) {
        updates.push(
          prisma.storeConfig.upsert({
            where: { key: 'store.description' },
            update: { value: String(store.description) },
            create: { key: 'store.description', value: String(store.description) },
          })
        )
      }
      if (store.phone !== undefined) {
        updates.push(
          prisma.storeConfig.upsert({
            where: { key: 'store.contact_phone' },
            update: { value: String(store.phone) },
            create: { key: 'store.contact_phone', value: String(store.phone) },
          })
        )
      }
      if (store.email !== undefined) {
        updates.push(
          prisma.storeConfig.upsert({
            where: { key: 'store.contact_email' },
            update: { value: String(store.email) },
            create: { key: 'store.contact_email', value: String(store.email) },
          })
        )
      }
      if (store.whatsapp !== undefined) {
        updates.push(
          prisma.storeConfig.upsert({
            where: { key: 'store.whatsapp' },
            update: { value: String(store.whatsapp) },
            create: { key: 'store.whatsapp', value: String(store.whatsapp) },
          })
        )
      }
      if (store.address !== undefined) {
        updates.push(
          prisma.storeConfig.upsert({
            where: { key: 'store.address' },
            update: { value: String(store.address) },
            create: { key: 'store.address', value: String(store.address) },
          })
        )
      }
      if (store.logo !== undefined) {
        updates.push(
          prisma.storeConfig.upsert({
            where: { key: 'store.logo' },
            update: { value: store.logo ? String(store.logo) : '' },
            create: { key: 'store.logo', value: store.logo ? String(store.logo) : '' },
          })
        )
      }
    }

    if (hero) {
      if (hero.title !== undefined) {
        updates.push(
          prisma.storeConfig.upsert({
            where: { key: 'homepage.hero_title' },
            update: { value: String(hero.title) },
            create: { key: 'homepage.hero_title', value: String(hero.title) },
          })
        )
      }
      if (hero.subtitle !== undefined) {
        updates.push(
          prisma.storeConfig.upsert({
            where: { key: 'homepage.hero_subtitle' },
            update: { value: String(hero.subtitle) },
            create: { key: 'homepage.hero_subtitle', value: String(hero.subtitle) },
          })
        )
      }
      if (hero.badge !== undefined) {
        updates.push(
          prisma.storeConfig.upsert({
            where: { key: 'homepage.hero_badge' },
            update: { value: String(hero.badge) },
            create: { key: 'homepage.hero_badge', value: String(hero.badge) },
          })
        )
      }
      if (hero.statBooks !== undefined) {
        updates.push(
          prisma.storeConfig.upsert({
            where: { key: 'homepage.hero_stat_books' },
            update: { value: String(hero.statBooks) },
            create: { key: 'homepage.hero_stat_books', value: String(hero.statBooks) },
          })
        )
      }
      if (hero.statDelivery !== undefined) {
        updates.push(
          prisma.storeConfig.upsert({
            where: { key: 'homepage.hero_stat_delivery' },
            update: { value: String(hero.statDelivery) },
            create: { key: 'homepage.hero_stat_delivery', value: String(hero.statDelivery) },
          })
        )
      }
      if (hero.statCustomers !== undefined) {
        updates.push(
          prisma.storeConfig.upsert({
            where: { key: 'homepage.hero_stat_customers' },
            update: { value: String(hero.statCustomers) },
            create: { key: 'homepage.hero_stat_customers', value: String(hero.statCustomers) },
          })
        )
      }
    }

    if (homepage) {
      if (homepage.featuredBookId !== undefined) {
        updates.push(
          prisma.storeConfig.upsert({
            where: { key: 'homepage.featured_book_id' },
            update: { value: String(homepage.featuredBookId) },
            create: { key: 'homepage.featured_book_id', value: String(homepage.featuredBookId) },
          })
        )
      }
    }

    if (updates.length > 0) {
      await prisma.$transaction(updates)
    }

    const entries = await prisma.storeConfig.findMany()
    return res.json({
      success: true,
      message: 'تم حفظ إعدادات المتجر بنجاح',
      data: formatConfig(entries),
    })
  } catch (err) {
    next(err)
  }
}
