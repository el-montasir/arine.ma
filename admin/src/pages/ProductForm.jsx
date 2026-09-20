import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Save, BookOpen, DollarSign, Package, Image as ImageIcon, Truck, Eye } from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { api } from '../lib/api.js'
import { formatMoney } from '../lib/format.js'
import { useLanguage } from '../context/LanguageContext.jsx'
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
  publisher: '',
  shippingMode: null,
  customShipping: '',
}

const num = (v) => (v === '' || v == null ? null : Number(v))

export default function ProductForm() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const { t, language, isRTL } = useLanguage()
  const BackIcon = isRTL ? ArrowRight : ArrowLeft

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
      publisher: product.publisher || '',
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
      author: form.author.trim() || '',
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
      publisher: form.publisher.trim() || null,
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
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors cursor-pointer"
      >
        <BackIcon className="h-4 w-4" aria-hidden="true" />
        {t('back')} — {t('productsTitle')}
      </button>

      <PageHeader
        title={editing ? `${t('edit')}: ${product?.title || t('colBook')}` : t('newProductTitle')}
        subtitle={editing ? t('editProductSubtitle') : t('newProductSubtitle')}
      />

      <form onSubmit={onSubmit} className="space-y-6">
        {error ? <ErrorBanner message={error} /> : null}

        {/* 1. Basic Book Information */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2.5 border-b border-[var(--line)] pb-3.5">
            <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[var(--purple-bg)] text-[var(--purple)]">
              <BookOpen className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[var(--ink)]">{t('secBookInfo')}</h2>
              <p className="text-xs text-[var(--ink-soft)]">{t('secBookInfoDesc')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label={`${t('fieldTitle')} *`}
              value={form.title}
              onChange={set('title')}
              placeholder={t('fieldTitlePlaceholder')}
              required
            />
            <Input
              label={t('fieldAuthor')}
              value={form.author}
              onChange={set('author')}
              placeholder={t('fieldAuthorPlaceholder')}
            />
            <Select
              label={`${t('fieldCategory')} *`}
              value={form.categoryId}
              onChange={set('categoryId')}
              required
            >
              <option value="">{t('fieldSelectCategory')}</option>
              {(categories || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <Input
              label={t('fieldPublisher')}
              value={form.publisher}
              onChange={set('publisher')}
              placeholder={t('fieldPublisherPlaceholder')}
            />
          </div>

          <Textarea
            label={t('fieldDescription')}
            value={form.description}
            onChange={set('description')}
            rows={4}
            placeholder={t('fieldDescriptionPlaceholder')}
          />
        </Card>

        {/* 2. Pricing and Margins */}
        <Card className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-3.5">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[var(--green-bg)] text-[var(--green)]">
                <DollarSign className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-[var(--ink)]">{t('secPricing')}</h2>
                <p className="text-xs text-[var(--ink-soft)]">{t('secPricingDesc')}</p>
              </div>
            </div>

            {profit != null && Number.isFinite(profit) ? (
              <span className={`inline-flex items-center px-3 py-1 rounded-[20px] text-xs font-bold ${profit < 0 ? 'bg-[var(--red-bg)] text-[var(--red)]' : 'bg-[var(--green-bg)] text-[var(--green)]'}`}>
                {t('colProfit')}: {formatMoney(profit, language)}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label={`${t('fieldPrice')} *`}
              type="number"
              min="0"
              step="1"
              value={form.price}
              onChange={set('price')}
              placeholder="120"
              required
            />
            <Input
              label={t('fieldCostPrice')}
              type="number"
              min="0"
              step="1"
              value={form.costPrice}
              onChange={set('costPrice')}
              placeholder="70"
              hint={t('fieldCostPriceHint')}
            />
            <Input
              label={t('fieldOldPrice')}
              type="number"
              min="0"
              step="1"
              value={form.oldPrice}
              onChange={set('oldPrice')}
              placeholder="150"
            />
          </div>

          <div className="max-w-xs">
            <Input
              label={`${t('packageDiscount')} (%)`}
              type="number"
              min="0"
              max="100"
              step="1"
              value={form.discount}
              onChange={set('discount')}
              placeholder="10"
            />
          </div>
        </Card>

        {/* 3. Stock and Availability */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2.5 border-b border-[var(--line)] pb-3.5">
            <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[var(--blue-bg)] text-[var(--blue)]">
              <Package className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[var(--ink)]">{t('secStock')}</h2>
              <p className="text-xs text-[var(--ink-soft)]">{t('secStockDesc')}</p>
            </div>
          </div>

          <div className="max-w-md">
            <Select
              label={`${t('fieldAvailability')} *`}
              value={form.availability}
              onChange={set('availability')}
              required
            >
              <option value="in-stock">{t('availInStock')}</option>
              <option value="out-of-stock">{t('availOutOfStock')}</option>
              <option value="pre-order">{t('preOrder')}</option>
            </Select>
          </div>
        </Card>

        {/* 4. Book Images (MultiImageUpload) */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2.5 border-b border-[var(--line)] pb-3.5">
            <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[var(--orange-bg)] text-[var(--orange)]">
              <ImageIcon className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[var(--ink)]">{t('secImages')}</h2>
              <p className="text-xs text-[var(--ink-soft)]">{t('secImagesDesc')}</p>
            </div>
          </div>

          <MultiImageUpload
            type="products"
            images={form.images}
            onChange={(newImages) => setForm((f) => ({ ...f, images: newImages }))}
          />
        </Card>

        {/* 5. Shipping Settings for this Book */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2.5 border-b border-[var(--line)] pb-3.5">
            <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[var(--purple-bg)] text-[var(--purple)]">
              <Truck className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[var(--ink)]">{t('secShipping')}</h2>
              <p className="text-xs text-[var(--ink-soft)]">{t('secShippingDesc')}</p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3.5 rounded-[12px] border border-[var(--line)] bg-[var(--card)] hover:bg-[var(--bg)] cursor-pointer transition-colors">
              <input
                type="radio"
                name="shippingMode"
                value=""
                checked={!form.shippingMode || form.shippingMode === 'default'}
                onChange={() => setForm((f) => ({ ...f, shippingMode: null, customShipping: '' }))}
                className="mt-1 h-4 w-4 accent-[var(--purple)]"
              />
              <div>
                <span className="text-xs font-bold text-[var(--ink)] block">{t('shippingDefault')}</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-[12px] border border-[var(--line)] bg-[var(--card)] hover:bg-[var(--bg)] cursor-pointer transition-colors">
              <input
                type="radio"
                name="shippingMode"
                value="free"
                checked={form.shippingMode === 'free' || form.shippingMode === 'FREE'}
                onChange={() => setForm((f) => ({ ...f, shippingMode: 'free', customShipping: '' }))}
                className="mt-1 h-4 w-4 accent-[var(--purple)]"
              />
              <div>
                <span className="text-xs font-bold text-[var(--green)] block">{t('shippingFree')}</span>
                <span className="text-[11px] text-[var(--ink-soft)] block mt-0.5">{t('shippingFreeDesc')}</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-[12px] border border-[var(--line)] bg-[var(--card)] hover:bg-[var(--bg)] cursor-pointer transition-colors">
              <input
                type="radio"
                name="shippingMode"
                value="custom"
                checked={form.shippingMode === 'custom' || form.shippingMode === 'CUSTOM'}
                onChange={() => setForm((f) => ({ ...f, shippingMode: 'custom' }))}
                className="mt-1 h-4 w-4 accent-[var(--purple)]"
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-[var(--ink)] block">{t('shippingCustom')}</span>

                {(form.shippingMode === 'custom' || form.shippingMode === 'CUSTOM') && (
                  <div className="mt-3 max-w-xs">
                    <Input
                      label={`${t('fieldCustomShippingFee')} *`}
                      type="number"
                      min="0"
                      step="1"
                      value={form.customShipping}
                      onChange={set('customShipping')}
                      placeholder="40"
                      required
                    />
                  </div>
                )}
              </div>
            </label>
          </div>
        </Card>

        {/* 6. Visibility and Promotion */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2.5 border-b border-[var(--line)] pb-3.5">
            <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[var(--purple-bg)] text-[var(--purple)]">
              <Eye className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[var(--ink)]">{t('secVisibility')}</h2>
              <p className="text-xs text-[var(--ink-soft)]">{t('secVisibilityDesc')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label={t('status')} value={form.rating} onChange={set('rating')}>
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>{r} ★</option>
              ))}
            </Select>

            <div className="flex items-center gap-6 pt-6">
              <label className="flex items-center gap-2 text-xs font-semibold text-[var(--ink)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isNew}
                  onChange={set('isNew')}
                  className="h-4 w-4 rounded-[4px] border-[var(--line)] bg-[var(--card)] text-[var(--purple)] accent-[var(--purple)]"
                />
                {t('badgeNew')}
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-[var(--ink)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isPopular}
                  onChange={set('isPopular')}
                  className="h-4 w-4 rounded-[4px] border-[var(--line)] bg-[var(--card)] text-[var(--purple)] accent-[var(--purple)]"
                />
                {t('badgePopular')}
              </label>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/products')}>
            {t('cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={busy}>
            <Save className="h-4 w-4" aria-hidden="true" />
            {busy ? t('saving') : editing ? t('saveChanges') : t('createProductBtn')}
          </Button>
        </div>
      </form>
    </div>
  )
}
