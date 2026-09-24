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
  Plus,
  MessageSquare,
  Clock,
  Share2,
  MapPin,
  Megaphone,
  Phone,
  Mail,
  Star,
  Tag,
} from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { api } from '../lib/api.js'
import { PageHeader, Card } from '../components/ui/Card.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Button from '../components/ui/Button.jsx'
import { Input, Select, Textarea } from '../components/ui/Input.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { getImageUrl } from '../lib/images.js'

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
    whatsapp1Name: '',
    whatsapp1Number: '',
    whatsapp2Name: '',
    whatsapp2Number: '',
    customerServiceDesc: '',
    address: '',
    googleMapsUrl: '',
    workingDays: '',
    openingTime: '',
    closingTime: '',
    businessHours: '',
    instagram: '',
    tiktok: '',
    announcement: '',
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
      const contacts = Array.isArray(configData.store?.whatsappContacts) ? configData.store.whatsappContacts : []
      const c1 = contacts[0] || {}
      const c2 = contacts[1] || {}
      const fallbackWa = configData.store?.whatsapp || '0665128821'

      setForm({
        storeName: configData.store?.name || '',
        storeDescription: configData.store?.description || '',
        storeLogo: configData.store?.logo || '',
        phone: configData.store?.phone || '',
        email: configData.store?.email || '',
        whatsapp1Name: c1.label || 'خدمة العملاء',
        whatsapp1Number: c1.number || fallbackWa,
        whatsapp2Name: c2.label || 'خط المساعدة والطلب',
        whatsapp2Number: c2.number || fallbackWa,
        customerServiceDesc: configData.store?.customerServiceDesc || '',
        address: configData.store?.address || '',
        googleMapsUrl: configData.store?.googleMapsUrl || '',
        workingDays: configData.store?.workingDays || '',
        openingTime: configData.store?.openingTime || '',
        closingTime: configData.store?.closingTime || '',
        businessHours: configData.store?.businessHours || '',
        instagram: configData.store?.instagram || '',
        tiktok: configData.store?.tiktok || '',
        announcement: configData.store?.announcement || '',
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

    // Clean and normalize WhatsApp contacts (Exactly 2 numbers)
    const cleanContacts = [
      {
        id: '1',
        label: form.whatsapp1Name.trim() || 'خدمة العملاء',
        number: form.whatsapp1Number.trim(),
      },
      {
        id: '2',
        label: form.whatsapp2Name.trim() || 'خط المساعدة والطلب',
        number: form.whatsapp2Number.trim(),
      },
    ]

    const primaryWa = cleanContacts[0].number || cleanContacts[1].number || ''
    const cleanNumbers = cleanContacts.map((c) => c.number).filter(Boolean)

    // Validate and sanitize URLs if provided
    const validateUrl = (url) => {
      if (!url || !url.trim()) return ''
      const trimmed = url.trim()
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        return `https://${trimmed}`
      }
      return trimmed
    }

    const payload = {
      store: {
        name: form.storeName.trim(),
        description: form.storeDescription.trim(),
        logo: form.storeLogo ? form.storeLogo.trim() : '',
        phone: form.phone.trim(),
        email: form.email.trim(),
        whatsapp: primaryWa,
        whatsappNumbers: cleanNumbers,
        whatsappContacts: cleanContacts,
        whatsapp1Name: cleanContacts[0].label,
        whatsapp1Number: cleanContacts[0].number,
        whatsapp2Name: cleanContacts[1].label,
        whatsapp2Number: cleanContacts[1].number,
        customerServiceDesc: form.customerServiceDesc.trim(),
        address: form.address.trim(),
        googleMapsUrl: validateUrl(form.googleMapsUrl),
        workingDays: form.workingDays.trim(),
        openingTime: form.openingTime.trim(),
        closingTime: form.closingTime.trim(),
        businessHours: form.businessHours.trim(),
        instagram: validateUrl(form.instagram),
        tiktok: validateUrl(form.tiktok),
        announcement: form.announcement.trim(),
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
                {/* Light Preview */}
                <div className="rounded-[12px] border border-[var(--line)] bg-white p-3.5 flex flex-col items-center justify-center min-h-[96px] shadow-sm relative overflow-hidden">
                  <span className="absolute top-1.5 start-2 text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                    {t('previewHeader')}
                  </span>
                  {form.storeLogo ? (
                    <img
                      src={getImageUrl(form.storeLogo)}
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

                {/* Dark Preview */}
                <div className="rounded-[12px] border border-[var(--line)] bg-[#0F0D15] p-3.5 flex flex-col items-center justify-center min-h-[96px] shadow-sm relative overflow-hidden">
                  <span className="absolute top-1.5 start-2 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                    {t('previewFooter')}
                  </span>
                  {form.storeLogo ? (
                    <img
                      src={getImageUrl(form.storeLogo)}
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

            {/* Actions */}
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

        {/* 2. Store Identity */}
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
            <div className="sm:col-span-2">
              <Textarea
                label={t('storeDescField')}
                rows={2}
                value={form.storeDescription}
                onChange={set('storeDescription')}
                placeholder={t('storeDescPlaceholder')}
              />
            </div>
          </div>
        </Card>

        {/* 3. Contact Details & Customer Support */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2.5 border-b border-[var(--line)] pb-3.5">
            <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[var(--purple-bg)] text-[var(--purple)]">
              <Phone className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[var(--ink)]">
                {t('contactInfoTitle') || 'معلومات التواصل وخدمة العملاء'}
              </h2>
              <p className="text-xs text-[var(--ink-soft)]">
                {t('contactInfoDesc') || 'أرقام الهواتف، البريد الإلكتروني، وقنوات الدعم المباشر'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label={t('storePhoneField') || 'رقم الهاتف'}
              dir="ltr"
              value={form.phone}
              onChange={set('phone')}
              placeholder="0665128821"
            />
            <Input
              label={t('storeEmailField') || 'البريد الإلكتروني الرسمي'}
              type="email"
              dir="ltr"
              value={form.email}
              onChange={set('email')}
              placeholder="arine.ma00@gmail.com"
            />
            <div className="sm:col-span-2">
              <Input
                label={t('customerServiceDescField') || 'وصف خدمة العملاء'}
                value={form.customerServiceDesc}
                onChange={set('customerServiceDesc')}
                placeholder={t('customerServiceDescPlaceholder') || 'نحن هنا لمساعدتك في اختيار الكتب المناسبة والإجابة عن جميع استفساراتك.'}
              />
            </div>
          </div>

          {/* WhatsApp Settings (Exactly 2 Numbers) */}
          <div className="pt-3 border-t border-[var(--line)] space-y-4">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-[7px] bg-[var(--green)]/10 text-[var(--green)]">
                <MessageSquare className="h-4 w-4" />
              </span>
              <h3 className="text-xs font-bold text-[var(--ink)]">
                {t('whatsapp') || 'واتساب (WhatsApp)'}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* WhatsApp 1 Card */}
              <div className="p-4 rounded-[12px] border border-[var(--line)] bg-[var(--bg)]/40 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-[var(--line)]">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--green)] text-white text-[10px] font-bold">
                    1
                  </span>
                  <span className="text-xs font-bold text-[var(--ink)]">WhatsApp 1</span>
                </div>
                <Input
                  label="اسم الرقم:"
                  value={form.whatsapp1Name}
                  onChange={set('whatsapp1Name')}
                  placeholder="خدمة العملاء"
                />
                <Input
                  label="رقم الواتساب:"
                  dir="ltr"
                  value={form.whatsapp1Number}
                  onChange={set('whatsapp1Number')}
                  placeholder="0665128821"
                />
              </div>

              {/* WhatsApp 2 Card */}
              <div className="p-4 rounded-[12px] border border-[var(--line)] bg-[var(--bg)]/40 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-[var(--line)]">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--purple)] text-white text-[10px] font-bold">
                    2
                  </span>
                  <span className="text-xs font-bold text-[var(--ink)]">WhatsApp 2</span>
                </div>
                <Input
                  label="اسم الرقم:"
                  value={form.whatsapp2Name}
                  onChange={set('whatsapp2Name')}
                  placeholder="خط المساعدة والطلب"
                />
                <Input
                  label="رقم الواتساب:"
                  dir="ltr"
                  value={form.whatsapp2Number}
                  onChange={set('whatsapp2Number')}
                  placeholder="0665128821"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* 4. Location & Map */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2.5 border-b border-[var(--line)] pb-3.5">
            <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[var(--purple-bg)] text-[var(--purple)]">
              <MapPin className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[var(--ink)]">
                {t('secLocation') || 'الموقع الجغرافي والخرائط'}
              </h2>
              <p className="text-xs text-[var(--ink-soft)]">
                {t('secLocationDesc') || 'العنوان الدقيق ورابط خرائط جوجل لتسهيل وصول العملاء'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label={t('storeAddressField') || 'العنوان الكامل / المقر'}
              value={form.address}
              onChange={set('address')}
              placeholder="Morocco, Fes, Route Narjis"
            />
            <Input
              label={t('googleMapsUrlField') || 'رابط خرائط جوجل (Google Maps URL)'}
              dir="ltr"
              value={form.googleMapsUrl}
              onChange={set('googleMapsUrl')}
              placeholder="https://maps.google.com/?q=..."
            />
          </div>
        </Card>

        {/* 5. Working Hours */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2.5 border-b border-[var(--line)] pb-3.5">
            <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[var(--purple-bg)] text-[var(--purple)]">
              <Clock className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[var(--ink)]">
                {t('secWorkingHours') || 'أوقات وساعات العمل'}
              </h2>
              <p className="text-xs text-[var(--ink-soft)]">
                {t('secWorkingHoursDesc') || 'تحديد أيام وأوقات الدوام لخدمة العملاء'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label={t('workingDaysField') || 'أيام العمل'}
              value={form.workingDays}
              onChange={set('workingDays')}
              placeholder="السبت - الخميس"
            />
            <Input
              label={t('openingTimeField') || 'وقت الفتح'}
              value={form.openingTime}
              onChange={set('openingTime')}
              placeholder="09:00"
            />
            <Input
              label={t('closingTimeField') || 'وقت الإغلاق'}
              value={form.closingTime}
              onChange={set('closingTime')}
              placeholder="20:00"
            />
            <div className="sm:col-span-3">
              <Input
                label={t('businessHoursField') || 'نص ساعات العمل المخصص (اختياري للتجاوز)'}
                value={form.businessHours}
                onChange={set('businessHours')}
                placeholder="السبت - الخميس: 9:00 ص - 8:00 م"
              />
            </div>
          </div>
        </Card>

        {/* 6. Social Media */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2.5 border-b border-[var(--line)] pb-3.5">
            <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[var(--purple-bg)] text-[var(--purple)]">
              <Share2 className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[var(--ink)]">
                {t('secSocial') || 'وسائل التواصل الاجتماعي'}
              </h2>
              <p className="text-xs text-[var(--ink-soft)]">
                {t('secSocialDesc') || 'روابط الحسابات الرسمية على شبكات التواصل الاجتماعي'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label={t('instagramField') || 'رابط حساب إنستغرام (Instagram)'}
              dir="ltr"
              value={form.instagram}
              onChange={set('instagram')}
              placeholder="https://instagram.com/arine_bookstore"
            />
            <Input
              label={t('tiktokField') || 'رابط حساب تيك توك (TikTok)'}
              dir="ltr"
              value={form.tiktok}
              onChange={set('tiktok')}
              placeholder="https://tiktok.com/@arine_bookstore"
            />
          </div>
        </Card>

        {/* 7. Announcement Bar */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2.5 border-b border-[var(--line)] pb-3.5">
            <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[var(--purple-bg)] text-[var(--purple)]">
              <Megaphone className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[var(--ink)]">
                {t('secAnnouncement') || 'الشريط الإعلاني الترويجي'}
              </h2>
              <p className="text-xs text-[var(--ink-soft)]">
                {t('secAnnouncementDesc') || 'النص الذي يظهر في الشريط العلوي أعلى كل صفحات المتجر'}
              </p>
            </div>
          </div>

          <div>
            <Input
              label={t('announcementField') || 'نص الشريط الإعلاني (اتركه فارغاً لإخفاء الشريط)'}
              value={form.announcement}
              onChange={set('announcement')}
              placeholder="توصيل سريع لجميع المدن المغربية • الدفع عند الاستلام"
            />
          </div>
        </Card>

        {/* 8. Homepage Hero Promotional Texts & Stats */}
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                label={t('heroBadgeField')}
                value={form.heroBadge}
                onChange={set('heroBadge')}
                placeholder="مكتبة أرين للكتب الشرعية"
              />
            </div>
            <Input
              label={t('heroTitleField')}
              value={form.heroTitle}
              onChange={set('heroTitle')}
              placeholder={t('heroTitlePlaceholder')}
            />
            <Input
              label={t('heroSubtitleField')}
              value={form.heroSubtitle}
              onChange={set('heroSubtitle')}
              placeholder={t('heroSubtitlePlaceholder')}
            />
            <Input
              label={t('heroStatBooksField')}
              value={form.heroStatBooks}
              onChange={set('heroStatBooks')}
              placeholder="+2000"
            />
            <Input
              label={t('heroStatDeliveryField')}
              value={form.heroStatDelivery}
              onChange={set('heroStatDelivery')}
              placeholder="24/48h"
            />
            <Input
              label={t('heroStatCustomersField')}
              value={form.heroStatCustomers}
              onChange={set('heroStatCustomers')}
              placeholder="+5000"
            />
          </div>
        </Card>

        {/* 9. Homepage Featured Book */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2.5 border-b border-[var(--line)] pb-3.5">
            <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[var(--purple-bg)] text-[var(--purple)]">
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

          <Select
            label={t('secFeaturedBook')}
            value={form.featuredBookId}
            onChange={set('featuredBookId')}
          >
            <option value="">{t('selectFeaturedBookPlaceholder')}</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} — {p.author} ({p.price} {t('currency')})
              </option>
            ))}
          </Select>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={busy}
            className="min-w-[180px]"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t('saving')}</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>{t('saveChanges')}</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
