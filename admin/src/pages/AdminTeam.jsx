import { useState, useMemo } from 'react'
import {
  Users,
  UserPlus,
  Pencil,
  KeyRound,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  LogOut,
  Power,
  Search,
  Check,
  Lock,
  Clock,
  Mail,
  Phone,
  AlertTriangle,
} from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { api } from '../lib/api.js'
import { formatDate } from '../lib/format.js'
import { PageHeader, Card } from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Modal from '../components/ui/Modal.jsx'
import Button from '../components/ui/Button.jsx'
import { Input, Select, Textarea } from '../components/ui/Input.jsx'
import { Badge, StatusBadge } from '../components/ui/Badge.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const PERMISSION_GROUPS = [
  {
    key: 'dashboard',
    labelKey: 'navDashboard',
    permissions: ['DASHBOARD_VIEW'],
  },
  {
    key: 'products',
    labelKey: 'navProducts',
    permissions: [
      'PRODUCTS_VIEW',
      'PRODUCTS_CREATE',
      'PRODUCTS_UPDATE',
      'PRODUCTS_DELETE',
    ],
  },
  {
    key: 'categories',
    labelKey: 'navCategories',
    permissions: [
      'CATEGORIES_VIEW',
      'CATEGORIES_CREATE',
      'CATEGORIES_UPDATE',
      'CATEGORIES_DELETE',
    ],
  },
  {
    key: 'packages',
    labelKey: 'navPackages',
    permissions: [
      'PACKAGES_VIEW',
      'PACKAGES_CREATE',
      'PACKAGES_UPDATE',
      'PACKAGES_DELETE',
    ],
  },
  {
    key: 'orders',
    labelKey: 'navOrders',
    permissions: [
      'ORDERS_VIEW',
      'ORDERS_STATUS_UPDATE',
      'ORDERS_CREATE',
      'ORDERS_UPDATE',
      'ORDERS_DELETE',
    ],
  },
  {
    key: 'customers',
    labelKey: 'navCustomers',
    permissions: ['CUSTOMERS_VIEW'],
  },
  {
    key: 'finance',
    labelKey: 'navFinance',
    permissions: ['FINANCE_VIEW', 'FINANCE_EXPORT'],
  },
  {
    key: 'banners',
    labelKey: 'navBanners',
    permissions: [
      'BANNERS_VIEW',
      'BANNERS_CREATE',
      'BANNERS_UPDATE',
      'BANNERS_DELETE',
    ],
  },
  {
    key: 'shipping',
    labelKey: 'navShippingSettings',
    permissions: ['SHIPPING_VIEW', 'SHIPPING_UPDATE'],
  },
  {
    key: 'store_settings',
    labelKey: 'navStoreSettings',
    permissions: ['STORE_SETTINGS_VIEW', 'STORE_SETTINGS_UPDATE'],
  },
  {
    key: 'admin_users',
    labelKey: 'navAdminTeam',
    permissions: [
      'ADMIN_USERS_VIEW',
      'ADMIN_USERS_CREATE',
      'ADMIN_USERS_UPDATE',
      'ADMIN_USERS_DISABLE',
      'ADMIN_USERS_DELETE',
    ],
  },
  {
    key: 'security',
    labelKey: 'navSecurity',
    permissions: ['SECURITY_VIEW', 'SECURITY_UPDATE'],
  },
  {
    key: 'activity_log',
    labelKey: 'navActivityLog',
    permissions: ['ACTIVITY_LOG_VIEW'],
  },
]

