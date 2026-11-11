import { useStoreConfig } from '../hooks/useStoreConfig'

// WhatsApp line shown on the policy pages.
export const POLICY_WHATSAPP_NUMBER = '0665128821'

// Shared frame for the short policy pages (shipping, returns): page header,
// content cards, and a WhatsApp contact block using the numbers from Store Settings.

function toWhatsAppNumber(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('212')) return digits
  if (digits.startsWith('0')) return `212${digits.slice(1)}`
  return digits
}

export function PolicyCard({ icon: Icon, title, children }) {
  return (
    <section className="bg-white border border-[#EFE8F2] rounded-[22px] p-5 sm:p-7 shadow-[0_1px_2px_rgba(62,17,71,.04),0_8px_24px_-12px_rgba(62,17,71,.12)]">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-10 h-10 shrink-0 rounded-[12px] bg-[#F6EDF9] border border-[#EBDCF1] flex items-center justify-center">
          <Icon className="w-5 h-5 text-[#6B2178]" />
        </span>
        <h2 className="font-tajawal font-extrabold text-lg sm:text-xl text-[#1C1220]">{title}</h2>
      </div>
      <div className="space-y-2.5 text-[#4A3D50] text-sm sm:text-[14.5px] leading-[1.95]">{children}</div>
    </section>
  )
}

// `numbers` pins the shown lines; without it the Store Settings numbers are used.
export function WhatsAppContact({ title, message, numbers }) {
  const { config } = useStoreConfig()
  const store = config?.store || {}
  const contacts = numbers?.length
    ? numbers.map((n) => ({ number: n }))
    : Array.isArray(store.whatsappContacts) && store.whatsappContacts.length > 0
      ? store.whatsappContacts.filter((c) => c?.number)
      : (store.whatsappNumbers || [store.whatsapp]).filter(Boolean).map((n) => ({ number: n }))

  if (contacts.length === 0) return null

  return (
    <section className="rounded-[22px] p-5 sm:p-7 bg-gradient-to-br from-[#5A1A66] to-[#8B2F9E] text-white">
      <h2 className="font-tajawal font-extrabold text-lg sm:text-xl">{title}</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        {contacts.map((c) => (
          <a
            key={c.number}
            href={`https://wa.me/${toWhatsAppNumber(c.number)}?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/25 px-4 py-2.5 text-sm font-bold hover:bg-white/25 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
              <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.3.4c.1.2.6 1 1.3 1.6.9.8 1.6 1 1.9 1.2.2.1.4.1.5-.1l.7-.9c.2-.2.4-.2.6-.1l1.9.9c.3.1.4.2.5.3.1.2.1.6-.1 1.2z" />
            </svg>
            <span dir="ltr">{c.number}</span>
          </a>
        ))}
      </div>
    </section>
  )
}

export default function PolicyPage({ badgeIcon: BadgeIcon, badge, title, subtitle, children }) {
  return (
    <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-11 sm:py-14">
      <header className="text-center mb-9 sm:mb-11">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6B2178] bg-[#F6EDF9] border border-[#EBDCF1] px-3.5 py-1.5 rounded-full mb-3.5">
          <BadgeIcon className="w-3.5 h-3.5" />
          <span>{badge}</span>
        </span>
        <h1 className="font-tajawal font-extrabold text-3xl sm:text-4xl text-[#1C1220] tracking-tight mb-3">{title}</h1>
        <p className="text-[#7A6D80] text-sm sm:text-[15px] max-w-[540px] mx-auto leading-[1.8]">{subtitle}</p>
      </header>
      <div className="flex flex-col gap-4 sm:gap-5">{children}</div>
    </div>
  )
}
