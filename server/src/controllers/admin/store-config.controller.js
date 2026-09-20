import { prisma } from '../../lib/prisma.js'
import { logActivity } from '../../services/admin/activity-log.service.js'

const DEFAULT_CONFIG = {
  'store.name': 'مكتبة أرين للكتب الشرعية',
  'store.description': 'مجموعة مختارة من الكتب الشرعية والمعرفية لعشاق القراءة وطلب العلم.',
  'store.logo': '',
  'store.contact_phone': '0665128821',
  'store.contact_email': 'arine.ma00@gmail.com',
  'store.whatsapp': '0665128821',
  'store.whatsapp_numbers': JSON.stringify([
    { id: '1', label: 'خدمة العملاء', number: '0665128821' },
    { id: '2', label: 'خط المساعدة والطلب', number: '0665128821' },
  ]),
  'store.address': 'Morocco, Fes, Route Narjis',
  'store.google_maps_url': 'https://maps.google.com/?q=Morocco,+Fes,+Route+Narjis',
  'store.working_days': 'السبت - الخميس',
  'store.opening_time': '09:00',
  'store.closing_time': '20:00',
  'store.business_hours': 'السبت - الخميس: 9:00 ص - 8:00 م',
  'store.announcement': 'توصيل سريع لجميع المدن المغربية • الدفع عند الاستلام',
  'store.customer_service_desc': 'نحن هنا لمساعدتك في اختيار الكتب المناسبة والإجابة عن جميع استفساراتك.',
  'store.instagram': 'https://instagram.com/arine_bookstore',
  'store.tiktok': 'https://tiktok.com/@arine_bookstore',
  'homepage.hero_title': 'اكتشف كتابك القادم',
  'homepage.hero_subtitle': 'مجموعة مختارة من الكتب الشرعية والمعرفية لعشاق القراءة وطلب العلم.',
  'homepage.hero_badge': 'مكتبة أرين للكتب الشرعية',
  'homepage.hero_stat_books': '+2000',
  'homepage.hero_stat_delivery': '24/48h',
  'homepage.hero_stat_customers': '+5000',
  'homepage.featured_book_id': '3',
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

// Helper to convert key-value list to structured object
function formatConfig(entries) {
  const map = {}
  for (const entry of entries) {
    map[entry.key] = entry.value
  }

  // Get value with fallback to default only if key is not present in DB
  const getVal = (key) => (map[key] !== undefined ? map[key] : DEFAULT_CONFIG[key])

  const rawWaNumbers = map['store.whatsapp_numbers'] !== undefined ? map['store.whatsapp_numbers'] : DEFAULT_CONFIG['store.whatsapp_numbers']
  const rawPrimaryWa = map['store.whatsapp'] !== undefined ? map['store.whatsapp'] : DEFAULT_CONFIG['store.whatsapp']
  const whatsappContacts = parseWhatsAppContacts(rawWaNumbers, rawPrimaryWa)
  const primaryContact = whatsappContacts.find((c) => c.isPrimary) || whatsappContacts[0]
  const primaryWhatsapp = primaryContact?.number || rawPrimaryWa || '0665128821'
  const whatsappNumbers = whatsappContacts.map((c) => c.number).filter(Boolean)

  let businessHours = getVal('store.business_hours')
  if (!businessHours && (map['store.working_days'] || map['store.opening_time'])) {
    const days = getVal('store.working_days') || 'السبت - الخميس'
    const open = getVal('store.opening_time') || '09:00'
    const close = getVal('store.closing_time') || '20:00'
    businessHours = `${days}: ${open} - ${close}`
  }

  const address = getVal('store.address') || ''
  const rawMapsUrl = getVal('store.google_maps_url')
  const googleMapsUrl = rawMapsUrl ? sanitizeUrl(rawMapsUrl) : (address ? `https://maps.google.com/?q=${encodeURIComponent(address)}` : '')

  return {
    store: {
      name: getVal('store.name') || '',
      description: getVal('store.description') || '',
      phone: getVal('store.contact_phone') || '',
      email: getVal('store.contact_email') || '',
      whatsapp: primaryWhatsapp,
      whatsappNumbers: whatsappNumbers,
      whatsappContacts: whatsappContacts,
      address: address,
      googleMapsUrl: googleMapsUrl,
      workingDays: getVal('store.working_days') || '',
      openingTime: getVal('store.opening_time') || '',
      closingTime: getVal('store.closing_time') || '',
      businessHours: businessHours || '',
      announcement: getVal('store.announcement') !== undefined ? getVal('store.announcement') : '',
      customerServiceDesc: getVal('store.customer_service_desc') || '',
      instagram: sanitizeUrl(getVal('store.instagram')),
      tiktok: sanitizeUrl(getVal('store.tiktok')),
      logo: getVal('store.logo') || null,
    },
    hero: {
      title: getVal('homepage.hero_title') || '',
      subtitle: getVal('homepage.hero_subtitle') || '',
      badge: getVal('homepage.hero_badge') || '',
      statBooks: getVal('homepage.hero_stat_books') || '',
      statDelivery: getVal('homepage.hero_stat_delivery') || '',
      statCustomers: getVal('homepage.hero_stat_customers') || '',
    },
    homepage: {
      featuredBookId: Number(getVal('homepage.featured_book_id')) || 3,
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

    // Support raw key-value updates
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
            update: { value: String(store.name).trim() },
            create: { key: 'store.name', value: String(store.name).trim() },
          })
        )
      }
      if (store.description !== undefined) {
        updates.push(
          prisma.storeConfig.upsert({
            where: { key: 'store.description' },
            update: { value: String(store.description).trim() },
            create: { key: 'store.description', value: String(store.description).trim() },
          })
        )
      }
      if (store.phone !== undefined) {
        updates.push(
          prisma.storeConfig.upsert({
            where: { key: 'store.contact_phone' },
            update: { value: String(store.phone).trim() },
            create: { key: 'store.contact_phone', value: String(store.phone).trim() },
          })
        )
      }
      if (store.email !== undefined) {
        const emailStr = String(store.email).trim()
        if (emailStr && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
          return res.status(400).json({ success: false, message: 'البريد الإلكتروني غير صالح' })
        }
        updates.push(
          prisma.storeConfig.upsert({
            where: { key: 'store.contact_email' },
            update: { value: emailStr },
            create: { key: 'store.contact_email', value: emailStr },
          })
        )
      }
      if (store.whatsappContacts !== undefined || store.whatsappNumbers !== undefined || store.whatsapp1Number !== undefined || store.whatsapp2Number !== undefined || store.whatsapp !== undefined) {
        let contacts = []
        if (store.whatsapp1Number !== undefined || store.whatsapp2Number !== undefined || store.whatsapp1Name !== undefined || store.whatsapp2Name !== undefined) {
          contacts = [
            {
              id: '1',
              label: String(store.whatsapp1Name || store.whatsapp1Label || '').trim() || 'خدمة العملاء',
              number: String(store.whatsapp1Number || store.whatsapp1 || '').trim(),
            },
            {
              id: '2',
              label: String(store.whatsapp2Name || store.whatsapp2Label || '').trim() || 'خط المساعدة والطلب',
              number: String(store.whatsapp2Number || store.whatsapp2 || '').trim(),
            },
          ]
        } else if (store.whatsappContacts !== undefined || store.whatsappNumbers !== undefined) {
          const rawInput = store.whatsappContacts !== undefined ? store.whatsappContacts : store.whatsappNumbers
          contacts = parseWhatsAppContacts(rawInput, store.whatsapp || '')
        } else if (store.whatsapp !== undefined) {
          const waStr = String(store.whatsapp).trim()
          contacts = [
            { id: '1', label: 'خدمة العملاء', number: waStr },
            { id: '2', label: 'خط المساعدة والطلب', number: waStr },
          ]
        }

        const c1 = contacts[0] || {}
        const c2 = contacts[1] || {}
        const cleanContacts = [
          {
            id: '1',
            label: String(c1.label || '').trim() || 'خدمة العملاء',
            number: String(c1.number || '').trim(),
          },
          {
            id: '2',
            label: String(c2.label || '').trim() || 'خط المساعدة والطلب',
            number: String(c2.number || '').trim(),
          },
        ]

        const primaryNumber = cleanContacts[0].number || cleanContacts[1].number || ''

        updates.push(
          prisma.storeConfig.upsert({
            where: { key: 'store.whatsapp_numbers' },
            update: { value: JSON.stringify(cleanContacts) },
            create: { key: 'store.whatsapp_numbers', value: JSON.stringify(cleanContacts) },
          }),
          prisma.storeConfig.upsert({
            where: { key: 'store.whatsapp' },
            update: { value: primaryNumber },
            create: { key: 'store.whatsapp', value: primaryNumber },
          })
        )
      }
      if (store.address !== undefined) {
        updates.push(
          prisma.storeConfig.upsert({
            where: { key: 'store.address' },
            update: { value: String(store.address).trim() },
            create: { key: 'store.address', value: String(store.address).trim() },
          })
        )
      }
      if (store.googleMapsUrl !== undefined) {
        const safeUrl = sanitizeUrl(store.googleMapsUrl)
        updates.push(
          prisma.storeConfig.upsert({
            where: { key: 'store.google_maps_url' },
            update: { value: safeUrl },
            create: { key: 'store.google_maps_url', value: safeUrl },
          })
        )
      }
      if (store.workingDays !== undefined) {
        updates.push(
          prisma.storeConfig.upsert({
            where: { key: 'store.working_days' },
            update: { value: String(store.workingDays).trim() },
            create: { key: 'store.working_days', value: String(store.workingDays).trim() },
          })
        )
      }
      if (store.openingTime !== undefined) {
        updates.push(
          prisma.storeConfig.upsert({
            where: { key: 'store.opening_time' },
            update: { value: String(store.openingTime).trim() },
            create: { key: 'store.opening_time', value: String(store.openingTime).trim() },
          })
        )
      }
      if (store.closingTime !== undefined) {
        updates.push(
          prisma.storeConfig.upsert({
            where: { key: 'store.closing_time' },
            update: { value: String(store.closingTime).trim() },
            create: { key: 'store.closing_time', value: String(store.closingTime).trim() },
          })
        )
      }
      if (store.businessHours !== undefined) {
        updates.push(
          prisma.storeConfig.upsert({
            where: { key: 'store.business_hours' },
            update: { value: String(store.businessHours).trim() },
            create: { key: 'store.business_hours', value: String(store.businessHours).trim() },
          })
        )
      }
      if (store.announcement !== undefined) {
        updates.push(
          prisma.storeConfig.upsert({
            where: { key: 'store.announcement' },
            update: { value: String(store.announcement).trim() },
            create: { key: 'store.announcement', value: String(store.announcement).trim() },
          })
        )
      }
      if (store.customerServiceDesc !== undefined) {
        updates.push(
          prisma.storeConfig.upsert({
            where: { key: 'store.customer_service_desc' },
            update: { value: String(store.customerServiceDesc).trim() },
            create: { key: 'store.customer_service_desc', value: String(store.customerServiceDesc).trim() },
          })
        )
      }
      if (store.instagram !== undefined) {
        const safeUrl = sanitizeUrl(store.instagram)
        updates.push(
          prisma.storeConfig.upsert({
            where: { key: 'store.instagram' },
            update: { value: safeUrl },
            create: { key: 'store.instagram', value: safeUrl },
          })
        )
      }
      if (store.tiktok !== undefined) {
        const safeUrl = sanitizeUrl(store.tiktok)
        updates.push(
          prisma.storeConfig.upsert({
            where: { key: 'store.tiktok' },
            update: { value: safeUrl },
            create: { key: 'store.tiktok', value: safeUrl },
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

    await logActivity({
      actor: req.admin,
      action: 'STORE_SETTINGS_UPDATED',
      resourceType: 'STORE_CONFIG',
      details: { updatedKeys: updates.length },
      req,
    })

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
