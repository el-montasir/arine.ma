import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, BellOff, ShoppingBag, CheckCheck, ChevronRight, Clock } from 'lucide-react'
import { useAdminNotifications } from '../hooks/useAdminNotifications.js'
import { useLanguage } from '../context/LanguageContext.jsx'
import { formatMoney } from '../lib/format.js'

function formatRelativeTime(dateString, t) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now - date) / 1000)

  if (diffInSeconds < 60) {
    return t('justNow')
  }
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return (t('minutesAgo') || '{n}m ago').replace('{n}', diffInMinutes)
  }
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return (t('hoursAgo') || '{n}h ago').replace('{n}', diffInHours)
  }
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return (t('daysAgo') || '{n}d ago').replace('{n}', diffInDays)
  }
  return date.toLocaleDateString()
}

export default function NotificationDropdown() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useAdminNotifications()
  const { t, language } = useLanguage()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleNotificationClick = (item) => {
    if (!item.isRead) {
      markAsRead(item.id)
    }
    setOpen(false)
    if (item.orderId) {
      navigate(`/orders/${item.orderId}`)
    } else {
      navigate('/orders')
    }
  }

  const handleMarkAll = (e) => {
    e.stopPropagation()
    markAllAsRead()
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title={t('notifications') || 'Notifications'}
        aria-label={t('notifications') || 'Notifications'}
        className="w-9 h-9 rounded-[10px] border border-[var(--line)] bg-[var(--card)] flex items-center justify-center text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg)] transition-colors cursor-pointer relative shrink-0"
      >
        <Bell className={`h-4 w-4 ${unreadCount > 0 ? 'text-[var(--purple)]' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 bg-[var(--purple)] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[var(--card)] shadow-sm animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div
          className={`absolute end-0 top-full z-50 mt-2 w-80 sm:w-96 origin-top-right rounded-[16px] border border-[var(--line)] bg-[var(--card)] shadow-2xl backdrop-blur-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)] bg-[var(--bg)]/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">
                {t('notifications')}
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[var(--purple-bg)] text-[var(--purple)] text-[10px] font-bold">
                  {unreadCount} {t('unreadNotifications')}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="flex items-center gap-1 text-[11px] font-medium text-[var(--purple)] hover:text-[var(--purple-hover)] transition-colors cursor-pointer"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>{t('markAllAsRead')}</span>
              </button>
            )}
          </div>

          {/* Body / List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-[var(--line)]">
            {notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center text-[var(--ink-soft)]">
                <div className="w-12 h-12 rounded-full bg-[var(--bg)] flex items-center justify-center mb-2.5">
                  <BellOff className="h-5 w-5 opacity-40" />
                </div>
                <p className="text-xs font-medium text-[var(--ink)]">
                  {t('noNotifications')}
                </p>
                <p className="text-[11px] text-[var(--ink-soft)] mt-1">
                  {t('recentOrdersSubtitle')}
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const order = item.order
                const isUnread = !item.isRead
                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                      isUnread
                        ? 'bg-[var(--purple-bg)]/40 hover:bg-[var(--purple-bg)]/70'
                        : 'hover:bg-[var(--bg)]'
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 mt-0.5 ${
                        isUnread
                          ? 'bg-[var(--purple)] text-white shadow-sm'
                          : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--ink-soft)]'
                      }`}
                    >
                      <ShoppingBag className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-semibold text-[var(--ink)] truncate">
                          {t('newOrderNotification')}{' '}
                          {order?.orderNumber ? `#${order.orderNumber}` : ''}
                        </span>
                        <span className="text-[10px] text-[var(--ink-soft)] shrink-0 flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {formatRelativeTime(item.createdAt, t)}
                        </span>
                      </div>

                      {order ? (
                        <div className="text-[11px] text-[var(--ink-soft)] space-y-0.5">
                          <p className="truncate font-medium text-[var(--ink)]">
                            {order.fullName}
                            {order.city ? ` • ${order.city}` : ''}
                          </p>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-semibold text-[var(--purple)]">
                              {formatMoney(order.total, language)}
                            </span>
                            <span className="text-[var(--ink-soft)]">
                              {order.phone || ''}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-[var(--ink-soft)]">
                          {item.type}
                        </p>
                      )}
                    </div>

                    {/* Dot */}
                    {isUnread && (
                      <div className="w-2 h-2 rounded-full bg-[var(--purple)] shrink-0 self-center" />
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-[var(--line)] bg-[var(--bg)]/50 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                navigate('/orders')
              }}
              className="px-3 py-1.5 rounded-[8px] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--card)] transition-colors text-[11px] font-medium"
            >
              {t('viewAllOrders')}
            </button>

            <button
              type="button"
              onClick={() => {
                setOpen(false)
                navigate('/activity-log')
              }}
              className="px-3 py-1.5 rounded-[8px] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--card)] transition-colors text-[11px] font-medium"
            >
              {t('navActivityLog')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
