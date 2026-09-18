import { useState, useEffect } from 'react'
import { Plus, Sun, Moon, Palette, Truck, ShieldCheck, RefreshCw, Save, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useFetch from '../lib/useFetch.js'
import { api } from '../lib/api.js'
import { PageHeader, Card } from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Modal from '../components/ui/Modal.jsx'
import Button from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { useTheme } from '../context/ThemeContext.jsx'

export default function Settings() {
  const navigate = useNavigate()
  const { theme, setTheme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  const { data: settings, loading: settingsLoading, error: settingsError, reload: reloadSettings } = useFetch('/settings')
  const [modal, setModal] = useState(false)
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  const entries = Object.entries(settings || {})

  async function save() {
    setBusy(true)
    setFormError('')
    try {
      await api.post('/settings', { key: key.trim(), value })
      setModal(false)
      reloadSettings()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const columns = [
    { key: 'key', label: 'المفتاح', render: ([k]) => <span dir="ltr" className="font-mono text-xs text-brand-400">{k}</span> },
    { key: 'value', label: 'القيمة', render: ([, v]) => <span className="break-all">{v}</span> },
    { key: 'meta', label: 'النوع', render: () => <Badge kind="neutral">إعداد عام (غير سري)</Badge> },
  ]

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="الإعدادات والنظام"
        subtitle="التحكم في مظهر لوحة التحكم، إعدادات التوصيل، وقواعد البيانات العامة"
        actions={
          <Button variant="primary" onClick={() => { setKey(''); setValue(''); setFormError(''); setModal(true) }}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            إضافة إعداد مخصص
          </Button>
        }
      />

      {settingsError ? <ErrorBanner message={settingsError} /> : null}

      {/* 1. Appearance / Theme Customization Card */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2.5 border-b border-line pb-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-purple-600/20 text-purple-400">
            <Palette className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-white">مظهر لوحة التحكم (Theme)</h2>
            <p className="text-xs text-[#8b80a8]">التبديل بين الوضع الداكن والوضع الفاتح مع حفظ التفضيلات تلقائياً</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Dark theme card */}
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border text-right transition-all flex items-start gap-3.5 ${
              isDark
                ? 'border-brand-500 bg-brand-950/40 ring-1 ring-brand-500/50'
                : 'border-line bg-ink-900/40 hover:border-line-soft'
            }`}
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ink-950 text-brand-400 border border-line">
              <Moon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">الوضع الداكن (Dark Theme)</span>
                {isDark && <Badge kind="brand">المفعّل</Badge>}
              </div>
              <p className="text-xs text-[#8b80a8] mt-1">
                خلفية بنفسجية داكنة مريحة للعين ومناسبة للعمل الليلي
              </p>
            </div>
          </button>

          {/* Light theme card */}
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border text-right transition-all flex items-start gap-3.5 ${
              !isDark
                ? 'border-brand-500 bg-brand-950/40 ring-1 ring-brand-500/50'
                : 'border-line bg-ink-900/40 hover:border-line-soft'
            }`}
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-800 text-amber-400 border border-line">
              <Sun className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">الوضع الفاتح (Light Theme)</span>
                {!isDark && <Badge kind="brand">المفعّل</Badge>}
              </div>
              <p className="text-xs text-[#8b80a8] mt-1">
                واجهة ناصعة بتباين عالي مناسبة لبيئات الإضاءة القوية
              </p>
            </div>
          </button>
        </div>
      </Card>

      {/* 2. Quick Navigation to Dedicated Sections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="flex items-center justify-between p-4 hover:border-brand-500/50 transition-colors">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600/20 text-brand-400">
              <Truck className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">إعدادات وقواعد التوصيل</h3>
              <p className="text-xs text-[#8b80a8]">تحديد سعر التوصيل والحد الأدنى للشحن المجاني</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/shipping-settings')}>
            <span>فتح</span>
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
        </Card>

        <Card className="flex items-center justify-between p-4 hover:border-brand-500/50 transition-colors">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-purple-600/20 text-purple-400">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">إعدادات المتجر والواجهة</h3>
              <p className="text-xs text-[#8b80a8]">نصوص الواجهة، هوية المتجر، والكتاب المميز</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/store-settings')}>
            <span>فتح</span>
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
        </Card>
      </div>

      {/* 3. General Settings Key-Value Table */}
      <Card padded={false}>
        <div className="p-4 border-b border-line flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">إعدادات النظام العامة (Key-Value)</h2>
            <p className="text-xs text-[#8b80a8] mt-0.5">قائمة المتغيرات العامة المخزنة في قاعدة البيانات</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => reloadSettings()} disabled={settingsLoading}>
            <RefreshCw className={`h-3.5 w-3.5 ${settingsLoading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>
        <Table
          columns={columns}
          rows={entries}
          rowKey={([k]) => k}
          loading={settingsLoading}
          empty="لا توجد إعدادات مخصصة مسجلة بعد"
        />
      </Card>

      {/* Modal for adding custom settings */}
      <Modal open={modal} onClose={() => setModal(false)} title="إضافة إعداد مخصص جديد">
        <div className="space-y-4">
          {formError ? <ErrorBanner message={formError} /> : null}
          <Input label="المفتاح (Key)" dir="ltr" value={key} onChange={(e) => setKey(e.target.value)} placeholder="custom.setting_key" />
          <Input label="القيمة (Value)" value={value} onChange={(e) => setValue(e.target.value)} placeholder="القيمة المراد حفظها..." />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModal(false)}>إلغاء</Button>
          <Button variant="primary" onClick={save} disabled={busy || !key.trim()}>
            {busy ? 'جارِ الحفظ…' : 'حفظ الإعداد'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
