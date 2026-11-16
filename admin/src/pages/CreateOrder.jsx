import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Plus, X, Search, Package as PackageIcon, BookOpen, Save } from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { api } from '../lib/api.js'
import { formatMoney, getOrderStatus } from '../lib/format.js'
import { PageHeader, Card } from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import { Input, Select, Textarea } from '../components/ui/Input.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

const SOURCES = ['WHATSAPP', 'INSTAGRAM', 'FACEBOOK', 'PHONE', 'STORE', 'OTHER']
const STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED']

const field =
  'w-full rounded-[10px] border border-[var(--line)] bg-[var(--card)] px-2.5 py-1.5 text-xs text-[var(--ink)] focus:border-[var(--purple)] focus:outline-none'

// Whole dirhams, like every order price in the store. '' → null.
const toDh = (text) => {
  const clean = String(text ?? '').trim()
  return /^\d+$/.test(clean) ? Number(clean) : null
}

export default function CreateOrder() {
  const { t, language, isRTL } = useLanguage()
  const navigate = useNavigate()
  const BackIcon = isRTL ? ArrowRight : ArrowLeft
  const money = (n) => formatMoney(n, language)

  const { data: products } = useFetch('/products')
  const { data: packages } = useFetch('/packages')

  const [customer, setCustomer] = useState({ fullName: '', phone: '', city: '', address: '', note: '' })
  const [source, setSource] = useState('WHATSAPP')
  const [status, setStatus] = useState('PENDING')
  const [shipping, setShipping] = useState('')
  const [lines, setLines] = useState([])
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [conflicts, setConflicts] = useState(null)

  const catalog = useMemo(
    () => [
      ...(products || []).map((p) => ({ kind: 'BOOK', id: p.id, title: p.title, sub: p.author, price: p.price, cost: p.costPrice ?? null })),
      ...(packages || []).map((p) => ({ kind: 'PACKAGE', id: p.id, title: p.title, sub: t('coPackage'), price: p.price, cost: p.costPrice ?? null })),
    ],
    [products, packages, t]
  )
  const results = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return catalog
      .filter((c) => !lines.some((l) => l.kind === c.kind && l.id === c.id))
      .filter((c) => `${c.title} ${c.sub || ''}`.toLowerCase().includes(q))
      .slice(0, 8)
  }, [catalog, search, lines])

  const addLine = (c) => {
    setLines((ls) => [...ls, { ...c, quantity: '1', unitPrice: String(c.price) }])
    setSearch('')
  }
  const setLine = (i, patch) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  const removeLine = (i) => setLines((ls) => ls.filter((_, j) => j !== i))

  const parsed = lines.map((l) => ({ ...l, qty: toDh(l.quantity), price: toDh(l.unitPrice) }))
  const linesValid = parsed.length > 0 && parsed.every((l) => l.qty > 0 && l.price != null)
  const subtotal = parsed.reduce((s, l) => s + (l.qty || 0) * (l.price || 0), 0)
  const shippingValue = shipping.trim() === '' ? null : toDh(shipping)
  const shippingValid = shipping.trim() === '' || shippingValue != null
  const knownCost = parsed.every((l) => l.cost != null)
  const goodsProfit = knownCost ? parsed.reduce((s, l) => s + (l.qty || 0) * ((l.price || 0) - l.cost), 0) : null

  const customerValid = customer.fullName.trim().length >= 2 && customer.phone.trim().length >= 8
  const canSubmit = !busy && linesValid && shippingValid && customerValid

  async function submit() {
    setBusy(true)
    setError('')
    setConflicts(null)
    try {
      const res = await api.post('/orders', {
        fullName: customer.fullName.trim(),
        phone: customer.phone.trim(),
        city: customer.city.trim(),
        address: customer.address.trim(),
        note: customer.note.trim() || undefined,
        source,
        status,
        shipping: shippingValue,
        items: parsed.filter((l) => l.kind === 'BOOK').map((l) => ({ productId: l.id, quantity: l.qty, unitPrice: l.price })),
        packages: parsed.filter((l) => l.kind === 'PACKAGE').map((l) => ({ packageId: l.id, quantity: l.qty, unitPrice: l.price })),
      })
      window.dispatchEvent(new Event('order-status-updated'))
      navigate(`/orders/${res.data.id}`)
    } catch (err) {
      if (err.code === 'STOCK_CONFLICT' && err.conflicts?.length) setConflicts(err.conflicts)
      else setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const setC = (k) => (e) => setCustomer((c) => ({ ...c, [k]: e.target.value }))

  return (
    <div>
      <button
        onClick={() => navigate('/orders')}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors cursor-pointer"
      >
        <BackIcon className="h-4 w-4" aria-hidden="true" />
        {t('back')} — {t('ordersTitle')}
      </button>

      <PageHeader title={t('coTitle')} subtitle={t('coSubtitle')} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <Card className="space-y-3">
            <h2 className="text-sm font-bold text-[var(--ink)]">{t('customerInfoTitle')}</h2>
            <Input label={`${t('customerNameLabel')} *`} value={customer.fullName} onChange={setC('fullName')} maxLength={100} />
            <Input label={`${t('customerPhoneLabel')} *`} value={customer.phone} onChange={setC('phone')} maxLength={20} dir="ltr" inputMode="tel" />
            <Input label={t('customerCityCol')} value={customer.city} onChange={setC('city')} maxLength={80} />
            <Input label={t('customerAddressLabel')} value={customer.address} onChange={setC('address')} maxLength={300} />
            <Textarea label={t('coNote')} rows={2} value={customer.note} onChange={setC('note')} maxLength={500} />
          </Card>

          <Card className="space-y-3">
            <Select label={t('coSource')} value={source} onChange={(e) => setSource(e.target.value)}>
              {SOURCES.map((s) => (
                <option key={s} value={s}>{t(`source_${s}`)}</option>
              ))}
            </Select>
            <Select label={t('orderStatus')} value={status} onChange={(e) => setStatus(e.target.value)} hint={t('coStatusHint')}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{getOrderStatus(s, t).label}</option>
              ))}
            </Select>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <h2 className="mb-3 text-sm font-bold text-[var(--ink)]">{t('coItems')}</h2>
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-[var(--ink-soft)]" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('coSearchPlaceholder')}
                className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--card)] py-2 pe-3 ps-9 text-[13px] text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:border-[var(--purple)] focus:outline-none"
              />
              {results.length > 0 ? (
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--card)] shadow-lg">
                  {results.map((c) => (
                    <button
                      key={`${c.kind}-${c.id}`}
                      type="button"
                      onClick={() => addLine(c)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-start text-xs hover:bg-[var(--bg)]"
                    >
                      <span className="flex items-center gap-2">
                        {c.kind === 'PACKAGE' ? <PackageIcon className="h-3.5 w-3.5 text-[var(--purple)]" /> : <BookOpen className="h-3.5 w-3.5 text-[var(--ink-soft)]" />}
                        <span className="font-semibold text-[var(--ink)]">{c.title}</span>
                        <span className="text-[var(--ink-soft)]">{c.sub}</span>
                      </span>
                      <span className="flex items-center gap-2 tabular-nums">
                        {money(c.price)} <Plus className="h-3.5 w-3.5 text-[var(--purple)]" />
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {lines.length === 0 ? (
              <p className="py-6 text-center text-xs text-[var(--ink-soft)]">{t('coNoItems')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--line)] text-[var(--ink-soft)]">
                      <th className="py-2 text-start font-semibold">{t('colBook')}</th>
                      <th className="py-2 text-start font-semibold w-20">{t('colQty')}</th>
                      <th className="py-2 text-start font-semibold w-28">{t('coUnitPrice')}</th>
                      <th className="py-2 text-start font-semibold">{t('colCostPrice')}</th>
                      <th className="py-2 text-start font-semibold">{t('total')}</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((l, i) => (
                      <tr key={`${l.kind}-${l.id}`} className="border-b border-[var(--line)] last:border-0">
                        <td className="py-2 font-semibold text-[var(--ink)]">
                          {l.title}
                          {/* lines[i].price is the catalog price; l.price is the typed one */}
                          {l.price != null && l.price !== lines[i].price ? (
                            <span className="block text-[10.5px] font-normal text-[var(--orange)]">{t('coPriceChanged')}</span>
                          ) : null}
                        </td>
                        <td className="py-2 pe-2">
                          <input className={`${field} ${l.qty > 0 ? '' : 'border-[var(--red)]'}`} inputMode="numeric" value={lines[i].quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
                        </td>
                        <td className="py-2 pe-2">
                          <input className={`${field} ${l.price != null ? '' : 'border-[var(--red)]'}`} inputMode="numeric" value={lines[i].unitPrice} onChange={(e) => setLine(i, { unitPrice: e.target.value })} />
                        </td>
                        <td className="py-2 tabular-nums text-[var(--ink-soft)]">{l.cost == null ? '—' : money(l.cost)}</td>
                        <td className="py-2 tabular-nums font-semibold">{money((l.qty || 0) * (l.price || 0))}</td>
                        <td className="py-2">
                          <button type="button" onClick={() => removeLine(i)} className="rounded-[8px] p-1.5 text-[var(--ink-soft)] hover:bg-[var(--red-bg)] hover:text-[var(--red)]" aria-label={t('delete')}>
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label={t('shippingFeeLabel')} inputMode="numeric" value={shipping} onChange={(e) => setShipping(e.target.value)} placeholder={t('coShippingAuto')} hint={t('coShippingHint')} error={shippingValid ? '' : t('coInvalidNumber')} />
              <div className="space-y-1.5 rounded-[12px] border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2.5 text-xs">
                <div className="flex justify-between"><span className="text-[var(--ink-soft)]">{t('subtotalLabel')}</span><span className="tabular-nums font-semibold">{money(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-[var(--ink-soft)]">{t('shippingFeeLabel')}</span><span className="tabular-nums font-semibold">{shippingValue == null ? t('coShippingAuto') : money(shippingValue)}</span></div>
                <div className="flex justify-between border-t border-[var(--line)] pt-1.5 text-sm font-extrabold"><span>{t('total')}</span><span className="tabular-nums text-[var(--purple)]">{shippingValue == null ? `${money(subtotal)} + ${t('shippingFeeLabel')}` : money(subtotal + shippingValue)}</span></div>
                <div className="flex justify-between"><span className="text-[var(--ink-soft)]">{t('coGoodsProfit')}</span><span className={`tabular-nums font-semibold ${goodsProfit == null ? 'text-[var(--ink-soft)]' : goodsProfit < 0 ? 'text-[var(--red)]' : 'text-[var(--green)]'}`}>{goodsProfit == null ? t('coCostUnknown') : money(goodsProfit)}</span></div>
              </div>
            </div>

            {error ? <div className="mt-3"><ErrorBanner message={error} /></div> : null}
            {conflicts ? (
              <div className="mt-3 rounded-[10px] border border-[var(--red)]/30 bg-[var(--red-bg)] px-3 py-2.5 text-xs text-[var(--red)]">
                <p className="mb-1 font-semibold">{t('coStockConflict')}</p>
                {conflicts.map((c, i) => (
                  <p key={i}>{c.productTitle}: {t('coStockNeeded', { requested: c.requested, available: c.available })}</p>
                ))}
              </div>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => navigate('/orders')} disabled={busy}>{t('cancel')}</Button>
              <Button variant="primary" onClick={submit} disabled={!canSubmit}>
                <Save className="h-3.5 w-3.5" /> {busy ? t('saving') : t('coCreate')}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