const ROLE_PRESETS = {
  ORDER_MANAGER: [
    'DASHBOARD_VIEW',
    'ORDERS_VIEW',
    'ORDERS_STATUS_UPDATE',
    'CUSTOMERS_VIEW',
    'PRODUCTS_VIEW',
    'PACKAGES_VIEW',
  ],
  CATALOG_MANAGER: [
    'DASHBOARD_VIEW',
    'PRODUCTS_VIEW',
    'PRODUCTS_CREATE',
    'PRODUCTS_UPDATE',
    'CATEGORIES_VIEW',
    'CATEGORIES_CREATE',
    'CATEGORIES_UPDATE',
    'PACKAGES_VIEW',
    'PACKAGES_CREATE',
    'PACKAGES_UPDATE',
    'BANNERS_VIEW',
    'BANNERS_CREATE',
    'BANNERS_UPDATE',
  ],
  SUPPORT_STAFF: [
    'DASHBOARD_VIEW',
    'ORDERS_VIEW',
    'CUSTOMERS_VIEW',
    'PRODUCTS_VIEW',
    'PACKAGES_VIEW',
  ],
}

const emptyForm = {
  name: '',
  username: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  role: 'ADMIN',
  status: 'ACTIVE',
  permissions: [],
  notes: '',
}

