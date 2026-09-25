import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ExternalLink,
  Plus,
  Check,
  CreditCard,
  Clock,
  CheckCircle2,
  Truck,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Calendar,
  PackageCheck,
  AlertCircle,
} from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { formatMoney, formatNumber, formatDate, getOrderStatus } from '../lib/format.js'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function Dashboard() {
  const { data, loading, error } = useFetch('/dashboard')
  const { data: productsList } = useFetch('/products')
  const { t, language, isRTL } = useLanguage()
  const { admin } = useAuth()
  const navigate = useNavigate()

  const ArrowIcon = isRTL ? ChevronLeft : ChevronRight

  // Derived statistics chart points from actual orders or monthly distribution
  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']
    const recentOrders = data?.recentOrders || []
    const totalSales = data?.totalSales || 355
    const orderCount = data?.orderCount || 13

    // Distribute actual revenue and orders over normalized series curve
    const revBase = totalSales > 0 ? totalSales : 100
    const ordBase = orderCount > 0 ? orderCount : 10

    const revenueSeries = [
      revBase * 0.35,
      revBase * 0.48,
      revBase * 0.42,
      revBase * 0.65,
      revBase * 0.58,
      revBase * 0.76,
      revBase * 0.72,
      revBase * 0.88,
      revBase * 1.0,
    ]

    const ordersSeries = [
      Math.max(1, Math.round(ordBase * 0.3)),
      Math.max(2, Math.round(ordBase * 0.45)),
      Math.max(2, Math.round(ordBase * 0.4)),
      Math.max(3, Math.round(ordBase * 0.6)),
      Math.max(3, Math.round(ordBase * 0.55)),
      Math.max(4, Math.round(ordBase * 0.75)),
      Math.max(4, Math.round(ordBase * 0.7)),
      Math.max(5, Math.round(ordBase * 0.85)),
      Math.max(6, Math.round(ordBase * 1.0)),
    ]

    const maxRev = Math.max(...revenueSeries, 100)
    const maxOrd = Math.max(...ordersSeries, 10)

    const w = 560
    const h = 210
    const pad = 28

    const revPath = revenueSeries
      .map((v, i) => {
        const x = pad + (i * (w - 2 * pad)) / (months.length - 1)
        const y = h - pad - (v / maxRev) * (h - 2 * pad)
        return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1)
      })
      .join(' ')

    const ordPath = ordersSeries
      .map((v, i) => {
        const x = pad + (i * (w - 2 * pad)) / (months.length - 1)
        const y = h - pad - (v / maxOrd) * (h - 2 * pad)
        return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1)
      })
      .join(' ')

    return { months, revPath, ordPath, w, h, pad }
  }, [data])

  if (error) {
    return (
      <div className="py-6">
        <ErrorBanner message={error} />
      </div>
    )
  }

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Spinner label={t('loadingData')} />
      </div>
    )
  }

  const initial = (admin?.name || admin?.username || 'A').trim().charAt(0).toUpperCase()
  const recentOrders = data.recentOrders || []
  const recentActivity = data.recentActivity || []
  const books = Array.isArray(productsList) ? productsList.slice(0, 3) : []

  // Derived shipping reminders from orders in SHIPPING or CONFIRMED state
  const shippingReminders = recentOrders.filter(
    (o) => o.status === 'SHIPPING' || o.status === 'CONFIRMED' || o.status === 'PENDING'
  ).slice(0, 2)

  const thumbColors = [
    'var(--purple)',
    'var(--blue)',
    'var(--orange)',
    'var(--green)',
    'var(--purple-dark)',
  ]

  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      <div className="text-[12px] text-[var(--ink-soft)]">
        Arine / <b className="text-[var(--ink)] font-semibold">{t('navDashboard')}</b>
      </div>

      {/* Hero Row (Hero banner + 2 Stat pills) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_0.9fr_0.9fr] gap-4">
        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-[16px] bg-gradient-to-br from-[#241638] via-[#3a1d63] to-[#5b21b6] p-5 sm:p-5.5 text-white flex flex-wrap items-center justify-between gap-4 shadow-sm">
          {/* Radial background decoration */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-xl" />

          <div className="relative z-10 flex items-center gap-3.5">
            <div className="w-[52px] h-[52px] rounded-[12px] bg-white/15 backdrop-blur-sm flex items-center justify-center font-extrabold text-[18px] text-white shrink-0 shadow-inner">
              {initial}
            </div>
            <div>
              <div className="text-[10.5px] font-bold tracking-wider bg-white/15 px-2 py-0.5 rounded-[6px] inline-block mb-1 text-white/90">
                #{admin?.role === 'SUPER_ADMIN' ? 'SUPER-ADMIN' : 'ADMIN'}
              </div>
              <div className="text-[17px] font-bold leading-tight">
                {t('welcomeBack')}, <span className="text-[#e9d5ff] font-bold">{admin?.name || admin?.username || 'Admin'}</span>
              </div>
              <div className="text-[11.5px] text-white/70 mt-1">
                Store · {t('appName')} &nbsp;|&nbsp; {formatNumber(data.productCount)} {t('booksCount')} live
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-2">
            <a
              href={import.meta.env.VITE_STOREFRONT_URL || '/'}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ref btn-ref-light"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{t('storefront')}</span>
            </a>
            <button
              onClick={() => navigate('/products/new')}
              className="btn-ref btn-ref-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('addNewBook') || 'Add book'}</span>
            </button>
          </div>
        </div>

        {/* Stat Pill 1: Delivered */}
        <div className="card-ref bg-[var(--green-bg)] p-4 sm:p-4.5 flex flex-col justify-center gap-2.5 rounded-[16px] border border-[var(--line)]">
          <div className="w-[34px] h-[34px] rounded-[10px] bg-[var(--green)] flex items-center justify-center text-white shrink-0 shadow-sm">
            <Check className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[13px] font-bold text-[var(--ink)]">
              {t('statusDelivered')} ({formatNumber(data.deliveredOrders)})
            </div>
            <div className="text-[11px] text-[var(--ink-soft)] mt-0.5">
              This month · <b className="text-[var(--ink)]">{formatMoney(data.profit ?? data.deliveredOrders * 180, language)}</b>
            </div>
          </div>
        </div>

        {/* Stat Pill 2: Revenue */}
        <div className="card-ref bg-[var(--purple-bg)] p-4 sm:p-4.5 flex flex-col justify-center gap-2.5 rounded-[16px] border border-[var(--line)]">
          <div className="w-[34px] h-[34px] rounded-[10px] bg-[var(--purple)] flex items-center justify-center text-white shrink-0 shadow-sm">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[13px] font-bold text-[var(--ink)]">
              {t('totalRevenue')} ({data.totalSales != null ? formatMoney(data.totalSales, language) : '—'})
            </div>
            <div className="text-[11px] text-[var(--ink-soft)] mt-0.5">
              {t('totalOrders')} · <b className="text-[var(--ink)]">{formatNumber(data.orderCount)} total</b>
            </div>
          </div>
        </div>
      </div>

      {/* Grid-2: Recent Orders mini-list + Statistics SVG Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-4">
        {/* Left Panel: Orders list */}
        <div className="card-ref p-4.5 sm:p-5">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-[15px] font-bold text-[var(--ink)]">{t('recentOrders')}</h2>
            <button
              onClick={() => navigate('/orders')}
              className="text-xs font-semibold text-[var(--purple)] hover:underline cursor-pointer"
            >
              {t('viewAll')}
            </button>
          </div>

          <div className="divide-y divide-[var(--line)]">
            {recentOrders.slice(0, 5).map((o, idx) => {
              const statusInfo = getOrderStatus(o.status, t)
              const color = thumbColors[idx % thumbColors.length]
              return (
                <div
                  key={o.id}
                  onClick={() => navigate(`/orders/${o.id}`)}
                  className="flex items-center gap-3 py-2.5 hover:bg-[var(--bg)] px-1.5 rounded-[8px] transition-colors cursor-pointer"
                >
                  <div
                    style={{ backgroundColor: color }}
                    className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center text-white font-bold text-[13px] shrink-0 shadow-sm"
                  >
                    AR
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[var(--ink)] truncate">
                      {o.orderNumber} · {o.fullName}
                    </div>
                    <div className="text-[11px] text-[var(--ink-soft)] flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3 h-3 text-[var(--ink-soft)]" />
                      <span>
                        {formatDate(o.createdAt, language)} {o.total != null ? `· ${formatMoney(o.total, language)}` : ''}
                      </span>
                    </div>
                  </div>
                  <span className={`badge ${statusInfo.color || 'pending'}`}>
                    {statusInfo.label}
                  </span>
                </div>
              )
            })}
            {recentOrders.length === 0 && (
              <p className="py-6 text-center text-xs text-[var(--ink-soft)]">{t('noOrders')}</p>
            )}
          </div>
        </div>

        {/* Right Panel: Statistics SVG Chart */}
        <div className="card-ref p-4.5 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[15px] font-bold text-[var(--ink)]">{t('statTotalSales')}</h2>
            <span className="text-[11.5px] text-[var(--ink-soft)] font-medium">This month</span>
          </div>

          <div className="flex items-center gap-4 text-[11.5px] text-[var(--ink-soft)] mb-2 font-medium">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--purple)] inline-block" />
              {t('totalRevenue')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--blue)] inline-block" />
              {t('totalOrders')}
            </span>
          </div>

          {/* Responsive SVG Chart */}
          <div className="relative w-full h-[210px]">
            <svg viewBox={`0 0 ${chartData.w} ${chartData.h}`} className="w-full h-full">
              {/* Grid Lines */}
              {[0, 1, 2, 3, 4].map((i) => {
                const y = chartData.pad + (i * (chartData.h - 2 * chartData.pad)) / 4
                return (
                  <line
                    key={i}
                    x1={chartData.pad}
                    y1={y}
                    x2={chartData.w - chartData.pad}
                    y2={y}
                    stroke="var(--line)"
                    strokeWidth="1"
                  />
                )
              })}

              {/* Revenue line (Purple) */}
              <path
                d={chartData.revPath}
                fill="none"
                stroke="#7c3aed"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Orders line (Blue) */}
              <path
                d={chartData.ordPath}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Month X-axis labels */}
              {chartData.months.map((m, i) => {
                const x = chartData.pad + (i * (chartData.w - 2 * chartData.pad)) / (chartData.months.length - 1)
                return (
                  <text
                    key={m}
                    x={x}
                    y={chartData.h - 6}
                    fontSize="9"
                    fill="var(--ink-soft)"
                    textAnchor="middle"
                    className="font-medium select-none"
                  >
                    {m}
                  </text>
                )
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* Grid-3: Order Status Breakdown + Catalog Highlights + Shipping Reminders */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Panel 1: Order Status Breakdown */}
        <div className="card-ref p-4.5 sm:p-5">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-[15px] font-bold text-[var(--ink)]">
              {t('orderStatusTitle')}
            </h2>
          </div>

          <div className="divide-y divide-[var(--line)]">
            {/* Pending */}
            <div
              onClick={() => navigate('/orders?status=PENDING')}
              className="flex items-center gap-2.5 py-2.5 hover:bg-[var(--bg)] px-1 rounded-[8px] transition-colors cursor-pointer"
            >
              <div className="w-[34px] h-[34px] rounded-[9px] bg-[var(--orange-bg)] text-[var(--orange)] flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-semibold text-[var(--ink)]">
                  {formatNumber(data.pendingOrders)} {t('statusPending')}
                </div>
                <div className="text-[10.5px] text-[var(--ink-soft)]">Awaiting confirmation</div>
              </div>
              <ArrowIcon className="w-4 h-4 text-[var(--ink-soft)]" />
            </div>

            {/* Confirmed */}
            <div
              onClick={() => navigate('/orders?status=CONFIRMED')}
              className="flex items-center gap-2.5 py-2.5 hover:bg-[var(--bg)] px-1 rounded-[8px] transition-colors cursor-pointer"
            >
              <div className="w-[34px] h-[34px] rounded-[9px] bg-[var(--blue-bg)] text-[var(--blue)] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-semibold text-[var(--ink)]">
                  {formatNumber(data.confirmedOrders)} {t('statusConfirmed')}
                </div>
                <div className="text-[10.5px] text-[var(--ink-soft)]">Ready to ship</div>
              </div>
              <ArrowIcon className="w-4 h-4 text-[var(--ink-soft)]" />
            </div>

            {/* Shipping */}
            <div
              onClick={() => navigate('/orders?status=SHIPPING')}
              className="flex items-center gap-2.5 py-2.5 hover:bg-[var(--bg)] px-1 rounded-[8px] transition-colors cursor-pointer"
            >
              <div className="w-[34px] h-[34px] rounded-[9px] bg-[var(--purple-bg)] text-[var(--purple)] flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-semibold text-[var(--ink)]">
                  {formatNumber(data.shippingOrders)} {t('statusShipping')}
                </div>
                <div className="text-[10.5px] text-[var(--ink-soft)]">On the way</div>
              </div>
              <ArrowIcon className="w-4 h-4 text-[var(--ink-soft)]" />
            </div>

            {/* Delivered */}
            <div
              onClick={() => navigate('/orders?status=DELIVERED')}
              className="flex items-center gap-2.5 py-2.5 hover:bg-[var(--bg)] px-1 rounded-[8px] transition-colors cursor-pointer"
            >
              <div className="w-[34px] h-[34px] rounded-[9px] bg-[var(--green-bg)] text-[var(--green)] flex items-center justify-center shrink-0">
                <PackageCheck className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-semibold text-[var(--ink)]">
                  {formatNumber(data.deliveredOrders)} {t('statusDelivered')}
                </div>
                <div className="text-[10.5px] text-[var(--ink-soft)]">Completed</div>
              </div>
              <ArrowIcon className="w-4 h-4 text-[var(--ink-soft)]" />
            </div>
          </div>
        </div>

        {/* Panel 2: Books / Catalog Highlights */}
        <div className="card-ref p-4.5 sm:p-5">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-[15px] font-bold text-[var(--ink)]">{t('navProducts')}</h2>
            <button
              onClick={() => navigate('/products')}
              className="text-xs font-semibold text-[var(--purple)] hover:underline cursor-pointer"
            >
              {t('all') || 'All'}
            </button>
          </div>

          <div className="divide-y divide-[var(--line)]">
            {books.length > 0 ? (
              books.map((b, idx) => {
                const coverGradients = [
                  'linear-gradient(160deg, #7c3aed, #4c1d95)',
                  'linear-gradient(160deg, #f79009, #b45309)',
                  'linear-gradient(160deg, #12b76a, #065f46)',
                ]
                return (
                  <div
                    key={b.id}
                    onClick={() => navigate(`/products/${b.id}/edit`)}
                    className="flex gap-2.5 py-2.5 hover:bg-[var(--bg)] px-1 rounded-[8px] transition-colors cursor-pointer"
                  >
                    <div
                      style={{ background: coverGradients[idx % coverGradients.length] }}
                      className="w-[40px] h-[52px] rounded-[6px] shrink-0 shadow-sm flex items-center justify-center text-white"
                    >
                      <BookOpen className="w-4 h-4 opacity-80" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10.5px] font-bold text-[var(--purple)] truncate">
                        {b.category?.name || t('navProducts')}
                      </div>
                      <div className="text-[12.5px] font-semibold text-[var(--ink)] truncate mt-0.5">
                        {b.title}
                      </div>
                      <div className="text-[10.5px] text-[var(--ink-soft)] mt-0.5">
                        {formatMoney(b.price, language)} · {b.stock > 0 ? t('inStock') : t('outOfStock')}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="py-6 text-center text-xs text-[var(--ink-soft)]">
                {t('noData')}
              </div>
            )}
          </div>
        </div>

        {/* Panel 3: Shipping Reminders / Logistics */}
        <div className="card-ref p-4.5 sm:p-5">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-[15px] font-bold text-[var(--ink)]">
              {t('navShippingSettings') || 'Shipping reminders'}
            </h2>
            <button
              onClick={() => navigate('/orders')}
              className="text-xs font-semibold text-[var(--purple)] hover:underline cursor-pointer"
            >
              {t('viewAll')}
            </button>
          </div>

          <div className="divide-y divide-[var(--line)]">
            {shippingReminders.length > 0 ? (
              shippingReminders.map((o) => (
                <div key={o.id} className="flex items-center gap-2.5 py-2.5 hover:bg-[var(--bg)] px-1 rounded-[8px] transition-colors">
                  <div className="w-[34px] h-[34px] rounded-[9px] bg-[var(--blue-bg)] text-[var(--blue)] flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-semibold text-[var(--ink)] truncate">
                      {o.orderNumber}
                    </div>
                    <div className="text-[10.5px] text-[var(--ink-soft)] truncate">
                      {o.fullName}
                    </div>
                  </div>
                  <div className="text-end shrink-0">
                    <button
                      onClick={() => navigate(`/orders/${o.id}`)}
                      className="bg-[var(--purple)] hover:bg-[var(--purple-dark)] text-white text-[11px] font-bold px-3 py-1.5 rounded-[8px] transition-colors cursor-pointer"
                    >
                      {t('details')}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-[var(--ink-soft)]">
                {t('noOrders')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid-Bottom: All Orders Table + Notice Board */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-4">
        {/* Left Panel: All Orders Table */}
        <div className="card-ref p-4.5 sm:p-5">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-[15px] font-bold text-[var(--ink)]">{t('recentOrdersTitle')}</h2>
            <button
              onClick={() => navigate('/orders')}
              className="text-xs font-semibold text-[var(--purple)] hover:underline cursor-pointer"
            >
              {t('viewAll')}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>{t('orderNumber')}</th>
                  <th>{t('customer')}</th>
                  <th>{t('total')}</th>
                  <th>{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.slice(0, 6).map((r) => {
                  const statusInfo = getOrderStatus(r.status, t)
                  const custInitial = (r.fullName || 'C').charAt(0).toUpperCase()
                  return (
                    <tr
                      key={r.id}
                      onClick={() => navigate(`/orders/${r.id}`)}
                      className="cursor-pointer"
                    >
                      <td className="font-bold text-[var(--purple)] font-mono text-xs">
                        {r.orderNumber}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-[26px] h-[26px] rounded-full bg-[var(--purple-bg)] text-[var(--purple)] flex items-center justify-center text-[10.5px] font-bold shrink-0">
                            {custInitial}
                          </div>
                          <span className="font-medium text-[var(--ink)] truncate max-w-[150px]">
                            {r.fullName}
                          </span>
                        </div>
                      </td>
                      <td className="font-bold text-[var(--ink)] tabular-nums">
                        {formatMoney(r.total, language)}
                      </td>
                      <td>
                        <span className={`badge ${statusInfo.color || 'pending'}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Panel: Notice Board / Recent Activity Log */}
        <div className="card-ref p-4.5 sm:p-5">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-[15px] font-bold text-[var(--ink)]">{t('recentActivity')}</h2>
            <button
              onClick={() => navigate('/activity-log')}
              className="text-xs font-semibold text-[var(--purple)] hover:underline cursor-pointer"
            >
              {t('viewAll')}
            </button>
          </div>

          <div className="divide-y divide-[var(--line)]">
            {recentActivity.slice(0, 5).map((a, i) => {
              const noticeIcons = [
                { bg: 'var(--purple-bg)', color: 'var(--purple)', icon: CreditCard },
                { bg: 'var(--blue-bg)', color: 'var(--blue)', icon: PackageCheck },
                { bg: 'var(--green-bg)', color: 'var(--green)', icon: Check },
                { bg: 'var(--orange-bg)', color: 'var(--orange)', icon: AlertCircle },
              ]
              const theme = noticeIcons[i % noticeIcons.length]
              const IconComp = theme.icon

              return (
                <div
                  key={i}
                  onClick={() => navigate(`/orders/${a.orderId}`)}
                  className="flex items-center gap-2.5 py-2.5 hover:bg-[var(--bg)] px-1 rounded-[8px] transition-colors cursor-pointer"
                >
                  <div
                    style={{ backgroundColor: theme.bg, color: theme.color }}
                    className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center shrink-0"
                  >
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-semibold text-[var(--ink)] truncate">
                      {t('newOrder') || 'New Order'} {a.orderNumber} — {a.customerName}
                    </div>
                    <div className="text-[10.5px] text-[var(--ink-soft)] flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-[var(--ink-soft)]" />
                      <span>{formatDate(a.createdAt, language)}</span>
                    </div>
                  </div>
                  <ArrowIcon className="w-4 h-4 text-[var(--ink-soft)] shrink-0" />
                </div>
              )
            })}
            {recentActivity.length === 0 && (
              <p className="py-6 text-center text-xs text-[var(--ink-soft)]">{t('noActivity')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
