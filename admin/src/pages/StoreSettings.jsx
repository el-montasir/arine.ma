import { useState, useEffect, useRef } from 'react'
import {
  Store,
  Sparkles,
  BookOpen,
  Save,
  CheckCircle2,
  RefreshCw,
  Image as ImageIcon,
  UploadCloud,
  Trash2,
  Loader2,
  AlertCircle,
  Eye,
} from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { api } from '../lib/api.js'
import { PageHeader, Card } from '../components/ui/Card.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Button from '../components/ui/Button.jsx'
import { Input, Select, Textarea } from '../components/ui/Input.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

const MAX_LOGO_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function StoreSettings() {
  const { t } = useLanguage()
  const logoInputRef = useRef(null)

  const { data: configData, loading: configLoading, reload: reloadConfig } = useFetch('/store-config')
  const { data: productsData } = useFetch('/products?limit=100')
  const products = productsData?.items || productsData || []

  const [form, setForm] = useState({
    storeName: '',
    storeDescription: '',
    storeLogo: '',
    phone: '',
    email: '',
    whatsapp: '',
    address: '',
    heroTitle: '',
    heroSubtitle: '',
    heroBadge: '',
    heroStatBooks: '',
    heroStatDelivery: '',
    heroStatCustomers: '',
    featuredBookId: '',
  })

  const [busy, setBusy] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [logoError, setLogoError] = useState('')

  useEffect(() => {
    if (configData) {
      setForm({
        storeName: configData.store?.name || '',
        storeDescription: configData.store?.description || '',
        storeLogo: configData.store?.logo || '',
        phone: configData.store?.phone || '',
        email: configData.store?.email || '',
        whatsapp: configData.store?.whatsapp || '',
        address: configData.store?.address || '',
        heroTitle: configData.hero?.title || '',
        heroSubtitle: configData.hero?.subtitle || '',
        heroBadge: configData.hero?.badge || '',
        heroStatBooks: configData.hero?.statBooks || '',
        heroStatDelivery: configData.hero?.statDelivery || '',
        heroStatCustomers: configData.hero?.statCustomers || '',
        featuredBookId: String(configData.homepage?.featuredBookId || '3'),
      })
    }
  }, [configData])

  const set = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }))
  }

  // Handle Logo File Upload
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLogoError('')
    if (!ALLOWED_LOGO_TYPES.includes(file.type.toLowerCase())) {
      setLogoError(t('errFileType'))
      if (logoInputRef.current) logoInputRef.current.value = ''
      return
    }

    if (file.size > MAX_LOGO_SIZE) {
      setLogoError(t('errFileSize'))
      if (logoInputRef.current) logoInputRef.current.value = ''
      return
    }

    setUploadingLogo(true)

    try {
      const formData = new FormData()
      formData.append('logo', file)

      const res = await api.upload('/uploads/branding', formData)
      const uploadedUrl = res?.data?.url || res?.files?.[0]?.url || res?.url

      if (!uploadedUrl) {
        throw new Error(t('errUploadGeneric'))
      }

      setForm((prev) => ({ ...prev, storeLogo: uploadedUrl }))
      setSuccessMsg(t('logoUploadSuccess'))
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err) {
      setLogoError(err.message || t('errUploadGeneric'))
    } finally {
      setUploadingLogo(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  const handleRemoveLogo = () => {
    setForm((prev) => ({ ...prev, storeLogo: '' }))
    setSuccessMsg(t('logoRemoveSuccess'))
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErrorMsg('')
    setSuccessMsg('')

    const payload = {
      store: {
        name: form.storeName.trim(),
        description: form.storeDescription.trim(),
        logo: form.storeLogo ? form.storeLogo.trim() : '',
        phone: form.phone.trim(),
        email: form.email.trim(),
        whatsapp: form.whatsapp.trim(),
        address: form.address.trim(),
      },
      hero: {
        title: form.heroTitle.trim(),
        subtitle: form.heroSubtitle.trim(),
        badge: form.heroBadge.trim(),
        statBooks: form.heroStatBooks.trim(),
        statDelivery: form.heroStatDelivery.trim(),
        statCustomers: form.heroStatCustomers.trim(),
      },
      homepage: {
        featuredBookId: Number(form.featuredBookId) || 3,
      },
    }

    try {
      await api.put('/store-config', payload)
      setSuccessMsg(t('storeSettingsSaveSuccess'))
      reloadConfig()
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err) {
      setErrorMsg(err.message || t('storeSettingsSaveError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title={t('storeSettingsTitle')}
        subtitle={t('storeSettingsSubtitle')}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => reloadConfig()}
            disabled={configLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${configLoading ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>
        }
      />

      {successMsg && (
        <div className="flex items-center gap-2 rounded-[10px] border border-[var(--green)]/30 bg-[var(--green-bg)] p-3 text-xs font-semibold text-[var(--green)]">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && <ErrorBanner message={errorMsg} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Brand Identity & Logo */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2.5 border-b border-[var(--line)] pb-3.5">
            <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[var(--purple-bg)] text-[var(--purple)]">
              <ImageIcon className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[var(--ink)]">
                {t('secBranding')}
              </h2>
              <p className="text-xs text-[var(--ink-soft)]">
                {t('secBrandingDesc')}
              </p>
            </div>
          </div>

          {logoError && (
            <div className="flex items-center gap-2 p-3 rounded-[10px] bg-[var(--red-bg)] border border-[var(--red)]/20 text-[var(--red)] text-xs font-medium">
              <AlertCircle className="h-4 w-4 shrink-0 text-[var(--red)]" />
              <span>{logoError}</span>
            </div>
          )}

          {/* Hidden File Input for Logo */}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleLogoUpload}
            className="hidden"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Live Logo Preview Box */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-[var(--purple)]" />
                  {t('logoPreviewTitle')}
                </span>
                {form.storeLogo ? (
                  <span className="text-[11px] font-semibold text-[var(--green)] bg-[var(--green-bg)] border border-[var(--green)]/20 px-2 py-0.5 rounded-full">
                    {t('currentLogo')}
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-[var(--ink-soft)] bg-[var(--bg)] border border-[var(--line)] px-2 py-0.5 rounded-full">
                    {t('noLogoUploaded')}
                  </span>
                )}
              </div>

              {/* Dual Preview: Light Background (Navbar) & Dark Background (Footer) */}
              <div className="grid grid-cols-2 gap-3">
                {/* Light Preview (Navbar style) */}
                <div className="rounded-[12px] border border-[var(--line)] bg-white p-3.5 flex flex-col items-center justify-center min-h-[96px] shadow-sm relative overflow-hidden">
                  <span className="absolute top-1.5 start-2 text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                    {t('previewHeader')}
                  </span>
                  {form.storeLogo ? (
                    <img
                      src={form.storeLogo}
                      alt="Brand Logo Preview"
                      className="max-h-12 max-w-[140px] w-auto object-contain mt-3"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="flex items-center gap-2 mt-3">
                      <div className="bg-[#7c3aed] w-8 h-8 rounded-[8px] flex items-center justify-center shadow-sm">
                        <BookOpen className="w-4 h-4 text-white" strokeWidth={2} />
                      </div>
                      <div className="leading-tight">
                        <div className="text-[0.85rem] font-bold text-[#5b21b6]">{form.storeName || t('defaultStoreName')}</div>
                        <div className="text-[0.55rem] text-gray-700">{t('defaultStoreTagline')}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dark Preview (Footer style) */}
                <div className="rounded-[12px] border border-[var(--line)] bg-[#0F0D15] p-3.5 flex flex-col items-center justify-center min-h-[96px] shadow-sm relative overflow-hidden">
                  <span className="absolute top-1.5 start-2 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                    {t('previewFooter')}
                  </span>
                  {form.storeLogo ? (
                    <img
                      src={form.storeLogo}
                      alt="Brand Logo Preview Dark"
                      className="max-h-12 max-w-[140px] w-auto object-contain mt-3 brightness-110"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="flex items-center gap-2 mt-3">
                      <div className="bg-[#7c3aed] w-8 h-8 rounded-[8px] flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-white" />
                      </div>
                      <div className="leading-tight">
                        <div className="text-[0.85rem] font-bold text-white">{form.storeName || t('defaultStoreName')}</div>
                        <div className="text-[0.55rem] text-white/50">{t('defaultStoreTagline')}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {form.storeLogo && (
                <p dir="ltr" className="text-[10px] font-mono text-[var(--ink-soft)] truncate px-1 select-all" title={form.storeLogo}>
                  {form.storeLogo}
                </p>
              )}
            </div>

            {/* Logo Upload & Management Actions */}
            <div className="flex flex-col justify-center space-y-3.5 bg-[var(--bg)] p-4 rounded-[12px] border border-[var(--line)]">
              <div>
                <h4 className="text-xs font-bold text-[var(--ink)] mb-1">
                  {t('brandLogoLabel')}
                </h4>
                <p className="text-[11px] text-[var(--ink-soft)] leading-relaxed">
                  {t('logoUploadHint')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t('uploading')}</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-4 w-4" />
                      <span>{form.storeLogo ? t('changeLogoBtn') : t('uploadLogoBtn')}</span>
                    </>
                  )}
                </Button>

                {form.storeLogo && (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={handleRemoveLogo}
                    disabled={uploadingLogo}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>{t('removeLogoBtn')}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* 2. Store Identity & Contact Information */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2.5 border-b border-[var(--line)] pb-3.5">
            <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[var(--purple-bg)] text-[var(--purple)]">
              <Store className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[var(--ink)]">
                {t('secStoreIdentity')}
              </h2>
              <p className="text-xs text-[var(--ink-soft)]">
                {t('secStoreIdentityDesc')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label={`${t('storeNameField')} *`}
              value={form.storeName}
              onChange={set('storeName')}
              placeholder={t('defaultStoreName')}
              required
            />
            <Input
              label={t('storeAddressField')}
              value={form.address}
              onChange={set('address')}
              placeholder={t('storeAddressPlaceholder')}
            />
            <Input
              label={t('storePhoneField')}
              dir="ltr"
              value={form.phone}
              onChange={set('phone')}
              placeholder="+212 600-000000"
            />
            <Input
              label={t('storeWhatsappField')}
              dir="ltr"
              value={form.whatsapp}
              onChange={set('whatsapp')}
              placeholder="+212 600-000000"
            />
            <div className="sm:col-span-2">
              <Input
                label={t('storeEmailField')}
                type="email"
                dir="ltr"
                value={form.email}
                onChange={set('email')}
                placeholder="contact@arine.ma"
              />
            </div>
          </div>

          <Textarea
            label={t('storeDescField')}
            value={form.storeDescription}
            onChange={set('storeDescription')}
            rows={3}
            placeholder={t('storeDescPlaceholder')}
          />
        </Card>

        {/* 3. Hero Section */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2.5 border-b border-[var(--line)] pb-3.5">
            <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[var(--purple-bg)] text-[var(--purple)]">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[var(--ink)]">
                {t('secHeroConfig')}
              </h2>
              <p className="text-xs text-[var(--ink-soft)]">
                {t('secHeroConfigDesc')}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label={t('heroBadgeField')}
              value={form.heroBadge}
              onChange={set('heroBadge')}
              placeholder={t('defaultStoreName')}
            />

            <Input
              label={`${t('heroTitleField')} *`}
              value={form.heroTitle}
              onChange={set('heroTitle')}
              placeholder={t('heroTitlePlaceholder')}
              required
            />

            <Textarea
              label={t('heroSubtitleField')}
              value={form.heroSubtitle}
              onChange={set('heroSubtitle')}
              rows={2}
              placeholder={t('heroSubtitlePlaceholder')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <Input
                label={t('heroStatBooksField')}
                dir="ltr"
                value={form.heroStatBooks}
                onChange={set('heroStatBooks')}
                placeholder="+2000"
              />
              <Input
                label={t('heroStatDeliveryField')}
                dir="ltr"
                value={form.heroStatDelivery}
                onChange={set('heroStatDelivery')}
                placeholder="24/48h"
              />
              <Input
                label={t('heroStatCustomersField')}
                dir="ltr"
                value={form.heroStatCustomers}
                onChange={set('heroStatCustomers')}
                placeholder="+5000"
              />
            </div>
          </div>
        </Card>

        {/* 4. Homepage Featured Book */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2.5 border-b border-[var(--line)] pb-3.5">
            <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[var(--orange-bg)] text-[var(--orange)]">
              <BookOpen className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[var(--ink)]">
                {t('secFeaturedBook')}
              </h2>
              <p className="text-xs text-[var(--ink-soft)]">
                {t('secFeaturedBookDesc')}
              </p>
            </div>
          </div>

          <div className="max-w-md">
            <Select
              label={t('selectFeaturedBook')}
              value={form.featuredBookId}
              onChange={set('featuredBookId')}
            >
              <option value="">{t('selectFeaturedBookPlaceholder')}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.id} - {p.title} ({p.author})
                </option>
              ))}
            </Select>
            <p className="text-[11px] text-[var(--ink-soft)] mt-1.5">
              {t('featuredBookSectionDesc')}
            </p>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={busy || uploadingLogo}>
            <Save className="h-4 w-4" aria-hidden="true" />
            {busy ? t('saving') : t('saveChanges')}
          </Button>
        </div>
      </form>
    </div>
  )
}
