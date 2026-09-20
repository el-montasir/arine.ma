import { useState, useEffect } from 'react'
import {
  Shield,
  ShieldCheck,
  KeyRound,
  Laptop,
  LogOut,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { api } from '../lib/api.js'
import { formatDate } from '../lib/format.js'
import { PageHeader, Card } from '../components/ui/Card.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Modal from '../components/ui/Modal.jsx'
import Button from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Badge, StatusBadge } from '../components/ui/Badge.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function SecuritySettings() {
  const { t, language } = useLanguage()
  const { admin: currentUser, refreshUser } = useAuth()

  // Profile update form
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [profilePassword, setProfilePassword] = useState('')
  const [profileBusy, setProfileBusy] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')

  // Change password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [revokeOthers, setRevokeOthers] = useState(true)
  const [pwBusy, setPwBusy] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')

  // Initialize profile fields
  useEffect(() => {
    if (currentUser) {
      setUsername(currentUser.username || '')
      setEmail(currentUser.email || '')
    }
  }, [currentUser])

  // Sessions list
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sessionsError, setSessionsError] = useState('')
  const [revokeBusy, setRevokeBusy] = useState(false)
  const [revokeSuccess, setRevokeSuccess] = useState('')
  const [confirmRevokeModal, setConfirmRevokeModal] = useState(false)

  async function loadSessions() {
    setSessionsLoading(true)
    setSessionsError('')
    try {
      const res = await api.get('/auth/sessions')
      setSessions(res.sessions || [])
    } catch (err) {
      setSessionsError(err.message)
    } finally {
      setSessionsLoading(false)
    }
  }

  useEffect(() => {
    loadSessions()
  }, [])

  async function handleUpdateProfile(e) {
    e.preventDefault()
    setProfileError('')
    setProfileSuccess('')

    if (!profilePassword) {
      setProfileError(t('currentPasswordRequired'))
      return
    }

    if (!username.trim() && !email.trim()) {
      setProfileError(t('usernameOrEmailRequired'))
      return
    }

    setProfileBusy(true)
    try {
      const res = await api.put('/auth/profile', {
        username: username.trim(),
        email: email.trim(),
        currentPassword: profilePassword,
      })
      setProfileSuccess(t('profileUpdatedSuccess'))
      setProfilePassword('')
      refreshUser()
    } catch (err) {
      setProfileError(err.message)
    } finally {
      setProfileBusy(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPwError('')
    setPwSuccess('')

    if (!currentPassword) {
      setPwError(t('currentPasswordRequired'))
      return
    }
    if (!newPassword || newPassword.length < 8) {
      setPwError(t('passwordMinLength'))
      return
    }
    if (newPassword !== confirmPassword) {
      setPwError(t('passwordMismatchError'))
      return
    }

    setPwBusy(true)
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
        revokeOtherSessions: revokeOthers,
      })
      setPwSuccess(t('passwordChangedSuccess'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      loadSessions()
      refreshUser()
    } catch (err) {
      setPwError(err.message)
    } finally {
      setPwBusy(false)
    }
  }

  async function handleRevokeOtherSessions() {
    setRevokeBusy(true)
    setRevokeSuccess('')
    try {
      await api.post('/auth/revoke-other-sessions')
      setRevokeSuccess(t('revokeOtherSessionsSuccess'))
      setConfirmRevokeModal(false)
      loadSessions()
    } catch (err) {
      setSessionsError(err.message)
    } finally {
      setRevokeBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('securityTitle')}
        subtitle={t('securitySubtitle')}
      />

      {/* Account Security Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[var(--purple-bg)] text-[var(--purple)]">
            <User className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-[var(--ink)]">
              {currentUser?.name || currentUser?.username}
            </div>
            <div className="text-xs text-[var(--ink-soft)]">
              {currentUser?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
            </div>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[var(--green-bg)] text-[var(--green)]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-[var(--green)]">
              {t('statusActive')}
            </div>
            <div className="text-xs text-[var(--ink-soft)]">
              {t('activeStatusLabel')}
            </div>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[var(--bg)] text-[var(--ink-soft)] border border-[var(--line)]">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-[var(--ink)] tabular-nums font-mono">
              {formatDate(currentUser?.lastLoginAt, language)}
            </div>
            <div className="text-xs text-[var(--ink-soft)]">{t('lastLoginLabel')}</div>
          </div>
        </Card>
      </div>

      {/* Account Details Card - Full Width */}
      <Card className="space-y-4">
        <div className="flex items-center gap-3 border-b border-[var(--line)] pb-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--purple-bg)] text-[var(--purple)]">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--ink)]">{t('accountDetailsCardTitle')}</h3>
            <p className="text-xs text-[var(--ink-soft)]">{t('accountDetailsCardDesc')}</p>
          </div>
        </div>

        {profileSuccess && (
          <div className="flex items-center gap-2 rounded-[10px] border border-[var(--green)]/30 bg-[var(--green-bg)] p-3 text-xs font-semibold text-[var(--green)]">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{profileSuccess}</span>
          </div>
        )}

        {profileError ? <ErrorBanner message={profileError} onDismiss={() => setProfileError('')} /> : null}

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={`${t('usernameLabel')} *`}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              required
              dir="ltr"
            />

            <Input
              label={`${t('emailLabel')} *`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@arine.ma"
              required
              dir="ltr"
            />
          </div>

          <div className="max-w-md">
            <Input
              label={`${t('currentPasswordLabel')} *`}
              type="password"
              value={profilePassword}
              onChange={(e) => setProfilePassword(e.target.value)}
              placeholder="••••••••"
              required
              hint={t('currentPasswordHelpText')}
            />
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="primary" type="submit" disabled={profileBusy}>
              {profileBusy ? t('saving') : t('updateProfile')}
            </Button>
          </div>
        </form>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Card 1: Change Password Form */}
        <Card className="space-y-4">
          <div className="flex items-center gap-3 border-b border-[var(--line)] pb-3.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--purple-bg)] text-[var(--purple)]">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--ink)]">{t('changePasswordCardTitle')}</h3>
              <p className="text-xs text-[var(--ink-soft)]">{t('changePasswordCardDesc')}</p>
            </div>
          </div>

          {pwSuccess && (
            <div className="flex items-center gap-2 rounded-[10px] border border-[var(--green)]/30 bg-[var(--green-bg)] p-3 text-xs font-semibold text-[var(--green)]">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{pwSuccess}</span>
            </div>
          )}

          {pwError ? <ErrorBanner message={pwError} onDismiss={() => setPwError('')} /> : null}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              label={`${t('currentPasswordLabel')} *`}
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <Input
              label={`${t('newPasswordLabel')} *`}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 8 characters"
              required
            />

            <Input
              label={`${t('confirmNewPasswordLabel')} *`}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              required
            />

            <label className="flex items-center gap-2 text-xs font-semibold text-[var(--ink)] cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={revokeOthers}
                onChange={(e) => setRevokeOthers(e.target.checked)}
                className="h-4 w-4 rounded-[4px] border-[var(--line)] text-[var(--purple)] accent-[var(--purple)]"
              />
              <span>{t('revokeOtherSessionsCheckbox')}</span>
            </label>

            <div className="pt-2 flex justify-end">
              <Button variant="primary" type="submit" disabled={pwBusy}>
                {pwBusy ? t('saving') : t('save')}
              </Button>
            </div>
          </form>
        </Card>

        {/* Card 2: Active Sessions & Devices */}
        <Card className="flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-3 border-b border-[var(--line)] pb-3.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--purple-bg)] text-[var(--purple)]">
                <Laptop className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--ink)]">{t('sessionsCardTitle')}</h3>
                <p className="text-xs text-[var(--ink-soft)]">{t('sessionsCardDesc')}</p>
              </div>
            </div>

            {revokeSuccess && (
              <div className="my-3 flex items-center gap-2 rounded-[10px] border border-[var(--green)]/30 bg-[var(--green-bg)] p-3 text-xs font-semibold text-[var(--green)]">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{revokeSuccess}</span>
              </div>
            )}

            {sessionsError ? <ErrorBanner message={sessionsError} /> : null}

            <div className="space-y-3 pt-3">
              <div className="flex items-center justify-between text-xs font-bold text-[var(--ink-soft)] pb-2 border-b border-[var(--line)]">
                <span>{t('activeSessionsCount')}</span>
                <span className="text-[var(--ink)] tabular-nums">{sessions.length}</span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pe-1">
                {sessions.map((sess, idx) => (
                  <div
                    key={sess.sid || idx}
                    className="flex items-center justify-between rounded-[10px] border border-[var(--line)] bg-[var(--bg)] p-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--card)] text-[var(--purple)] border border-[var(--line)]">
                        <Laptop className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--ink)] flex items-center gap-2">
                          <span>{sess.browser || 'Web Browser'} ({sess.os || 'Desktop'})</span>
                          {sess.isCurrent && (
                            <span className="rounded-full bg-[var(--green-bg)] border border-[var(--green)]/30 px-2 py-0.5 text-[10px] font-bold text-[var(--green)]">
                              {t('currentSessionBadge')}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[var(--ink-soft)] flex items-center gap-2 mt-0.5 font-mono" dir="ltr">
                          <span>IP: {sess.ipAddress || '—'}</span>
                          <span>•</span>
                          <span>{formatDate(sess.lastActiveAt, language)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--line)] flex justify-end">
            <Button
              variant="secondary"
              onClick={() => setConfirmRevokeModal(true)}
              disabled={revokeBusy || sessions.length <= 1}
            >
              <LogOut className="h-4 w-4 text-[var(--orange)]" />
              <span>{t('revokeOtherSessionsBtn')}</span>
            </Button>
          </div>
        </Card>
      </div>

      {/* Revoke Other Sessions Confirmation Modal */}
      <Modal
        open={confirmRevokeModal}
        onClose={() => setConfirmRevokeModal(false)}
        title={t('revokeOtherSessionsBtn')}
      >
        <p className="text-xs text-[var(--ink-soft)]">
          {t('revokeOtherSessionsConfirmMsg')}
        </p>
        <div className="mt-5 flex justify-end gap-2 border-t border-[var(--line)] pt-3">
          <Button variant="secondary" onClick={() => setConfirmRevokeModal(false)}>
            {t('cancel')}
          </Button>
          <Button variant="danger" onClick={handleRevokeOtherSessions} disabled={revokeBusy}>
            {revokeBusy ? t('saving') : t('confirm')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
