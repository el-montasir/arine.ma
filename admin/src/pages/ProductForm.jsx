import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, Save, BookOpen, DollarSign, Package, Image as ImageIcon, Truck, Eye } from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { api } from '../lib/api.js'
import { formatMoney } from '../lib/format.js'
import { PageHeader, Card } from '../components/ui/Card.jsx'
import { Input, Select, Textarea } from '../components/ui/Input.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Button from '../components/ui/Button.jsx'
import MultiImageUpload from '../components/MultiImageUpload.jsx'

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
  images: [],
  description: '',
  rating: '5',
  isNew: false,
  isPopular: false,
  pages: '',
  publisher: '',
  year: '',
  shippingMode: null,
  customShipping: '',
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

    // Prepare images array
    let rawImages = []
    if (Array.isArray(product.images) && product.images.length > 0) {
      rawImages = product.images
    } else if (product.image) {
      rawImages = [{ url: product.image, isPrimary: true, sortOrder: 0 }]
    }

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
      images: rawImages,
      description: product.description || '',
      rating: String(product.rating ?? 5),
      isNew: Boolean(product.isNew),
      isPopular: Boolean(product.isPopular),
      pages: product.pages == null ? '' : String(product.pages),
      publisher: product.publisher || '',
      year: product.year || '',
      shippingMode: product.shippingMode || null,
      customShipping: product.customShipping == null ? '' : String(product.customShipping),
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

    const imageUrls = (form.images || [])
      .map((img) => (typeof img === 'string' ? img.trim() : img.url?.trim()))
      .filter(Boolean)

    const primaryImage = imageUrls[0] || form.image.trim() || null

    const payload = {
      title: form.title.trim(),
      author: form.author.trim(),
      categoryId: Number(form.categoryId),
      price: num(form.price),
      costPrice: num(form.costPrice),
      oldPrice: num(form.oldPrice),
      discount: num(form.discount) ?? 0,
      availability: form.availability,
      image: primaryImage,
      images: imageUrls,
      description: form.description.trim() || null,
      rating: num(form.rating),
      isNew: form.isNew,
      isPopular: form.isPopular,
      pages: num(form.pages),
      publisher: form.publisher.trim() || null,
      year: form.year.trim() || null,
      shippingMode: form.shippingMode || null,
      customShipping: form.shippingMode === 'custom' ? num(form.customShipping) : null,
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
    <div className="space-y-6 max-w-5xl">
      <button
        type="button"
        onClick={() => navigate('/products')}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8b80a8] hover:text-white transition-colors"
      >
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
        العودة إلى قائمة الكتب
      </button>

      <PageHeader
        title={editing ? `تعديل: ${product?.title || 'كتاب'}` : 'إضافة كتاب جديد'}
        subtitle={
          editing
            ? 'تحديث بيانات الكتاب مع الحفاظ على سجل المبيعات والطلبات السابقة'
            : 'سعر الشراء يستخدم لحساب الأرباح الداخلية فقط ولا يظهر للزبناء في المتجر'
        }
      />

      <form onSubmit={onSubmit} className="space-y-6">
        {error ? <ErrorBanner message={error} /> : null}

        {/* 1. معلومات الكتاب الأساسية */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2.5 border-b border-line pb-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600/20 text-brand-400">
              <BookOpen className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-white">1. معلومات الكتاب</h2>
              <p className="text-xs text-[#8b80a8]">العنوان، المؤلف، التصنيف والوصف العام</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="عنوان الكتاب *" value={form.title} onChange={set('title')} placeholder="مثال: صحيح البخاري" required />
            <Input label="المؤلف *" value={form.author} onChange={set('author')} placeholder="مثال: الإمام محمد بن إسماعيل البخاري" required />
            <Select label="التصنيف *" value={form.categoryId} onChange={set('categoryId')} required>
              <option value="">اختر التصنيف…</option>
              {(categories || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <Input label="دار النشر" value={form.publisher} onChange={set('publisher')} placeholder="مثال: دار ابن حزم" />
            <Input label="سنة النشر" value={form.year} onChange={set('year')} placeholder="مثال: 2023" />
            <Input label="عدد الصفحات" type="number" min="1" step="1" value={form.pages} onChange={set('pages')} placeholder="مثال: 450" />
          </div>

          <Textarea
            label="وصف الكتاب"
            value={form.description}
            onChange={set('description')}
            rows={4}
            placeholder="نبذة مفصلة عن محتوى وفهرس الكتاب…"
          />
        </Card>

        {/* 2. الأسعار والأرباح */}
        <Card className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600/20 text-emerald-400">
                <DollarSign className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-white">2. الأسعار والأرباح</h2>
                <p className="text-xs text-[#8b80a8]">تسعير البيع والتكلفة لاحتساب الأرباح الصافية</p>
              </div>
            </div>

            {profit != null && Number.isFinite(profit) ? (
              <span className={`status-pill ${profit < 0 ? 'status-danger' : 'status-ok'}`}>
                ربح الوحدة: {formatMoney(profit)}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label="سعر البيع (درهم) *"
              type="number"
              min="0"
              step="1"
              value={form.price}
              onChange={set('price')}
              placeholder="مثال: 120"
              required
            />
            <Input
              label="سعر الشراء / التكلفة (درهم)"
              type="number"
              min="0"
              step="1"
              value={form.costPrice}
              onChange={set('costPrice')}
              placeholder="مثال: 70"
              hint="سري — لحساب الأرباح ولا يظهر للزبون"
            />
            <Input
              label="السعر القديم قبل الخصم (درهم)"
              type="number"
              min="0"
              step="1"
              value={form.oldPrice}
              onChange={set('oldPrice')}
              placeholder="مثال: 150"
            />
          </div>

          <div className="max-w-xs">
            <Input
              label="نسبة الخصم (٪)"
              type="number"
              min="0"
              max="100"
              step="1"
              value={form.discount}
              onChange={set('discount')}
              placeholder="مثال: 10"
            />
          </div>
        </Card>

        {/* 3. المخزون والتوفر */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2.5 border-b border-line pb-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600/20 text-blue-400">
              <Package className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-white">3. المخزون والتوفر</h2>
              <p className="text-xs text-[#8b80a8]">حالة توفر الكتاب وإمكانية إضافته للسلة</p>
            </div>
          </div>

          <div className="max-w-md">
            <Select label="حالة التوفر *" value={form.availability} onChange={set('availability')} required>
              <option value="in-stock">متوفر في المخزون (جاهز للشحن الفوري)</option>
              <option value="out-of-stock">نفد من المخزون (غير متاح للطلب)</option>
              <option value="pre-order">طلب مسبق (حجز قبل التوفر)</option>
            </Select>
          </div>
        </Card>

        {/* 4. صور الكتاب (MultiImageUpload) */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2.5 border-b border-line pb-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-600/20 text-amber-400">
              <ImageIcon className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-white">4. صور الكتاب</h2>
              <p className="text-xs text-[#8b80a8]">إدارة صور الكتاب المتعددة واختيار الصورة الرئيسية للغلاف</p>
            </div>
          </div>

          <MultiImageUpload
            type="products"
            images={form.images}
            onChange={(newImages) => setForm((f) => ({ ...f, images: newImages }))}
          />
        </Card>

        {/* 5. إعدادات التوصيل لهذا الكتاب */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2.5 border-b border-line pb-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600/20 text-brand-400">
              <Truck className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-white">5. إعدادات التوصيل لهذا الكتاب</h2>
              <p className="text-xs text-[#8b80a8]">
                يُطبق سعر التوصيل مرة واحدة على مستوى الطلب بالكامل، وليس لكل نسخة
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-line bg-ink-900/40 hover:bg-ink-900/80 cursor-pointer transition-colors">
              <input
                type="radio"
                name="shippingMode"
                value=""
                checked={!form.shippingMode || form.shippingMode === 'default'}
                onChange={() => setForm((f) => ({ ...f, shippingMode: null, customShipping: '' }))}
                className="mt-1 h-4 w-4 accent-brand-500"
              />
              <div>
                <span className="text-sm font-semibold text-white block">استخدام إعدادات المتجر الافتراضية (موصى به)</span>
                <span className="text-xs text-[#8b80a8] block mt-0.5">
                  يخضع هذا الكتاب للقواعد العامة للتوصيل في المتجر (سعر التوصيل الثابت وحد التوصيل المجاني للطلب)
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-line bg-ink-900/40 hover:bg-ink-900/80 cursor-pointer transition-colors">
              <input
                type="radio"
                name="shippingMode"
                value="free"
                checked={form.shippingMode === 'free' || form.shippingMode === 'FREE'}
                onChange={() => setForm((f) => ({ ...f, shippingMode: 'free', customShipping: '' }))}
                className="mt-1 h-4 w-4 accent-brand-500"
              />
              <div>
                <span className="text-sm font-semibold text-ok-400 block">توصيل مجاني لهذا الكتاب</span>
                <span className="text-xs text-[#8b80a8] block mt-0.5">
                  إذا احتوت السلة على هذا الكتاب، يحصل الطلب بالكامل على توصيل مجاني (0 درهم) بشكل مستقل
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-line bg-ink-900/40 hover:bg-ink-900/80 cursor-pointer transition-colors">
              <input
                type="radio"
                name="shippingMode"
                value="custom"
                checked={form.shippingMode === 'custom' || form.shippingMode === 'CUSTOM'}
                onChange={() => setForm((f) => ({ ...f, shippingMode: 'custom' }))}
                className="mt-1 h-4 w-4 accent-brand-500"
              />
              <div className="flex-1">
                <span className="text-sm font-semibold text-white block">سعر توصيل مخصص</span>
                <span className="text-xs text-[#8b80a8] block mt-0.5">
                  تحديد سعر شحن خاص للطلب عند شراء هذا الكتاب (تُطبق أعلى قيمة مخصصة في السلة مرة واحدة فقط)
                </span>

                {(form.shippingMode === 'custom' || form.shippingMode === 'CUSTOM') && (
                  <div className="mt-3 max-w-xs">
                    <Input
                      label="سعر التوصيل المخصص (درهم) *"
                      type="number"
                      min="0"
                      step="1"
                      value={form.customShipping}
                      onChange={set('customShipping')}
                      placeholder="مثال: 40"
                      required
                    />
                  </div>
                )}
              </div>
            </label>
          </div>
        </Card>

        {/* 6. الظهور والترويج */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2.5 border-b border-line pb-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-purple-600/20 text-purple-400">
              <Eye className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-white">6. الظهور والتصنيف الترويجي</h2>
              <p className="text-xs text-[#8b80a8]">شارة المنتج الجديد، الشائع، وتقييم النجوم</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="تقييم النجوم" value={form.rating} onChange={set('rating')}>
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>{r} نجوم (★★★★★)</option>
              ))}
            </Select>

            <div className="flex items-center gap-6 pt-6">
              <label className="flex items-center gap-2 text-xs font-semibold text-[#e3dcf0] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isNew}
                  onChange={set('isNew')}
                  className="h-4 w-4 rounded border-line bg-surface-800 text-brand-600 accent-brand-600"
                />
                تمييز كـ «كتاب جديد»
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#e3dcf0] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isPopular}
                  onChange={set('isPopular')}
                  className="h-4 w-4 rounded border-line bg-surface-800 text-brand-600 accent-brand-600"
                />
                تمييز كـ «كتاب شائع / الأكثر طلباً»
              </label>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/products')}>
            إلغاء
          </Button>
          <Button type="submit" variant="primary" disabled={busy}>
            <Save className="h-4 w-4" aria-hidden="true" />
            {busy ? 'جارِ الحفظ…' : editing ? 'حفظ التعديلات' : 'إضافة الكتاب'}
          </Button>
        </div>
      </form>
    </div>
  )
}
