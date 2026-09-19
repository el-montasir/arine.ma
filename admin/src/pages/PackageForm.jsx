import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  ArrowLeft,
  Save,
  Package as PackageIcon,
  BookOpen,
  DollarSign,
  Truck,
  Eye,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Search,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { api } from '../lib/api.js'
import { formatMoney, formatBookCount } from '../lib/format.js'
import { PageHeader, Card } from '../components/ui/Card.jsx'
import { Input, Select, Textarea } from '../components/ui/Input.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Button from '../components/ui/Button.jsx'
import MultiImageUpload from '../components/MultiImageUpload.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

const EMPTY = {
  title: '',
  description: '',
  price: '',
  costPrice: '',
  oldPrice: '',
  discount: '0',
  availability: 'in-stock',
  image: '',
  images: [],
  isNew: false,
  isPopular: false,
  shippingMode: null,
  customShipping: '',
  bookIds: [],
}

const num = (v) => (v === '' || v == null ? null : Number(v))

export default function PackageForm() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const { t, isRTL, language } = useLanguage()

  const { data: rawProducts } = useFetch('/products')
  const { data: packageData } = useFetch(id ? `/packages/${id}` : '', [id])

  const [form, setForm] = useState(EMPTY)
  const [selectedBooks, setSelectedBooks] = useState([])
  const [bookSearch, setBookSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const ArrowIcon = isRTL ? ArrowRight : ArrowLeft

  // Normalize allProducts to guaranteed array
  const productsList = useMemo(() => {
    if (!rawProducts) return []
    if (Array.isArray(rawProducts)) return rawProducts
    if (Array.isArray(rawProducts.items)) return rawProducts.items
    if (Array.isArray(rawProducts.data)) return rawProducts.data
    return []
  }, [rawProducts])

  // Populate form on edit
  useEffect(() => {
    if (!packageData) return

    let rawImages = []
    if (Array.isArray(packageData.images) && packageData.images.length > 0) {
      rawImages = packageData.images
    } else if (packageData.image) {
      rawImages = [{ url: packageData.image, isPrimary: true, sortOrder: 0 }]
    }

    const books = Array.isArray(packageData.books) ? packageData.books : []
    setSelectedBooks(books)

    setForm({
      title: packageData.title || '',
      description: packageData.description || '',
      price: String(packageData.price ?? ''),
      costPrice: packageData.costPrice == null ? '' : String(packageData.costPrice),
      oldPrice: packageData.oldPrice == null ? '' : String(packageData.oldPrice),
      discount: String(packageData.discount ?? 0),
      availability: packageData.availability || 'in-stock',
      image: packageData.image || '',
      images: rawImages,
      isNew: Boolean(packageData.isNew),
      isPopular: Boolean(packageData.isPopular),
      shippingMode: packageData.shippingMode || null,
      customShipping: packageData.customShipping == null ? '' : String(packageData.customShipping),
      bookIds: books.map((b) => b?.id).filter(Boolean),
    })
  }, [packageData])

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [key]: value }))
  }

  // Filter available books to add
  const filteredAvailableBooks = useMemo(() => {
    if (!productsList || productsList.length === 0) return []
    const selectedIds = new Set((selectedBooks || []).map((b) => b?.id).filter(Boolean))
    const q = (bookSearch || '').trim().toLowerCase()
    return productsList.filter((p) => {
      if (!p || !p.id || selectedIds.has(p.id)) return false
      if (!q) return true
      const target = `${p.title || ''} ${p.author || ''} ${p.category || ''}`.toLowerCase()
      return target.includes(q)
    })
  }, [productsList, selectedBooks, bookSearch])

  // Book selection handlers
  const handleAddBook = (book) => {
    if (!book) return
    const updated = [...(selectedBooks || []), book]
    setSelectedBooks(updated)
    setForm((f) => ({ ...f, bookIds: updated.map((b) => b?.id).filter(Boolean) }))
    setBookSearch('')
  }

  const handleRemoveBook = (bookId) => {
    const updated = (selectedBooks || []).filter((b) => b?.id !== bookId)
    setSelectedBooks(updated)
    setForm((f) => ({ ...f, bookIds: updated.map((b) => b?.id).filter(Boolean) }))
  }

  const handleMoveBook = (index, direction) => {
    const targetIndex = index + direction
    if (!selectedBooks || targetIndex < 0 || targetIndex >= selectedBooks.length) return
    const updated = [...selectedBooks]
    const [moved] = updated.splice(index, 1)
    updated.splice(targetIndex, 0, moved)
    setSelectedBooks(updated)
    setForm((f) => ({ ...f, bookIds: updated.map((b) => b?.id).filter(Boolean) }))
  }

  // Calculations from selected books
  const totalBooksRetailPrice = useMemo(() => {
    return (selectedBooks || []).reduce((sum, b) => sum + (Number(b?.price) || 0), 0)
  }, [selectedBooks])

  const totalBooksCostPrice = useMemo(() => {
    return (selectedBooks || []).reduce((sum, b) => sum + (Number(b?.costPrice) || 0), 0)
  }, [selectedBooks])

  const calculatedProfit = useMemo(() => {
    const priceNum = Number(form.price)
    const costNum = form.costPrice !== '' ? Number(form.costPrice) : totalBooksCostPrice
    if (!priceNum || isNaN(priceNum)) return null
    return priceNum - costNum
  }, [form.price, form.costPrice, totalBooksCostPrice])

  const customerSavings = useMemo(() => {
    const priceNum = Number(form.price)
    if (!priceNum || totalBooksRetailPrice <= priceNum) return 0
    return totalBooksRetailPrice - priceNum
  }, [form.price, totalBooksRetailPrice])

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')

    if (selectedBooks.length === 0) {
      setError(t('noBooksSelected'))
      setBusy(false)
      return
    }

    // Normalize images to proper structure with url, isPrimary, sortOrder
    const imagesArray = (form.images || [])
      .map((img, idx) => {
        if (typeof img === 'string') {
          return { url: img.trim(), isPrimary: idx === 0, sortOrder: idx }
        }
        return {
          url: img.url?.trim() || '',
          isPrimary: Boolean(img.isPrimary ?? idx === 0),
          sortOrder: typeof img.sortOrder === 'number' ? img.sortOrder : idx,
        }
      })
      .filter((img) => Boolean(img.url))

    const primaryImage = imagesArray.find(img => img.isPrimary)?.url || imagesArray[0]?.url || form.image.trim() || null

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      price: num(form.price),
      costPrice: num(form.costPrice),
      oldPrice: num(form.oldPrice) || (totalBooksRetailPrice > Number(form.price) ? totalBooksRetailPrice : null),
      discount: num(form.discount) ?? 0,
      availability: form.availability,
      image: primaryImage,
      images: imagesArray,
      isNew: form.isNew,
      isPopular: form.isPopular,
      shippingMode: form.shippingMode || null,
      customShipping: form.shippingMode === 'custom' ? num(form.customShipping) : null,
      bookIds: (selectedBooks || []).map((b) => b?.id).filter(Boolean),
    }

    try {
      if (editing) {
        await api.put(`/packages/${id}`, payload)
      } else {
        await api.post('/packages', payload)
      }
      navigate('/packages')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <button
        type="button"
        onClick={() => navigate('/packages')}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8b80a8] hover:text-white transition-colors"
      >
        <ArrowIcon className="h-4 w-4" aria-hidden="true" />
        {t('back')} — {t('packagesTitle')}
      </button>

      <PageHeader
        title={editing ? `${t('edit')}: ${packageData?.title || ''}` : t('newPackageTitle')}
        subtitle={editing ? t('editPackageSubtitle') : t('newPackageSubtitle')}
      />

      <form onSubmit={onSubmit} className="space-y-6">
        {error ? <ErrorBanner message={error} /> : null}

        {/* 1. معلومات الباقة الأساسية */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2.5 border-b border-line pb-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600/20 text-brand-400">
              <PackageIcon className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-white">{t('secPackageInfo')}</h2>
              <p className="text-xs text-[#8b80a8]">{t('secPackageInfoDesc')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label={`${t('fieldPackageTitle')} *`}
              value={form.title}
              onChange={set('title')}
              placeholder={t('fieldPackageTitlePlaceholder')}
              required
            />

            <Textarea
              label={t('fieldPackageDescription')}
              value={form.description}
              onChange={set('description')}
              rows={4}
              placeholder={t('fieldPackageDescriptionPlaceholder')}
            />
          </div>
        </Card>

        {/* 2. الكتب المضمنة في الباقة */}
        <Card className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600/20 text-blue-400">
                <BookOpen className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-white">{t('secPackageBooks')}</h2>
                <p className="text-xs text-[#8b80a8]">{t('secPackageBooksDesc')}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-brand-950/80 text-brand-400 border border-brand-800/60 rounded-lg text-xs font-bold shadow-sm">
                {formatBookCount(selectedBooks.length, language)}
              </span>
            </div>
          </div>

          {/* Search to add books */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#d9d1e9]">
                {t('addBooksBtn')}
              </label>
              <span className="text-[11px] text-[#8b80a8]">
                {filteredAvailableBooks.length} {t('booksCountAvailable')}
              </span>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-gray-400 dark:text-[#6f6488]" />
              <input
                type="search"
                value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)}
                placeholder={t('searchBooksPlaceholder')}
                className="w-full rounded-lg border border-line bg-white dark:bg-ink-900 py-2.5 pe-3 ps-9 text-sm text-gray-900 dark:text-[#f2eefb] placeholder:text-gray-400 dark:placeholder:text-[#6f6488] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:focus:ring-brand-400"
              />
            </div>

            {/* Search Dropdown / Results with NO truncation */}
            {bookSearch.trim() && (
              <div className="max-h-80 overflow-y-auto rounded-xl border border-line bg-surface-900 p-2 space-y-1 shadow-2xl divide-y divide-line/30">
                {filteredAvailableBooks.length === 0 ? (
                  <p className="p-4 text-center text-xs text-[#6f6488]">{t('noBooksMatchSearch')}</p>
                ) : (
                  filteredAvailableBooks.map((book) => (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => handleAddBook(book)}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-surface-800 text-start transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {book.image ? (
                          <img src={book.image} alt="" className="h-10 w-8 rounded object-cover border border-line shrink-0" loading="lazy" />
                        ) : (
                          <div className="h-10 w-8 bg-surface-800 rounded border border-line flex items-center justify-center text-[10px] text-muted shrink-0">
                            📚
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white group-hover:text-brand-400 truncate">{book.title}</p>
                          <p className="text-[11px] text-[#8b80a8] truncate">{book.author} • {book.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0 ms-2">
                        <span className="text-xs font-bold text-brand-400 tabular-nums">{formatMoney(book.price, language)}</span>
                        <span className="p-1.5 rounded-md bg-brand-600/20 text-brand-400 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                          <Plus className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Selected Books List */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-semibold text-[#d9d1e9]">
              {t('selectedBooks')}:
            </h3>

            {selectedBooks.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-line bg-surface-900/50">
                <BookOpen className="h-8 w-8 text-[#6f6488] mx-auto mb-2 opacity-50" />
                <p className="text-xs text-[#8b80a8]">{t('noBooksSelected')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedBooks.map((book, idx) => (
                  <div
                    key={book.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-line bg-surface-900 hover:border-brand-500/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-5 text-center text-xs font-bold text-[#6f6488]">{idx + 1}</span>
                      {book.image ? (
                        <img src={book.image} alt="" className="h-10 w-8 rounded object-cover border border-line" />
                      ) : (
                        <div className="h-10 w-8 bg-surface-800 rounded border border-line flex items-center justify-center text-xs text-muted">
                          📚
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{book.title}</p>
                        <p className="text-[11px] text-[#8b80a8] truncate">
                          {book.author} • {book.category} • {t('colPrice')}: <span className="text-brand-400 font-semibold">{formatMoney(book.price, language)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveBook(idx, -1)}
                        disabled={idx === 0}
                        title={t('moveForward')}
                        className="p-1 rounded-md hover:bg-surface-800 text-[#a79cc4] disabled:opacity-30"
                      >
                        <MoveUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveBook(idx, 1)}
                        disabled={idx === selectedBooks.length - 1}
                        title={t('moveBackward')}
                        className="p-1 rounded-md hover:bg-surface-800 text-[#a79cc4] disabled:opacity-30"
                      >
                        <MoveDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveBook(book.id)}
                        title={t('removeBook')}
                        className="p-1 rounded-md hover:bg-danger-400/20 text-danger-400 transition-colors ms-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Aggregated totals */}
                <div className="mt-3 p-3.5 rounded-xl bg-surface-800/70 border border-line flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div>
                    <span className="text-[#8b80a8]">{t('totalBooksPrice')}</span>{' '}
                    <span className="font-bold text-white tabular-nums">{formatMoney(totalBooksRetailPrice, language)}</span>
                  </div>
                  <div>
                    <span className="text-[#8b80a8]">{t('calculatedCostPrice')}</span>{' '}
                    <span className="font-bold text-emerald-400 tabular-nums">{formatMoney(totalBooksCostPrice, language)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* 3. أسعار الباقة وهوامش الربح */}
        <Card className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600/20 text-emerald-400">
                <DollarSign className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-white">{t('secPackagePricing')}</h2>
                <p className="text-xs text-[#8b80a8]">{t('secPackagePricingDesc')}</p>
              </div>
            </div>

            {calculatedProfit != null && Number.isFinite(calculatedProfit) ? (
              <span className={`status-pill ${calculatedProfit < 0 ? 'status-danger' : 'status-ok'}`}>
                {t('packageProfit')}: {formatMoney(calculatedProfit, language)}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label={`${t('fieldPackagePrice')} *`}
              type="number"
              min="0"
              step="1"
              value={form.price}
              onChange={set('price')}
              placeholder={totalBooksRetailPrice ? String(Math.round(totalBooksRetailPrice * 0.85)) : '250'}
              required
            />
            <Input
              label={t('fieldPackageCostPrice')}
              type="number"
              min="0"
              step="1"
              value={form.costPrice}
              onChange={set('costPrice')}
              placeholder={totalBooksCostPrice ? String(totalBooksCostPrice) : '180'}
              hint={t('costPriceSecretNote')}
            />
            <Input
              label={t('fieldPackageOldPrice')}
              type="number"
              min="0"
              step="1"
              value={form.oldPrice}
              onChange={set('oldPrice')}
              placeholder={totalBooksRetailPrice ? String(totalBooksRetailPrice) : '300'}
              hint={totalBooksRetailPrice ? `${t('totalBooksPrice')} ${formatMoney(totalBooksRetailPrice, language)}` : ''}
            />
          </div>

          {customerSavings > 0 && (
            <div className="p-3 bg-brand-950/60 border border-brand-800/60 rounded-xl flex items-center justify-between text-xs">
              <span className="text-brand-300 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-brand-400" />
                {t('packageSavings')}
              </span>
              <span className="font-bold text-brand-400 text-sm">{formatMoney(customerSavings, language)}</span>
            </div>
          )}
        </Card>

        {/* 4. المخزون والتوفر */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2.5 border-b border-line pb-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600/20 text-blue-400">
              <PackageIcon className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-white">{t('secStock')}</h2>
              <p className="text-xs text-[#8b80a8]">{t('secStockDesc')}</p>
            </div>
          </div>

          <div className="max-w-md">
            <Select label={`${t('fieldAvailability')} *`} value={form.availability} onChange={set('availability')} required>
              <option value="in-stock">{t('availInStock')}</option>
              <option value="out-of-stock">{t('availOutOfStock')}</option>
              <option value="pre-order">{t('preOrder')}</option>
            </Select>
          </div>
        </Card>

        {/* 5. صور الباقة (MultiImageUpload) */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2.5 border-b border-line pb-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-600/20 text-amber-400">
              <ImageIcon className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-white">{t('secPackageImages')}</h2>
              <p className="text-xs text-[#8b80a8]">{t('secPackageImagesDesc')}</p>
            </div>
          </div>

          <MultiImageUpload
            type="packages"
            images={form.images}
            onChange={(newImages) => setForm((f) => ({ ...f, images: newImages }))}
          />
        </Card>

        {/* 6. إعدادات التوصيل لهذه الباقة */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2.5 border-b border-line pb-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600/20 text-brand-400">
              <Truck className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-white">{t('secPackageShipping')}</h2>
              <p className="text-xs text-[#8b80a8]">
                {t('secPackageShippingDesc')}
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
                <span className="text-sm font-semibold text-white block">{t('shippingDefault')}</span>
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
                <span className="text-sm font-semibold text-ok-400 block">{t('shippingFree')}</span>
                <span className="text-xs text-[#8b80a8] block mt-0.5">
                  {t('shippingFreeDesc')}
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
                <span className="text-sm font-semibold text-white block">{t('shippingCustom')}</span>

                {(form.shippingMode === 'custom' || form.shippingMode === 'CUSTOM') && (
                  <div className="mt-3 max-w-xs">
                    <Input
                      label={`${t('fieldCustomShippingFee')} *`}
                      type="number"
                      min="0"
                      step="1"
                      value={form.customShipping}
                      onChange={set('customShipping')}
                      placeholder="35"
                      required
                    />
                  </div>
                )}
              </div>
            </label>
          </div>
        </Card>

        {/* 7. الظهور والترويج */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2.5 border-b border-line pb-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-purple-600/20 text-purple-400">
              <Eye className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-white">{t('secPackageVisibility')}</h2>
              <p className="text-xs text-[#8b80a8]">{t('secPackageVisibilityDesc')}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-xs font-semibold text-[#e3dcf0] cursor-pointer">
              <input
                type="checkbox"
                checked={form.isNew}
                onChange={set('isNew')}
                className="h-4 w-4 rounded border-line bg-surface-800 text-brand-600 accent-brand-600"
              />
              {t('badgeNew')}
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-[#e3dcf0] cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPopular}
                onChange={set('isPopular')}
                className="h-4 w-4 rounded border-line bg-surface-800 text-brand-600 accent-brand-600"
              />
              {t('badgePopular')}
            </label>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/packages')}>
            {t('cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={busy}>
            <Save className="h-4 w-4" aria-hidden="true" />
            {busy ? t('saving') : editing ? t('saveChanges') : t('createPackageBtn')}
          </Button>
        </div>
      </form>
    </div>
  )
}
