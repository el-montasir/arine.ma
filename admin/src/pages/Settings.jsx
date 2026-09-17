import { useState } from 'react'
import { Plus } from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { api } from '../lib/api.js'
import { formatDateShort } from '../lib/format.js'
import { PageHeader, Card } from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Modal from '../components/ui/Modal.jsx'
import Button from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Badge } from '../components/ui/Badge.jsx'

export default function Settings() {
  const { data: settings, loading, error, reload } = useFetch('/settings')
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
      reload()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const columns = [
    { key: 'key', label: 'المفتاح', render: ([k]) => <span dir="ltr" className="font-mono text-xs text-brand-400">{k}</span> },
    { key: 'value', label: 'القيمة', render: ([, v]) => <span className="break-all">{v}</span> },
    { key: 'meta', label: 'نوعه', render: () => <Badge kind="neutral">إعداد عام (غير سري)</Badge> },
  ]

  return (
    <div>
      <PageHeader
        title="الإعدادات"
        subtitle="إعدادات عامة غير سرية. أي مفاتيح حساسة (شركات التوصيل، واجهات API) توضع في بيئة الخادم ولا تصل إلى المتصفح أبداً"
        actions={
          <Button variant="primary" onClick={() => { setKey(''); setValue(''); setFormError(''); setModal(true) }}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            إضافة إعداد
          </Button>
        }
      />

      {error ? <ErrorBanner message={error} /> : null}

      <Card padded={false} className="mb-6">
        <Table
          columns={columns}
          rows={entries}
          rowKey={([k]) => k}
          loading={loading}
          empty="لا توجد إعدادات بعد"
        />
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-white">طريق العمل القادم</h2>
        <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-[#a79cc4]">
          <li>إعدادات شحن وتوصيل (يُشار إليها من دورة معالجة الطلبات).</li>
          <li>بيانات شركة التوصيل DIGYLOG — تُخزن في بيئة الخادم وليس في هذه الصفحة.</li>
          <li>تخصيص المتجر (رقم الهاتف، كود الخصم…).</li>
        </ul>
        <p className="mt-3 text-xs text-[#6f6488]">آخر تحديث: {formatDateShort(new Date().toISOString())}</p>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="إعداد جديد">
        <div className="space-y-4">
          {formError ? <ErrorBanner message={formError} /> : null}
          <Input label="المفتاح" dir="ltr" value={key} onChange={(e) => setKey(e.target.value)} placeholder="shipping.enabled" />
          <Input label="القيمة" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModal(false)}>إلغاء</Button>
          <Button variant="primary" onClick={save} disabled={busy || !key.trim()} >{busy ? 'جارِ الحفظ…' : 'حفظ'}</Button>
        </div>
      </Modal>
    </div>
  )
}