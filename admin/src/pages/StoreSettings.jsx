import { useState, useEffect, useRef } from 'react'
import {
  Store,
  Sparkles,
  Phone,
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
  const { t, isRTL } = useLanguage()
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
      setLogoError(t('errFileType') || 'نوع الملف غير مدعوم. الصيغ المسموحة هي PNG و JPG و WEBP.')
      if (logoInputRef.current) logoInputRef.current.value = ''
      return
    }

    if (file.size > MAX_LOGO_SIZE) {
      setLogoError(t('errFileSize') || 'حجم الشعار يتجاوز الحد الأقصى المسموح به (5 ميغابايت).')
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
        throw new Error(t('errUploadGeneric') || 'لم يتم استلام رابط الشعار المرفوع')
      }

      setForm((prev) => ({ ...prev, storeLogo: uploadedUrl }))
      setSuccessMsg(t('logoUploadSuccess') || 'تم رفع وتعيين الشعار بنجاح')
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err) {
      setLogoError(err.message || t('errUploadGeneric') || 'فشل رفع الشعار')
    } finally {
      setUploadingLogo(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  const handleRemoveLogo = () => {
    setForm((prev) => ({ ...prev, storeLogo: '' }))
    setSuccessMsg(t('logoRemoveSuccess') || 'تمت إزالة الشعار والعودة للشعار الافتراضي')
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
      setSuccessMsg(t('success') || 'تم حفظ وتحديث إعدادات وبيانات المتجر بنجاح')
      reloadConfig()
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err) {
      setErrorMsg(err.message || t('error') || 'فشل حفظ إعدادات المتجر')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title={t('storeSettingsTitle') || 'إعدادات المتجر والصفحة الرئيسية'}
        subtitle={t('storeSettingsSubtitle') || 'التحكم في هوية المتجر، معلومات التواصل، نصوص الواجهة الترويجية، واختيار الكتاب المميز'}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => reloadConfig()}
            disabled={configLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${configLoading ? 'animate-spin' : ''}`} />
            {t('refresh') || 'تحديث'}
          </Button>
        }
      />

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-ok-900/60 bg-ok-950/60 p-3 text-xs text-ok-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && <ErrorBanner message={errorMsg} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. الهوية البصرية وشعار المتجر الرسمي (Brand Identity & Logo) */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2.5 border-b border-line pb-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-purple-600/20 text-purple-400">
              <ImageIcon className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-white">
                {t('secBranding') || '1. الهوية البصرية وشعار المتجر'}
              </h2>
              <p className="text-xs text-[#8b80a8]">
                {t('secBrandingDesc') || 'تحميل وتعديل الشعار الرسمي الذي يظهر في أعلى وأسفل واجهة المتجر'}
              </p>
            </div>
          </div>

          {logoError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-danger-950/80 border border-danger-800/80 text-danger-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 text-danger-400" />
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
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-brand-400" />
                  {t('logoPreviewTitle') || 'معاينة الشعار في واجهة المتجر'}
                </span>
                {form.storeLogo ? (
                  <span className="text-[11px] font-semibold text-ok-400 bg-ok-950/60 border border-ok-900/60 px-2 py-0.5 rounded-full">
                    {t('currentLogo') || 'شعار مخصص مفعّل'}
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-[#8b80a8] bg-surface-800 border border-line px-2 py-0.5 rounded-full">
                    {t('noLogoUploaded') || 'الشعار الافتراضي'}
                  </span>
                )}
              </div>

              {/* Dual Preview: Light Background (Navbar) & Dark Background (Footer) */}
              <div className="grid grid-cols-2 gap-3">
                {/* Light Preview (Navbar style) */}
                <div className="rounded-xl border border-line bg-white p-3.5 flex flex-col items-center justify-center min-h-[96px] shadow-sm relative overflow-hidden">
                  <span className="absolute top-1.5 start-2 text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                    الهيدر (Header)
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
                      <div className="bg-brand-700 w-8 h-8 rounded-lg flex items-center justify-center shadow-sm">
                        <BookOpen className="w-4 h-4 text-white" strokeWidth={2} />
                      </div>
                      <div className="leading-tight text-right">
                        <div className="text-[0.85rem] font-bold text-brand-800">{form.storeName || 'مكتبة أرين'}</div>
                        <div className="text-[0.55rem] text-gray-700">للكتب والعلوم الشرعية</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dark Preview (Footer style) */}
                <div className="rounded-xl border border-line bg-[#0F0D15] p-3.5 flex flex-col items-center justify-center min-h-[96px] shadow-sm relative overflow-hidden">
                  <span className="absolute top-1.5 start-2 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                    الفوتر (Footer)
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
                      <div className="bg-brand-700 w-8 h-8 rounded-lg flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-white" />
                      </div>
                      <div className="leading-tight text-right">
                        <div className="text-[0.85rem] font-bold text-white">{form.storeName || 'مكتبة أرين'}</div>
                        <div className="text-[0.55rem] text-white/50">للكتب والعلوم الشرعية</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {form.storeLogo && (
                <p dir="ltr" className="text-[10px] font-mono text-[#8b80a8] truncate px-1 select-all" title={form.storeLogo}>
                  {form.storeLogo}
                </p>
              )}
            </div>

            {/* Logo Upload & Management Actions */}
            <div className="flex flex-col justify-center space-y-3.5 bg-ink-950/40 p-4 rounded-xl border border-line">
              <div>
                <h4 className="text-xs font-bold text-white mb-1">
                  {t('brandLogoLabel') || 'تحميل شعار المتجر'}
                </h4>
                <p className="text-[11px] text-[#8b80a8] leading-relaxed">
                  {t('logoUploadHint') || 'الصيغ المدعومة: PNG، JPG، WEBP (يُفضل خلفية شفافة PNG/WEBP — الحد الأقصى 5 ميغابايت)'}
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
                      <span>جارِ الرفع…</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-4 w-4" />
                      <span>{form.storeLogo ? (t('changeLogoBtn') || 'تغيير الشعار') : (t('uploadLogoBtn') || 'رفع شعار جديد')}</span>
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
                    <span>{t('removeLogoBtn') || 'حذف الشعار'}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* 2. هوية المتجر وبيانات التواصل */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2.5 border-b border-line pb-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600/20 text-brand-400">
              <Store className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-white">
                {t('secStoreIdentity') || '2. هوية المتجر وبيانات التواصل'}
              </h2>
              <p className="text-xs text-[#8b80a8]">
                {t('storeSettingsSubtitle') || 'الاسم العام، النبذة التعريفية، وأرقام خدمة العملاء'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label={t('storeNameField') || 'اسم المتجر *'}
              value={form.storeName}
              onChange={set('storeName')}
              placeholder="مثال: مكتبة أرين للكتب الشرعية"
              required
            />
            <Input
              label={t('storeAddressField') || 'العنوان / التغطية الجغرافية'}
              value={form.address}
              onChange={set('address')}
              placeholder="مثال: المغرب — توصيل لجميع المدن"
            />
            <Input
              label={t('storePhoneField') || 'رقم الهاتف للتواصل'}
              dir="ltr"
              value={form.phone}
              onChange={set('phone')}
              placeholder="+212 600-000000"
            />
            <Input
              label="رقم الواتساب (WhatsApp)"
              dir="ltr"
              value={form.whatsapp}
              onChange={set('whatsapp')}
              placeholder="+212 600-000000"
            />
            <div className="sm:col-span-2">
              <Input
                label={t('storeEmailField') || 'البريد الإلكتروني الرسمي'}
                type="email"
                dir="ltr"
                value={form.email}
                onChange={set('email')}
                placeholder="contact@arine.ma"
              />
            </div>
          </div>

          <Textarea
            label={t('storeDescField') || 'نبذة تعريفية عن المتجر'}
            value={form.storeDescription}
            onChange={set('storeDescription')}
            rows={3}
            placeholder="مكتبة مغربية متخصصة في توفير أمهات الكتب الإسلامية والمصادر الموثوقة…"
          />
        </Card>

        {/* 3. واجهة الصفحة الرئيسية (Hero Section) */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2.5 border-b border-line pb-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-purple-600/20 text-purple-400">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-white">
                {t('secHeroConfig') || '3. نصوص واجهة المتجر الرئيسية (Hero Section)'}
              </h2>
              <p className="text-xs text-[#8b80a8]">
                العناوين والإحصائيات الترويجية التي تظهر في أعلى الصفحة الرئيسية
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label={t('heroBadgeField') || 'شارة الواجهة العلوية (Badge)'}
              value={form.heroBadge}
              onChange={set('heroBadge')}
              placeholder="مثال: مكتبة أرين للكتب الشرعية"
            />

            <Input
              label={t('heroTitleField') || 'العنوان الترويجي الرئيسي (Hero Title) *'}
              value={form.heroTitle}
              onChange={set('heroTitle')}
              placeholder="مثال: اكتشف كتابك القادم"
              required
            />

            <Textarea
              label={t('heroSubtitleField') || 'النص الفرعي الترحيبي (Hero Subtitle)'}
              value={form.heroSubtitle}
              onChange={set('heroSubtitle')}
              rows={2}
              placeholder="مجموعة مختارة من الكتب الشرعية والمعرفية لعشاق القراءة وطلب العلم."
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <Input
                label="إحصائية الكتب المعروضة"
                dir="ltr"
                value={form.heroStatBooks}
                onChange={set('heroStatBooks')}
                placeholder="+2000"
              />
              <Input
                label="إحصائية سرعة التوصيل"
                dir="ltr"
                value={form.heroStatDelivery}
                onChange={set('heroStatDelivery')}
                placeholder="24/48h"
              />
              <Input
                label="إحصائية العملاء السعداء"
                dir="ltr"
                value={form.heroStatCustomers}
                onChange={set('heroStatCustomers')}
                placeholder="+5000"
              />
            </div>
          </div>
        </Card>

        {/* 4. الكتاب المميز في الصفحة الرئيسية (Featured Book) */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2.5 border-b border-line pb-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-600/20 text-amber-400">
              <BookOpen className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-white">
                {t('secFeaturedBook') || '4. الكتاب المميز (Featured Book)'}
              </h2>
              <p className="text-xs text-[#8b80a8]">
                اختيار الكتاب الذي يظهر في قسم «كتاب الأسبوع / الكتاب المميز» بالرئيسية
              </p>
            </div>
          </div>

          <div className="max-w-md">
            <Select
              label={t('selectFeaturedBook') || 'اختر الكتاب المميز'}
              value={form.featuredBookId}
              onChange={set('featuredBookId')}
            >
              <option value="">-- اختر كتاباً من القائمة --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.id} - {p.title} ({p.author})
                </option>
              ))}
            </Select>
            <p className="text-[11px] text-[#8b80a8] mt-1.5">
              سيتم عرض تفاصيل هذا الكتاب، مقتطف من وصفه، وسعره في القسم الترويجي الخاص بالرئيسية.
            </p>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={busy || uploadingLogo}>
            <Save className="h-4 w-4" aria-hidden="true" />
            {busy ? (t('saving') || 'جارِ الحفظ…') : (t('saveChanges') || 'حفظ إعدادات المتجر')}
          </Button>
        </div>
      </form>
    </div>
  )
}

