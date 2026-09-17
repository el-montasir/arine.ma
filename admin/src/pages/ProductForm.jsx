import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, Save } from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { api } from '../lib/api.js'
import { formatMoney } from '../lib/format.js'
import { PageHeader, Card } from '../components/ui/Card.jsx'
import { Input, Select, Textarea } from '../components/ui/Input.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Button from '../components/ui/Button.jsx'

const EMPTY = {
  title: '',
  author: '',
  categoryId: '',
  price: '',
  costPrice: '',
  oldPrice: '',
  discount: '0',
  availability: 'in-stock',
  image: '',
  description: '',
  rating: '5',
  isNew: false,
  isPopular: false,
  pages: '',
  publisher: '',
  year: '',
}

const num = (v) => (v === '' || v == null ? null : Number(v))

export default function ProductForm() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const { data: categories = [] } = useFetch('/categories')
  const { data: product } = useFetch(id ? `/products/${id}` : '', [id])

  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!product) return
    setForm({
      title: product.title || '',
      author: product.author || '',
      categoryId: String(product.categoryId ?? ''),
      price: String(product.price ?? ''),
      costPrice: product.costPrice == null ? '' : String(product.costPrice),
      oldPrice: product.oldPrice == null ? '' : String(product.oldPrice),
      discount: String(product.discount ?? 0),
      availability: product.availability || 'in-stock',
      image: product.image || '',
      description: product.description || '',
      rating: String(product.rating ?? 5),
      isNew: Boolean(product.isNew),
      isPopular: Boolean(product.isPopular),
      pages: product.pages == null ? '' : String(product.pages),
      publisher: product.publisher || '',
      year: product.year || '',
    })
  }, [product])

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const payload = {
      title: form.title.trim(),
      author: form.author.trim(),
      categoryId: Number(form.categoryId),
      price: num(form.price),
      costPrice: num(form.costPrice),
      oldPrice: num(form.oldPrice),
      discount: num(form.discount) ?? 0,
      availability: form.availability,
      image: form.image.trim() || null,
      description: form.description.trim() || null,
      rating: num(form.rating),
      isNew: form.isNew,
      isPopular: form.isPopular,
      pages: num(form.pages),
      publisher: form.publisher.trim() || null,
      year: form.year.trim() || null,
    }
    try {
      if (editing) {
        await api.put(`/products/${id}`, payload)
      } else {
        await api.post('/products', payload)
      }
      navigate('/products')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const profit =
    form.price !== '' && form.costPrice !== '' && form.costPrice !== null
      ? Number(form.price) - Number(form.costPrice)
      : null

  return (
    <div>
      <button onClick={() => navigate('/products')} className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#8b80a8] hover:text-white">
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
        العودة إلى الكتب
      </button>
      <PageHeader title={editing ? 'تعديل كتاب' : 'إضافة كتاب جديد'} subtitle={editing ? 'اكتمال المعلومات مع الحفاظ على سجل الطلبات' : 'سعر الشراء يستخدم لحساب الأرباح ولا يظهر للعملاء'} />

      <form onSubmit={onSubmit} className="space-y-5">
        {error ? <ErrorBanner message={error} /> : null}
        <Card className="space-y-5">
          <h2 className="text-sm font-semibold text-white">المعلومات الأساسية</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="العنوان *" value={form.title} onChange={set('title')} required />
            <Input label="المؤلف *" value={form.author} onChange={set('author')} required />
            <Select label="التصنيف *" value={form.categoryId} onChange={set('categoryId')} required>
              <option value="">اختر التصنيف…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <Select label="التوفر" value={form.availability} onChange={set('availability')}>
              <option value="in-stock">متوفر</option>
              <option value="out-of-stock">غير متوفر</option>
              <option value="pre-order">طلب مسبق</option>
            </Select>
          </div>
        </Card>

        <Card className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">التسعير</h2>
            {profit != null && Number.isFinite(profit) ? (
              <span className={`status-pill ${profit < 0 ? 'status-danger' : 'status-ok'}`}>
                ربح الوحدة {formatMoney(profit)}
              </span>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input label="سعر البيع (درهم) *" type="number" min="0" step="1" value={form.price} onChange={set('price')} required />
            <Input label="سعر الشراء (درهم)" type="number" min="0" step="1" value={form.costPrice} onChange={set('costPrice')} hint="لحساب الأرباح — لا يظهر للعملاء" />
            <Input label="السعر القديم" type="number" min="0" step="1" value={form.oldPrice} onChange={set('oldPrice')} />
          </div>
          <Input label="الخصم (٪)" type="number" min="0" max="100" step="1" value={form.discount} onChange={set('discount')} />
        </Card>

        <Card className="space-y-5">
          <h2 className="text-sm font-semibold text-white">التفاصيل</h2>
          <Input label="رابط الصورة" type="url" value={form.image} onChange={set('image')} placeholder="https://…" />
          <Textarea label="الوصف" value={form.description} onChange={set('description')} rows={4} />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Input label="عدد الصفحات" type="number" min="1" step="1" value={form.pages} onChange={set('pages')} />
            <Input label="الناشر" value={form.publisher} onChange={set('publisher')} />
            <Input label="سنة النشر" value={form.year} onChange={set('year')} />
            <Select label="التقييم" value={form.rating} onChange={set('rating')}>
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>{r} ★</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-[#e3dcf0]">
              <input type="checkbox" checked={form.isNew} onChange={set('isNew')} className="h-4 w-4 accent-brand-500" />
              جديد
            </label>
            <label className="flex items-center gap-2 text-sm text-[#e3dcf0]">
              <input type="checkbox" checked={form.isPopular} onChange={set('isPopular')} className="h-4 w-4 accent-brand-500" />
              شائع
            </label>
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/products')}>إلغاء</Button>
          <Button type="submit" variant="primary" disabled={busy}>
            <Save className="h-4 w-4" aria-hidden="true" />
            {busy ? 'جارِ الحفظ…' : editing ? 'حفظ التعديلات' : 'إضافة الكتاب'}
          </Button>
        </div>
      </form>
    </div>
  )
}