export default function AdminTeam() {
  const { t, language } = useLanguage()
  const { admin: currentUser, can, isOwner } = useAuth()
  const { data: staffList, loading, error, reload } = useFetch('/admin-users')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [modal, setModal] = useState(null) // { mode: 'create' } | { mode: 'edit', user }
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionSuccess, setActionSuccess] = useState('')
  const [actionError, setActionError] = useState('')

  // Password reset modal
  const [resetModal, setResetModal] = useState(null) // user
  const [resetPassword, setResetPassword] = useState('')
  const [resetConfirmPassword, setResetConfirmPassword] = useState('')
  const [resetRevokeSessions, setResetRevokeSessions] = useState(true)

  // Status / Action confirmation modals
  const [statusAction, setStatusAction] = useState(null) // { user, nextStatus }
  const [revokeAction, setRevokeAction] = useState(null) // user
  const [deleteAction, setDeleteAction] = useState(null) // user

  const filteredStaff = useMemo(() => {
    if (!staffList || !Array.isArray(staffList)) return []
    return staffList.filter((u) => {
      const q = search.toLowerCase().trim()
      const matchesSearch =
        !q ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phone && u.phone.includes(q))

      const matchesStatus =
        statusFilter === 'ALL' || u.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [staffList, search, statusFilter])

  const stats = useMemo(() => {
    if (!staffList || !Array.isArray(staffList)) {
      return { total: 0, active: 0, inactive: 0 }
    }
    const total = staffList.length
    const active = staffList.filter((s) => s.status === 'ACTIVE').length
    const inactive = staffList.filter((s) => s.status !== 'ACTIVE').length
    return { total, active, inactive }
  }, [staffList])

  function openCreate() {
    setForm(emptyForm)
    setFormError('')
    setModal({ mode: 'create' })
  }

  function openEdit(user) {
    setForm({
      name: user.name || '',
      username: user.username || '',
      email: user.email || '',
      phone: user.phone || '',
      password: '',
      confirmPassword: '',
      role: user.role || 'ADMIN',
      status: user.status || 'ACTIVE',
      permissions: Array.isArray(user.permissions) ? [...user.permissions] : [],
      notes: user.notes || '',
    })
    setFormError('')
    setModal({ mode: 'edit', user })
  }

  function applyPreset(presetKey) {
    if (presetKey === 'CUSTOM') return
    const perms = ROLE_PRESETS[presetKey] || []
    setForm((prev) => ({ ...prev, permissions: perms }))
  }

  function togglePermission(perm) {
    setForm((prev) => {
      const perms = prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm]
      return { ...prev, permissions: perms }
    })
  }

  function toggleGroup(groupPerms, selectAll) {
    setForm((prev) => {
      let perms = [...prev.permissions]
      if (selectAll) {
        groupPerms.forEach((p) => {
          if (!perms.includes(p)) perms.push(p)
        })
      } else {
        perms = perms.filter((p) => !groupPerms.includes(p))
      }
      return { ...prev, permissions: perms }
    })
  }

  async function handleSaveStaff() {
    setBusy(true)
    setFormError('')
    try {
      if (modal.mode === 'create') {
        if (!form.name.trim()) {
          throw new Error(t('nameRequired'))
        }
        if (!form.username.trim()) {
          throw new Error(t('usernameRequired'))
        }
        if (!form.email.trim()) {
          throw new Error(t('emailRequired'))
        }
        if (!form.password || form.password.length < 8) {
          throw new Error(t('passwordMinLength'))
        }
        if (form.password !== form.confirmPassword) {
          throw new Error(t('passwordMismatchError'))
        }

        await api.post('/admin-users', {
          name: form.name.trim(),
          username: form.username.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || undefined,
          password: form.password,
          confirmPassword: form.confirmPassword,
          role: form.role,
          status: form.status,
          permissions: form.role === 'SUPER_ADMIN' ? [] : form.permissions,
          notes: form.notes.trim() || undefined,
        })
        setActionSuccess(t('staffCreatedSuccess'))
      } else {
        if (!form.name.trim()) {
          throw new Error(t('nameRequired'))
        }
        if (!form.email.trim()) {
          throw new Error(t('emailRequired'))
        }

        await api.put(`/admin-users/${modal.user.id}`, {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || undefined,
          role: form.role,
          status: form.status,
          permissions: form.role === 'SUPER_ADMIN' ? [] : form.permissions,
          notes: form.notes.trim() || undefined,
        })
        setActionSuccess(t('staffUpdatedSuccess'))
      }
      setModal(null)
      reload()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleResetPassword() {
    if (!resetPassword || resetPassword.length < 8) {
      setActionError(t('passwordMinLength'))
      return
    }
    if (resetPassword !== resetConfirmPassword) {
      setActionError(t('passwordMismatchError'))
      return
    }

    setBusy(true)
    setActionError('')
    try {
      await api.post(`/admin-users/${resetModal.id}/reset-password`, {
        newPassword: resetPassword,
        revokeSessions: resetRevokeSessions,
      })
      setResetModal(null)
      setResetPassword('')
      setResetConfirmPassword('')
      setActionSuccess(t('resetPasswordSuccess'))
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleStatusChange() {
    setBusy(true)
    setActionError('')
    try {
      await api.patch(`/admin-users/${statusAction.user.id}/status`, {
        status: statusAction.nextStatus,
      })
      setStatusAction(null)
      setActionSuccess(t('staffUpdatedSuccess'))
      reload()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleRevokeSessions() {
    setBusy(true)
    setActionError('')
    try {
      await api.post(`/admin-users/${revokeAction.id}/revoke-sessions`)
      setRevokeAction(null)
      setActionSuccess(t('revokeSessionsSuccess'))
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteStaff() {
    setBusy(true)
    setActionError('')
    try {
      await api.del(`/admin-users/${deleteAction.id}`)
      setDeleteAction(null)
      setActionSuccess(t('deleteStaffSuccess'))
      reload()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const columns = [
    {
      key: 'name',
      label: t('colStaffName'),
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#7c3aed] to-[#5b21b6] text-white font-bold text-sm shadow-sm">
            {(r.name || r.username || 'A').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-xs text-[var(--ink)] flex items-center gap-2">
              <span>{r.name || r.username}</span>
              {currentUser?.id === r.id && (
                <span className="text-[10px] font-bold bg-[var(--purple-bg)] text-[var(--purple)] border border-[var(--purple)]/30 px-2 py-0.5 rounded-full">
                  {t('currentSessionBadge')}
                </span>
              )}
            </div>
            <div className="text-[11px] text-[var(--ink-soft)] flex items-center gap-2 mt-0.5 font-mono" dir="ltr">
              <span>@{r.username}</span>
              {r.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {r.email}
                </span>
              )}
              {r.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {r.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: t('colStaffRole'),
      render: (r) => {
        const isSuper = r.role === 'SUPER_ADMIN'
        return (
          <div className="flex flex-col gap-1">
            <span
              className={`inline-flex items-center gap-1.5 w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isSuper
                  ? 'bg-[var(--orange-bg)] text-[var(--orange)] border border-[var(--orange)]/30'
                  : 'bg-[var(--purple-bg)] text-[var(--purple)] border border-[var(--purple)]/30'
              }`}
            >
              {isSuper ? <ShieldAlert className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
              {isSuper ? 'Super Admin' : 'Admin'}
            </span>
            <span className="text-[11px] text-[var(--ink-soft)]">
              {isSuper
                ? t('fullAccessBadge')
                : `${(r.permissions || []).length} ${t('allPermsCount')}`}
            </span>
          </div>
        )
      },
    },
    {
      key: 'status',
      label: t('colStaffStatus'),
      render: (r) => {
        const statusKind = r.status === 'ACTIVE' ? 'ok' : r.status === 'SUSPENDED' ? 'danger' : 'neutral'
        const label = r.status === 'ACTIVE' ? t('statusActive') : r.status === 'SUSPENDED' ? t('statusSuspended') : t('statusInactive')
        return <StatusBadge kind={statusKind} label={label} />
      },
    },
    {
      key: 'lastLogin',
      label: t('colStaffLastLogin'),
      render: (r) => (
        <span className="text-xs text-[var(--ink-soft)] flex items-center gap-1.5 tabular-nums font-mono">
          <Clock className="h-3.5 w-3.5 text-[var(--ink-soft)]" />
          {formatDate(r.lastLoginAt, language)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (r) => {
        const canUpdate = can('ADMIN_USERS_UPDATE') || isOwner
        const canDisable = can('ADMIN_USERS_DISABLE') || isOwner
        const canDelete = can('ADMIN_USERS_DELETE') || isOwner
        const isSelf = currentUser?.id === r.id

        return (
          <div className="flex items-center justify-end gap-1">
            {canUpdate && (
              <button
                type="button"
                onClick={() => openEdit(r)}
                title={t('editStaffBtn')}
                className="rounded-[8px] p-1.5 text-[var(--ink-soft)] hover:bg-[var(--bg)] hover:text-[var(--ink)] transition-colors cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}

            {canUpdate && (
              <button
                type="button"
                onClick={() => {
                  setResetModal(r)
                  setResetPassword('')
                  setResetConfirmPassword('')
                }}
                title={t('resetPasswordTitle')}
                className="rounded-[8px] p-1.5 text-[var(--ink-soft)] hover:bg-[var(--purple-bg)] hover:text-[var(--purple)] transition-colors cursor-pointer"
              >
                <KeyRound className="h-3.5 w-3.5" />
              </button>
            )}

            {canDisable && !isSelf && (
              <button
                type="button"
                onClick={() =>
                  setStatusAction({
                    user: r,
                    nextStatus: r.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                  })
                }
                title={r.status === 'ACTIVE' ? t('confirmDisableStaffTitle') : t('confirmEnableStaffTitle')}
                className={`rounded-[8px] p-1.5 transition-colors cursor-pointer ${
                  r.status === 'ACTIVE'
                    ? 'text-[var(--ink-soft)] hover:bg-[var(--orange-bg)] hover:text-[var(--orange)]'
                    : 'text-[var(--green)] hover:bg-[var(--green-bg)]'
                }`}
              >
                <Power className="h-3.5 w-3.5" />
              </button>
            )}

            {canUpdate && (
              <button
                type="button"
                onClick={() => setRevokeAction(r)}
                title={t('revokeSessionsTitle')}
                className="rounded-[8px] p-1.5 text-[var(--ink-soft)] hover:bg-[var(--orange-bg)] hover:text-[var(--orange)] transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}

            {canDelete && !isSelf && (
              <button
                type="button"
                onClick={() => setDeleteAction(r)}
                title={t('deleteStaffTitle')}
                className="rounded-[8px] p-1.5 text-[var(--ink-soft)] hover:bg-[var(--red-bg)] hover:text-[var(--red)] transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('teamTitle')}
        subtitle={t('teamSubtitle')}
        actions={
          (can('ADMIN_USERS_CREATE') || isOwner) && (
            <Button variant="primary" onClick={openCreate}>
              <UserPlus className="h-4 w-4" />
              <span>{t('addStaffBtn')}</span>
            </Button>
          )
        }
      />

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[var(--purple-bg)] text-[var(--purple)]">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[var(--ink)] tabular-nums">{stats.total}</div>
            <div className="text-xs text-[var(--ink-soft)]">{t('totalStaffLabel')}</div>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[var(--green-bg)] text-[var(--green)]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[var(--green)] tabular-nums">{stats.active}</div>
            <div className="text-xs text-[var(--ink-soft)]">{t('activeStaffLabel')}</div>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[var(--bg)] text-[var(--ink-soft)] border border-[var(--line)]">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[var(--ink-soft)] tabular-nums">{stats.inactive}</div>
            <div className="text-xs text-[var(--ink-soft)]">{t('inactiveStaffLabel')}</div>
          </div>
        </Card>
      </div>

      {actionSuccess && (
        <div className="flex items-center justify-between rounded-[10px] border border-[var(--green)]/30 bg-[var(--green-bg)] p-3 text-xs font-semibold text-[var(--green)]">
          <span>✓ {actionSuccess}</span>
          <button type="button" onClick={() => setActionSuccess('')} className="text-[var(--green)] hover:underline cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {error ? <ErrorBanner message={error} /> : null}
      {actionError ? <ErrorBanner message={actionError} onDismiss={() => setActionError('')} /> : null}

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-soft)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchStaffPlaceholder')}
              className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg)] py-2 ps-10 pe-4 text-xs text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:border-[var(--purple)] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-[10px] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--ink)] focus:border-[var(--purple)] focus:outline-none"
            >
              <option value="ALL">{t('filterAllStatus')}</option>
              <option value="ACTIVE">{t('statusActive')}</option>
              <option value="INACTIVE">{t('statusInactive')}</option>
              <option value="SUSPENDED">{t('statusSuspended')}</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Staff Table */}
      <Card padded={false}>
        <Table
          columns={columns}
          rows={filteredStaff}
          rowKey={(r) => r.id}
          loading={loading}
          empty={t('noStaffFound')}
        />
      </Card>

      {/* Create / Edit Staff Modal */}
      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        title={modal?.mode === 'edit' ? t('editStaffBtn') : t('addStaffBtn')}
        width="max-w-3xl"
      >
        <div className="space-y-5">
          {formError ? <ErrorBanner message={formError} /> : null}

          {/* Section 1: Basic Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--purple)]">
              {t('staffSectionAccount')}
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label={`${t('staffNameLabel')} *`}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t('staffNamePlaceholder')}
                required
              />
              <Input
                label={`${t('staffUsernameLabel')} *`}
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                placeholder={t('staffUsernamePlaceholder')}
                disabled={modal?.mode === 'edit'}
                required
                dir="ltr"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label={`${t('staffEmailLabel')} *`}
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder={t('staffEmailPlaceholder')}
                required
                dir="ltr"
              />
              <Input
                label={t('staffPhoneLabel')}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder={t('staffPhonePlaceholder')}
                dir="ltr"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select
                label={t('staffStatusLabel')}
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="ACTIVE">{t('statusActive')}</option>
                <option value="INACTIVE">{t('statusInactive')}</option>
                <option value="SUSPENDED">{t('statusSuspended')}</option>
              </Select>
            </div>
          </div>

          {/* Section 2: Password (Create Mode Only) */}
          {modal?.mode === 'create' && (
            <div className="space-y-3 rounded-[12px] border border-[var(--line)] bg-[var(--bg)] p-3.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--purple)]">
                {t('staffSectionSecurity')}
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label={`${t('passwordField')} *`}
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  required
                />
                <Input
                  label={`${t('confirmPasswordLabel')} *`}
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
          )}

          {/* Section 3: Role & Granular Permissions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--purple)]">
              {t('staffSectionRole')}
            </h4>

            <div>
              <Select
                label={t('staffRoleLabel')}
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              >
                <option value="ADMIN">Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </Select>
            </div>

            {form.role === 'SUPER_ADMIN' ? (
              <div className="rounded-[10px] border border-[var(--orange)]/30 bg-[var(--orange-bg)] p-3.5 text-xs text-[var(--orange)] flex items-center gap-2.5 font-medium">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <span>
                  Super Admin has unrestricted full access to all store modules, settings, finance, and staff management without limitation.
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Presets */}
                <div>
                  <div className="mb-2 text-xs font-bold text-[var(--ink-soft)]">
                    {t('rolePresetLabel')}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => applyPreset('ORDER_MANAGER')}
                      className="rounded-[8px] border border-[var(--line)] bg-[var(--card)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] hover:border-[var(--purple)] hover:bg-[var(--purple-bg)] transition-colors cursor-pointer"
                    >
                      📦 Order Manager
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('CATALOG_MANAGER')}
                      className="rounded-[8px] border border-[var(--line)] bg-[var(--card)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] hover:border-[var(--purple)] hover:bg-[var(--purple-bg)] transition-colors cursor-pointer"
                    >
                      📚 Catalog Manager
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('SUPPORT_STAFF')}
                      className="rounded-[8px] border border-[var(--line)] bg-[var(--card)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] hover:border-[var(--purple)] hover:bg-[var(--purple-bg)] transition-colors cursor-pointer"
                    >
                      💬 Support Staff
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, permissions: [] }))}
                      className="rounded-[8px] border border-[var(--line)] bg-[var(--bg)] px-3 py-1.5 text-xs text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors cursor-pointer"
                    >
                      ✕ {t('deselectAllGroup')}
                    </button>
                  </div>
                </div>

                {/* Granular Matrix */}
                <div className="space-y-2.5 max-h-80 overflow-y-auto pe-1">
                  {PERMISSION_GROUPS.map((grp) => {
                    const allSelected = grp.permissions.every((p) =>
                      form.permissions.includes(p)
                    )

                    return (
                      <div
                        key={grp.key}
                        className="rounded-[10px] border border-[var(--line)] bg-[var(--bg)] p-3 transition-colors"
                      >
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--line)]">
                          <span className="text-xs font-bold text-[var(--ink)]">
                            {t(grp.labelKey)}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleGroup(grp.permissions, !allSelected)}
                            className="text-[11px] text-[var(--purple)] hover:underline font-semibold cursor-pointer"
                          >
                            {allSelected ? t('deselectAllGroup') : t('selectAllGroup')}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {grp.permissions.map((perm) => {
                            const checked = form.permissions.includes(perm)
                            const permKey = `perm_${perm}`
                            return (
                              <label
                                key={perm}
                                className={`flex items-center gap-2 rounded-[8px] p-2 text-xs font-medium cursor-pointer transition-colors ${
                                  checked
                                    ? 'bg-[var(--purple-bg)] text-[var(--purple)] border border-[var(--purple)]/20'
                                    : 'text-[var(--ink-soft)] hover:bg-[var(--card)] hover:text-[var(--ink)] border border-transparent'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => togglePermission(perm)}
                                  className="h-4 w-4 rounded-[4px] border-[var(--line)] text-[var(--purple)] accent-[var(--purple)]"
                                />
                                <span className="select-none">{t(permKey) || perm}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Internal Notes */}
          <div>
            <Textarea
              label={t('staffNotesLabel')}
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder={t('staffNotesPlaceholder')}
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-[var(--line)] pt-4">
          <Button variant="secondary" onClick={() => setModal(null)}>
            {t('cancel')}
          </Button>
          <Button variant="primary" onClick={handleSaveStaff} disabled={busy}>
            {busy ? t('saving') : t('save')}
          </Button>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        open={Boolean(resetModal)}
        onClose={() => setResetModal(null)}
        title={t('resetPasswordTitle')}
        width="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-[var(--ink-soft)]">
            {t('resetPasswordDesc')} (<strong>{resetModal?.name || resetModal?.username}</strong>)
          </p>

          <Input
            label={`${t('newPasswordLabel')} *`}
            type="password"
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
            placeholder="Min. 8 characters"
            required
          />

          <Input
            label={`${t('confirmNewPasswordLabel')} *`}
            type="password"
            value={resetConfirmPassword}
            onChange={(e) => setResetConfirmPassword(e.target.value)}
            placeholder="Repeat password"
            required
          />

          <label className="flex items-center gap-2 text-xs font-semibold text-[var(--ink)] cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={resetRevokeSessions}
              onChange={(e) => setResetRevokeSessions(e.target.checked)}
              className="h-4 w-4 rounded-[4px] border-[var(--line)] text-[var(--purple)] accent-[var(--purple)]"
            />
            <span>{t('revokeSessionsCheckbox')}</span>
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-[var(--line)] pt-3">
          <Button variant="secondary" onClick={() => setResetModal(null)}>
            {t('cancel')}
          </Button>
          <Button variant="primary" onClick={handleResetPassword} disabled={busy || !resetPassword}>
            {busy ? t('saving') : t('resetPasswordBtn')}
          </Button>
        </div>
      </Modal>

      {/* Status Change Confirmation Modal */}
      <Modal
        open={Boolean(statusAction)}
        onClose={() => setStatusAction(null)}
        title={statusAction?.nextStatus === 'ACTIVE' ? t('confirmEnableStaffTitle') : t('confirmDisableStaffTitle')}
      >
        <p className="text-xs text-[var(--ink-soft)]">
          {statusAction?.nextStatus === 'ACTIVE'
            ? t('confirmEnableStaffMsg')
            : t('confirmDisableStaffMsg')}
        </p>
        <div className="mt-5 flex justify-end gap-2 border-t border-[var(--line)] pt-3">
          <Button variant="secondary" onClick={() => setStatusAction(null)}>
            {t('cancel')}
          </Button>
          <Button
            variant={statusAction?.nextStatus === 'ACTIVE' ? 'primary' : 'danger'}
            onClick={handleStatusChange}
            disabled={busy}
          >
            {busy ? t('saving') : t('confirm')}
          </Button>
        </div>
      </Modal>

      {/* Revoke Sessions Confirmation Modal */}
      <Modal
        open={Boolean(revokeAction)}
        onClose={() => setRevokeAction(null)}
        title={t('revokeSessionsTitle')}
      >
        <p className="text-xs text-[var(--ink-soft)]">
          {t('revokeSessionsConfirmMsg')}
        </p>
        <div className="mt-5 flex justify-end gap-2 border-t border-[var(--line)] pt-3">
          <Button variant="secondary" onClick={() => setRevokeAction(null)}>
            {t('cancel')}
          </Button>
          <Button variant="danger" onClick={handleRevokeSessions} disabled={busy}>
            {busy ? t('saving') : t('confirm')}
          </Button>
        </div>
      </Modal>

      {/* Delete Staff Confirmation Modal */}
      <Modal
        open={Boolean(deleteAction)}
        onClose={() => setDeleteAction(null)}
        title={t('deleteStaffTitle')}
      >
        <p className="text-xs text-[var(--ink-soft)]">
          {t('deleteStaffConfirmMsg')} (<strong>{deleteAction?.name || deleteAction?.username}</strong>)
        </p>
        <div className="mt-5 flex justify-end gap-2 border-t border-[var(--line)] pt-3">
          <Button variant="secondary" onClick={() => setDeleteAction(null)}>
            {t('cancel')}
          </Button>
          <Button variant="danger" onClick={handleDeleteStaff} disabled={busy}>
            {busy ? t('saving') : t('delete')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
