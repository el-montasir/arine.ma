import { useState, useEffect } from 'react'
import { Truck, ShieldCheck, AlertCircle, RefreshCw, CheckCircle2, Save } from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { api } from '../lib/api.js'
import { formatMoney } from '../lib/format.js'
import { PageHeader, Card } from '../components/ui/Card.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Button from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Badge, StatusBadge } from '../components/ui/Badge.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function ShippingSettings() {
  const { t, language } = useLanguage()
  const { data: shippingData, loading: shippingLoading, reload: reloadShipping } = useFetch('/shipping/status')

  // Shipping configuration form state
  const [shippingForm, setShippingForm] = useState({
    enabled: true,
    flatFee: 25,
    freeEnabled: false,
    freeThreshold: 300,
  })
  const [shippingBusy, setShippingBusy] = useState(false)
  const [shippingSuccess, setShippingSuccess] = useState('')
  const [shippingError, setShippingError] = useState('')
  const [providerChanging, setProviderChanging] = useState(false)

  // Sync shipping configuration from API
  useEffect(() => {
    if (shippingData?.pricingRules) {
      setShippingForm({
        enabled: shippingData.pricingRules.enabled !== false,
        flatFee: shippingData.pricingRules.standardFee ?? 25,
        freeEnabled: Boolean(shippingData.pricingRules.freeShippingEnabled),
        freeThreshold: shippingData.pricingRules.freeShippingThreshold ?? 300,
      })
    }
  }, [shippingData])

  async function saveShippingConfig(e) {
    if (e) e.preventDefault()
    setShippingBusy(true)
    setShippingError('')
    setShippingSuccess('')
    try {
      await api.put('/shipping/config', {
        enabled: Boolean(shippingForm.enabled),
        flatFee: Number(shippingForm.flatFee),
        freeEnabled: Boolean(shippingForm.freeEnabled),
        freeThreshold: Number(shippingForm.freeThreshold),
      })
      setShippingSuccess(t('saveShippingSuccess'))
      reloadShipping()
      setTimeout(() => setShippingSuccess(''), 4000)
    } catch (err) {
      setShippingError(err.message || t('saveShippingError'))
    } finally {
      setShippingBusy(false)
    }
  }

  async function handleProviderChange(providerId) {
    setProviderChanging(true)
    try {
      await api.post('/shipping/active-provider', { providerId })
      reloadShipping()
    } catch (err) {
      alert(err.message || t('saveShippingError'))
    } finally {
      setProviderChanging(false)
    }
  }

  const activeProvider = shippingData?.activeProvider
  const registeredProviders = shippingData?.registeredProviders || []

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title={t('shippingSettingsTitle')}
        subtitle={t('shippingSettingsSubtitle')}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => reloadShipping()}
            disabled={shippingLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${shippingLoading ? 'animate-spin' : ''}`} />
            {t('refreshData')}
          </Button>
        }
      />

      {/* 1. Main Shipping Pricing & Rules Card */}
      <Card>
        <div className="flex items-center gap-2.5 border-b border-line pb-4 mb-5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600/20 text-brand-400">
            <Truck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-white">{t('shippingRulesCardTitle')}</h2>
            <p className="text-xs text-[#8b80a8]">
              {t('shippingRulesCardDesc')}
            </p>
          </div>
        </div>

        {shippingSuccess && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-ok-900/60 bg-ok-950/60 p-3 text-xs text-ok-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{shippingSuccess}</span>
          </div>
        )}

        {shippingError && (
          <div className="mb-5">
            <ErrorBanner message={shippingError} />
          </div>
        )}

        <form onSubmit={saveShippingConfig} className="space-y-5">
          {/* Global shipping toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-line bg-ink-900/40">
            <div>
              <span className="text-sm font-semibold text-white block">{t('shippingSystemTitle')}</span>
              <span className="text-xs text-[#8b80a8] block mt-0.5">
                {t('shippingSystemDisabledDesc')}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={shippingForm.enabled}
                onChange={(e) => setShippingForm((prev) => ({ ...prev, enabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
              <span className="ms-3 text-xs font-semibold text-white">
                {shippingForm.enabled ? t('active') : t('inactive')}
              </span>
            </label>
          </div>

          {/* Default shipping fee */}
          <div className="p-4 rounded-xl border border-line bg-ink-900/40">
            <div className="max-w-md">
              <Input
                label={t('standardShippingFeeLabel', { currency: t('currency') })}
                type="number"
                min="0"
                step="1"
                value={shippingForm.flatFee}
                onChange={(e) => setShippingForm((prev) => ({ ...prev, flatFee: e.target.value }))}
                hint={t('standardShippingFeeHint')}
                required
              />
            </div>
          </div>

          {/* Optional Order-Value Free Shipping Toggle & Threshold */}
          <div className="p-4 rounded-xl border border-line bg-ink-900/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line/60 pb-3">
              <div>
                <span className="text-sm font-semibold text-white block">{t('freeShippingByValueTitle')}</span>
                <span className="text-xs text-[#8b80a8] block mt-0.5">
                  {t('freeShippingByValueDesc')}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={shippingForm.freeEnabled}
                  onChange={(e) => setShippingForm((prev) => ({ ...prev, freeEnabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ok-500"></div>
                <span className={`ms-3 text-xs font-semibold ${shippingForm.freeEnabled ? 'text-ok-400' : 'text-[#8b80a8]'}`}>
                  {shippingForm.freeEnabled ? `[ ${t('active')} ]` : `[ ${t('inactive')} ]`}
                </span>
              </label>
            </div>

            {shippingForm.freeEnabled ? (
              <div className="space-y-3 pt-1">
                <div className="max-w-md">
                  <Input
                    label={t('freeShippingThresholdLabel', { currency: t('currency') })}
                    type="number"
                    min="1"
                    step="1"
                    value={shippingForm.freeThreshold}
                    onChange={(e) => setShippingForm((prev) => ({ ...prev, freeThreshold: e.target.value }))}
                    hint={t('freeShippingThresholdHint')}
                    required
                  />
                </div>
                <div className="p-3 rounded-lg bg-ok-950/30 border border-ok-900/40 text-xs text-ok-400">
                  {t('freeShippingActiveInfo', {
                    threshold: formatMoney(shippingForm.freeThreshold || 0, language),
                    fee: formatMoney(shippingForm.flatFee, language),
                  })}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-ink-950/50 border border-line text-xs text-[#8b80a8]">
                {t('freeShippingInactiveInfo', { fee: formatMoney(shippingForm.flatFee, language) })}
              </div>
            )}
          </div>

          {/* Live Summary Box */}
          <div className="rounded-xl border border-brand-500/30 bg-brand-950/20 p-4 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-400 mb-2">
              {t('currentShippingRulesSummary')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-ink-900/60 border border-line">
                <span className="text-[#8b80a8] block mb-1">{t('globalShippingStatus')}</span>
                <span className={`font-bold ${shippingForm.enabled ? 'text-ok-400' : 'text-danger-400'}`}>
                  {shippingForm.enabled ? t('active') : `${t('inactive')} (${formatMoney(0, language)})`}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-ink-900/60 border border-line">
                <span className="text-[#8b80a8] block mb-1">{t('standardOrderShippingFee')}</span>
                <span className="font-bold text-white tabular-nums">
                  {formatMoney(shippingForm.flatFee, language)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-ink-900/60 border border-line">
                <span className="text-[#8b80a8] block mb-1">{t('freeShippingThreshold')}</span>
                <span className={`font-bold ${shippingForm.freeEnabled ? 'text-ok-400' : 'text-[#8b80a8]'}`}>
                  {shippingForm.freeEnabled ? `${t('active')} (≥ ${formatMoney(shippingForm.freeThreshold, language)})` : t('inactive')}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-[#8b80a8] pt-1">
              {t('shippingPerBookRuleNote')}
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" disabled={shippingBusy}>
              <Save className="h-4 w-4" aria-hidden="true" />
              {shippingBusy ? t('saving') : t('saveShippingRulesBtn')}
            </Button>
          </div>
        </form>
      </Card>

      {/* 2. Registered Shipping Carriers / Providers */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600/20 text-brand-400">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-white">{t('shippingProvidersTitle')}</h2>
              <p className="text-xs text-[#8b80a8]">
                {t('shippingProvidersDesc')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeProvider ? (
              <StatusBadge
                kind={activeProvider.isConfigured ? 'ok' : 'neutral'}
                label={activeProvider.isConfigured ? t('activeProviderReady') : t('activeProviderNotConfigured')}
              />
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {registeredProviders.map((prov) => {
              const isSelected = prov.isActive
              return (
                <div
                  key={prov.id}
                  className={`rounded-xl border p-4 transition-all ${
                    isSelected
                      ? 'border-brand-500 bg-brand-950/30'
                      : 'border-line bg-ink-900/40 opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{prov.name}</span>
                        {isSelected && <Badge kind="brand">{t('activeCarrierBadge')}</Badge>}
                      </div>
                      <span dir="ltr" className="font-mono text-[11px] text-[#8b80a8] block mt-0.5">
                        id: {prov.id} ({prov.mode === 'api' ? t('providerModeApi') : t('providerModeLocal')})
                      </span>
                    </div>

                    <div className="shrink-0">
                      {prov.isConfigured ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ok-400 bg-ok-950/60 border border-ok-900/60 px-2 py-0.5 rounded-md">
                          <ShieldCheck className="h-3 w-3" />
                          {t('configured')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-950/60 border border-amber-900/60 px-2 py-0.5 rounded-md">
                          <AlertCircle className="h-3 w-3" />
                          {t('notConfigured')}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-[#a79cc4] leading-relaxed mb-3">
                    {prov.description}
                  </p>

                  <div className="pt-2 border-t border-line/50 flex items-center justify-between text-xs">
                    <span className="text-[#8b80a8] text-[11px]">{prov.statusLabel}</span>
                    {!isSelected && (
                      <button
                        type="button"
                        onClick={() => handleProviderChange(prov.id)}
                        disabled={providerChanging}
                        className="text-brand-400 hover:text-brand-300 font-medium underline text-xs disabled:opacity-50"
                      >
                        {t('setAsActiveProviderBtn')}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>
    </div>
  )
}
