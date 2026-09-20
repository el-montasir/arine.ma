import { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck,
  Megaphone,
  Activity,
  Database,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  Lock,
  ExternalLink,
} from 'lucide-react'
import { api } from '../lib/api.js'
import { PageHeader, Card } from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Badge, StatusBadge } from '../components/ui/Badge.jsx'
import Modal from '../components/ui/Modal.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function MarketingSettings() {
  const { t, language } = useLanguage()
  const { can, isOwner } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [showDisconnectModal, setShowDisconnectModal] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [testResult, setTestResult] = useState(null)

  // Form State
  const [form, setForm] = useState({
    appId: '',
    appSecret: '',
    accessToken: '',
    adAccountId: '',
    pixelId: '',
    capiToken: '',
    testEventCode: '',
    pixelEnabled: true,
    capiEnabled: true,
    catalogId: '',
    autoCatalogSync: true,
  })

  // Connection metadata from backend
  const [metaInfo, setMetaInfo] = useState({
    connectionStatus: 'NOT_CONFIGURED',
    accountName: null,
    accountCurrency: 'MAD',
    hasAppSecret: false,
    hasAccessToken: false,
    hasCapiToken: false,
  })

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/marketing/settings')
      const data = res.data || {}
      setForm({
        appId: data.appId || '',
        appSecret: '', // never populated with raw secret for security
        accessToken: '', // never populated with raw token for security
        adAccountId: data.adAccountId || '',
        pixelId: data.pixelId || '',
        capiToken: '',
        testEventCode: data.testEventCode || '',
        pixelEnabled: data.pixelEnabled ?? true,
        capiEnabled: data.capiEnabled ?? true,
        catalogId: data.catalogId || '',
        autoCatalogSync: data.autoCatalogSync ?? true,
      })
      setMetaInfo({
        connectionStatus: data.connectionStatus || 'NOT_CONFIGURED',
        accountName: data.accountName,
        accountCurrency: data.accountCurrency || 'MAD',
        hasAppSecret: data.hasAppSecret || false,
        hasAccessToken: data.hasAccessToken || false,
        hasCapiToken: data.hasCapiToken || false,
      })
    } catch (err) {
      setError(err.message || t('failedToLoadData') || 'Failed to load marketing settings')
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccessMsg('')
    setTestResult(null)
    try {
      const payload = {
        appId: form.appId.trim(),
        adAccountId: form.adAccountId.trim(),
        pixelId: form.pixelId.trim(),
        testEventCode: form.testEventCode.trim() || undefined,
        pixelEnabled: form.pixelEnabled,
        capiEnabled: form.capiEnabled,
        catalogId: form.catalogId.trim() || undefined,
        autoCatalogSync: form.autoCatalogSync,
      }

      // Only send secret & tokens if the user typed a new value
      if (form.appSecret.trim()) payload.appSecret = form.appSecret.trim()
      if (form.accessToken.trim()) payload.accessToken = form.accessToken.trim()
      if (form.capiToken.trim()) payload.capiToken = form.capiToken.trim()

      const res = await api.put('/marketing/settings', payload)
      setSuccessMsg(res.message || t('settingsSaved') || 'Marketing and Meta Ads settings updated successfully')
      fetchSettings()
    } catch (err) {
      setError(err.message || t('saveFailed') || 'Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setError('')
    setTestResult(null)
    try {
      const res = await api.post('/marketing/meta/test', {})
      setTestResult(res.data)
      if (res.data.success) {
        setSuccessMsg(t('testConnectionSuccess') || 'Meta API connection verified successfully!')
      } else {
        setError(res.data.error || t('connectionError') || 'Connection verification failed')
      }
      fetchSettings()
    } catch (err) {
      setError(err.message || t('connectionError') || 'Failed to test Meta connection')
    } finally {
      setTesting(false)
    }
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    setError('')
    try {
      const res = await api.post('/marketing/meta/disconnect', {})
      setShowDisconnectModal(false)
      setSuccessMsg(res.message || t('disconnectedSuccess') || 'Meta account disconnected')
      fetchSettings()
    } catch (err) {
      setError(err.message || t('disconnectFailed') || 'Failed to disconnect Meta')
    } finally {
      setDisconnecting(false)
    }
  }

  const canEdit = isOwner || can('MARKETING_SETTINGS_UPDATE') || can('MARKETING_MANAGE')

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('marketingSettingsTitle') || 'Meta Ads & Pixel Settings'}
        subtitle={t('marketingSettingsSubtitle') || 'Configure Meta Graph API credentials, enable Pixel, Conversions API (CAPI), and Commerce Catalog'}
        actions={
          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={testing || saving || loading}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${testing ? 'animate-spin' : ''}`} />
                  <span>{testing ? (t('testingConnection') || 'Testing…') : (t('testConnectionBtn') || 'Test Connection')}</span>
                </Button>

                {metaInfo.connectionStatus !== 'NOT_CONFIGURED' && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setShowDisconnectModal(true)}
                    disabled={disconnecting}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{t('disconnectMetaBtn') || 'Disconnect'}</span>
                  </Button>
                )}
              </>
            )}
          </div>
        }
      />

      {error && <ErrorBanner message={error} />}
      {successMsg && (
        <div className="p-3 rounded-[10px] border border-[var(--green)]/30 bg-[var(--green)]/10 text-[var(--green)] text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg('')}
            className="text-[var(--green)] hover:opacity-75 cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Connection Status Card */}
      <Card padded>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-[12px] bg-[var(--purple-subtle)] text-[var(--purple)]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[var(--ink)]">Meta Marketing API Status</h3>
                <StatusBadge
                  kind={metaInfo.connectionStatus === 'CONNECTED' ? 'ok' : metaInfo.connectionStatus === 'NOT_CONFIGURED' ? 'neutral' : 'danger'}
                  label={
                    metaInfo.connectionStatus === 'CONNECTED'
                      ? (t('connectionStatusConnected') || 'Connected')
                      : metaInfo.connectionStatus === 'NOT_CONFIGURED'
                      ? (t('connectionStatusNotConfigured') || 'Not Configured')
                      : (t('connectionStatusInvalid') || 'Attention Required')
                  }
                />
              </div>
              <p className="text-xs text-[var(--ink-soft)] mt-0.5">
                {metaInfo.accountName ? `Account: ${metaInfo.accountName} (${metaInfo.accountCurrency})` : 'Graph API v21.0 & Dual CAPI Pipeline'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-[var(--ink-soft)] font-medium">
              Pixel: {form.pixelEnabled ? <b className="text-[var(--green)]">ON</b> : <b className="text-[var(--ink-soft)]">OFF</b>}
            </span>
            <span className="text-[var(--ink-soft)] font-medium">
              CAPI: {form.capiEnabled ? <b className="text-[var(--green)]">ON</b> : <b className="text-[var(--ink-soft)]">OFF</b>}
            </span>
          </div>
        </div>

        {testResult && (
          <div className="mt-4 pt-4 border-t border-[var(--line)] text-xs font-mono space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[var(--ink)]">Test Result:</span>
              <Badge kind={testResult.success ? 'ok' : 'danger'}>
                {testResult.success ? 'Valid' : 'Invalid'}
              </Badge>
            </div>
            {testResult.account && (
              <div className="text-[var(--ink-soft)]">
                Name: {testResult.account.name} | Currency: {testResult.account.currency} | ID: {testResult.account.id}
              </div>
            )}
          </div>
        )}
      </Card>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner label={t('loadingData') || 'Loading…'} />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: META API AUTH */}
          <Card padded>
            <div className="border-b border-[var(--line)] pb-3 mb-4">
              <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-[var(--purple)]" />
                {t('secMetaAuth') || '1. Meta API Credentials & Access'}
              </h3>
              <p className="text-xs text-[var(--ink-soft)] mt-1">
                {t('secMetaAuthDesc') || 'Requires a system user access token with marketing permissions (ads_management, ads_read)'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('metaAppIdLabel') || 'Meta App ID'}
                value={form.appId}
                onChange={(e) => setForm({ ...form, appId: e.target.value })}
                placeholder="e.g. 123456789012345"
                disabled={!canEdit}
              />

              <Input
                label={t('metaAdAccountIdLabel') || 'Ad Account ID'}
                value={form.adAccountId}
                onChange={(e) => setForm({ ...form, adAccountId: e.target.value })}
                placeholder="e.g. act_1234567890"
                hint="Include the act_ prefix"
                disabled={!canEdit}
              />

              <Input
                label={t('metaAppSecretLabel') || 'Meta App Secret'}
                type="password"
                value={form.appSecret}
                onChange={(e) => setForm({ ...form, appSecret: e.target.value })}
                placeholder={metaInfo.hasAppSecret ? '••••••••••••••••••••••••' : 'Enter Meta App Secret'}
                hint={metaInfo.hasAppSecret ? 'Configured and secured. Leave blank to keep current secret.' : ''}
                disabled={!canEdit}
              />

              <Input
                label={t('metaAccessTokenLabel') || 'System User Access Token'}
                type="password"
                value={form.accessToken}
                onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
                placeholder={metaInfo.hasAccessToken ? '••••••••••••••••••••••••' : 'Enter Meta Access Token'}
                hint={metaInfo.hasAccessToken ? 'Configured and secured. Leave blank to keep current token.' : ''}
                disabled={!canEdit}
              />
            </div>
          </Card>

          {/* SECTION 2: PIXEL & CAPI */}
          <Card padded>
            <div className="border-b border-[var(--line)] pb-3 mb-4">
              <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
                <Activity className="h-4 w-4 text-[var(--purple)]" />
                {t('secPixelCapi') || '2. Meta Pixel & Conversions API (CAPI) Settings'}
              </h3>
              <p className="text-xs text-[var(--ink-soft)] mt-1">
                {t('secPixelCapiDesc') || 'Dual tracking via Browser Pixel and Server-side CAPI for maximum attribution accuracy'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('metaPixelIdLabel') || 'Meta Pixel ID / Dataset ID'}
                value={form.pixelId}
                onChange={(e) => setForm({ ...form, pixelId: e.target.value })}
                placeholder="e.g. 987654321098765"
                disabled={!canEdit}
              />

              <Input
                label={t('metaTestEventCodeLabel') || 'Test Event Code'}
                value={form.testEventCode}
                onChange={(e) => setForm({ ...form, testEventCode: e.target.value })}
                placeholder="e.g. TEST12345"
                hint="Optional: from Meta Events Manager > Test Events"
                disabled={!canEdit}
              />

              <div className="sm:col-span-2">
                <Input
                  label={t('metaCapiTokenLabel') || 'Dedicated CAPI Token (Optional)'}
                  type="password"
                  value={form.capiToken}
                  onChange={(e) => setForm({ ...form, capiToken: e.target.value })}
                  placeholder={metaInfo.hasCapiToken ? '••••••••••••••••••••••••' : 'Optional (Falls back to Access Token above)'}
                  hint={metaInfo.hasCapiToken ? 'Configured. Leave blank to keep current.' : 'Optional if Access Token is set.'}
                  disabled={!canEdit}
                />
              </div>

              {/* Toggles */}
              <div className="sm:col-span-2 space-y-3 pt-2">
                <label className="flex items-start gap-3 p-3 rounded-[10px] border border-[var(--line)] bg-[var(--bg)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.pixelEnabled}
                    onChange={(e) => setForm({ ...form, pixelEnabled: e.target.checked })}
                    disabled={!canEdit}
                    className="mt-0.5 h-4 w-4 rounded border-[var(--line)] text-[var(--purple)] focus:ring-[var(--purple)]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[var(--ink)] block">
                      {t('enablePixelToggle') || 'Enable Browser Meta Pixel in Storefront'}
                    </span>
                    <span className="text-[11px] text-[var(--ink-soft)]">
                      {t('enablePixelDesc') || 'Injects pixel into visitors browsers to track standard e-commerce events'}
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-[10px] border border-[var(--line)] bg-[var(--bg)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.capiEnabled}
                    onChange={(e) => setForm({ ...form, capiEnabled: e.target.checked })}
                    disabled={!canEdit}
                    className="mt-0.5 h-4 w-4 rounded border-[var(--line)] text-[var(--purple)] focus:ring-[var(--purple)]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[var(--ink)] block">
                      {t('enableCapiToggle') || 'Enable Server-Side Conversions API (CAPI)'}
                    </span>
                    <span className="text-[11px] text-[var(--ink-soft)]">
                      {t('enableCapiDesc') || 'Dispatches purchase events directly from Arine server to Meta bypassing ad blockers'}
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </Card>

          {/* SECTION 3: CATALOG COMMERCE */}
          <Card padded>
            <div className="border-b border-[var(--line)] pb-3 mb-4">
              <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
                <Database className="h-4 w-4 text-[var(--purple)]" />
                {t('secCatalogSettings') || '3. Meta Commerce Catalog Settings'}
              </h3>
              <p className="text-xs text-[var(--ink-soft)] mt-1">
                {t('secCatalogSettingsDesc') || 'Connect book and package catalog with Meta Commerce Shop'}
              </p>
            </div>

            <div className="space-y-4">
              <Input
                label={t('metaCatalogIdLabel') || 'Meta Catalog ID'}
                value={form.catalogId}
                onChange={(e) => setForm({ ...form, catalogId: e.target.value })}
                placeholder="e.g. 112233445566778"
                disabled={!canEdit}
              />

              <label className="flex items-start gap-3 p-3 rounded-[10px] border border-[var(--line)] bg-[var(--bg)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.autoCatalogSync}
                  onChange={(e) => setForm({ ...form, autoCatalogSync: e.target.checked })}
                  disabled={!canEdit}
                  className="mt-0.5 h-4 w-4 rounded border-[var(--line)] text-[var(--purple)] focus:ring-[var(--purple)]"
                />
                <div>
                  <span className="text-xs font-bold text-[var(--ink)] block">
                    {t('autoCatalogSyncToggle') || 'Automatic Catalog Sync'}
                  </span>
                  <span className="text-[11px] text-[var(--ink-soft)]">
                    {t('autoCatalogSyncDesc') || 'Automatically marks modified books and packages for synchronization with Meta Commerce'}
                  </span>
                </div>
              </label>
            </div>
          </Card>

          {/* Save Action */}
          {canEdit && (
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={saving}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{saving ? (t('saving') || 'Saving…') : (t('saveMarketingSettingsBtn') || 'Save Marketing Settings')}</span>
              </Button>
            </div>
          )}
        </form>
      )}

      {/* Disconnect Confirmation Modal */}
      <Modal
        open={showDisconnectModal}
        onClose={() => setShowDisconnectModal(false)}
        title={t('disconnectMetaBtn') || 'Disconnect Meta Account'}
      >
        <div className="space-y-4 text-xs">
          <p className="text-[var(--ink-soft)] leading-relaxed">
            {t('disconnectConfirmMsg') || 'Are you sure you want to disconnect your Meta account? Access tokens will be wiped and automated CAPI event dispatch will be disabled.'}
          </p>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--line)]">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowDisconnectModal(false)}
              disabled={disconnecting}
            >
              {t('cancel') || 'Cancel'}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{disconnecting ? (t('loadingData') || 'Disconnecting…') : (t('disconnectMetaBtn') || 'Confirm Disconnect')}</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
