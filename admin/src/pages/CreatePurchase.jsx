import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Plus,
  Trash2,
  Package,
  Calendar,
  DollarSign,
  AlertTriangle,
  FileText,
  Percent,
  Search,
  Check,
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  RotateCcw,
  User,
  ExternalLink,
  Link as LinkIcon,
  Sparkles,
  CheckCircle2,
  X,
  ChevronDown,
  Info,
  BookOpen,
} from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { api } from '../lib/api.js'
import { formatMoney, formatNumber } from '../lib/format.js'
import { getImageUrl } from '../lib/images.js'
import { PageHeader, Card } from '../components/ui/Card.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Button from '../components/ui/Button.jsx'
import { Input, Select, Textarea } from '../components/ui/Input.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import Modal from '../components/ui/Modal.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function CreatePurchase() {
  const { t, language, isRTL } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedSupplierId = searchParams.get('supplierId')

  // --- Fetch Base Data ---
  const { data: suppliersData, loading: loadingSuppliers } = useFetch('/suppliers?limit=100')
  const suppliers = useMemo(() => {
    const raw = Array.isArray(suppliersData)
      ? suppliersData
      : (suppliersData?.items || suppliersData?.data || [])
    return raw.filter((s) => s.isActive !== false)
  }, [suppliersData])

  const { data: productsData, loading: loadingProducts, reload: reloadProducts } = useFetch('/products?limit=500')
  const [catalogProducts, setCatalogProducts] = useState([])

  useEffect(() => {
    const raw = Array.isArray(productsData) ? productsData : productsData?.items || productsData?.data || []
    if (raw.length > 0) {
      setCatalogProducts(raw)
    }
  }, [productsData])

  const { data: categoriesData } = useFetch('/categories')
  const categories = useMemo(() => {
    return Array.isArray(categoriesData) ? categoriesData : categoriesData?.data || []
  }, [categoriesData])

  // --- Supplier Selection State ---
  const [supplierId, setSupplierId] = useState(preselectedSupplierId || '')
  const [supplierSearch, setSupplierSearch] = useState('')
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false)
  const supplierDropdownRef = useRef(null)

  // Supplier Mapped Products
  const [supplierProducts, setSupplierProducts] = useState([])
  const [loadingSupplierProducts, setLoadingSupplierProducts] = useState(false)

  // Selected supplier entity
  const selectedSupplier = useMemo(() => {
    return suppliers.find((s) => String(s.id) === String(supplierId)) || null
  }, [suppliers, supplierId])

  // Load supplier mapped products on supplier change
  useEffect(() => {
    if (!supplierId) {
      setSupplierProducts([])
      return
    }

    let isMounted = true
    async function fetchMapped() {
      setLoadingSupplierProducts(true)
      try {
        const res = await api.get(`/suppliers/${supplierId}/products`)
        const list = Array.isArray(res) ? res : res?.data || []
        if (isMounted) {
          setSupplierProducts(list)
        }
      } catch (err) {
        console.error('Failed to load supplier products:', err)
      } finally {
        if (isMounted) setLoadingSupplierProducts(false)
      }
    }

    fetchMapped()
    return () => {
      isMounted = false
    }
  }, [supplierId])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(e.target)) {
        setIsSupplierDropdownOpen(false)
      }
      if (bookSearchRef.current && !bookSearchRef.current.contains(e.target)) {
        setIsBookSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // --- Book Search & Adding State ---
  const [bookSearch, setBookSearch] = useState('')
  const [isBookSearchOpen, setIsBookSearchOpen] = useState(false)
  const bookSearchRef = useRef(null)

  // --- Purchase Header State ---
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  const [expectedDate, setExpectedDate] = useState('')
  const [status, setStatus] = useState('DRAFT')
  const [notes, setNotes] = useState('')

  // Financial adjustments
  const [shippingCost, setShippingCost] = useState('0')
  const [otherCost, setOtherCost] = useState('0')
  const [discountAmount, setDiscountAmount] = useState('0')

  // Line items state
  const [items, setItems] = useState([])
  const [highlightedRowId, setHighlightedRowId] = useState(null)

  // UI status
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => {
      setToast(null)
    }, 3500)
  }

  // Flash row highlight
  const triggerRowHighlight = (productId) => {
    setHighlightedRowId(productId)
    setTimeout(() => {
      setHighlightedRowId(null)
    }, 1600)
  }

  // --- Modals State ---
  // Modal 1: Switch Supplier Confirmation
  const [isSwitchSupplierModalOpen, setIsSwitchSupplierModalOpen] = useState(false)
  const [pendingSupplier, setPendingSupplier] = useState(null)

  // Modal 2: Case B - Link Existing Book to Supplier
  const [isLinkBookModalOpen, setIsLinkBookModalOpen] = useState(false)
  const [linkBookTarget, setLinkBookTarget] = useState(null)
  const [linkBookForm, setLinkBookForm] = useState({
    purchasePrice: '',
    minimumOrderQuantity: '1',
    supplierSku: '',
    notes: '',
  })
  const [linkBookBusy, setLinkBookBusy] = useState(false)
  const [linkBookError, setLinkBookError] = useState('')

  // Modal 3: Case C - Quick Create Unlisted Book & Link
  const [isQuickCreateModalOpen, setIsQuickCreateModalOpen] = useState(false)
  const [quickCreateForm, setQuickCreateForm] = useState({
    title: '',
    author: '',
    categoryId: '',
    price: '',
    purchasePrice: '',
    minimumOrderQuantity: '1',
    supplierSku: '',
    notes: '',
  })
  const [quickCreateBusy, setQuickCreateBusy] = useState(false)
  const [quickCreateError, setQuickCreateError] = useState('')

  // --- Supplier Filtering ---
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch.trim()) return suppliers
    const q = supplierSearch.trim().toLowerCase()
    return suppliers.filter((s) => {
      return (
        s.name?.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q) ||
        s.contactPerson?.toLowerCase().includes(q) ||
        s.phone?.includes(q) ||
        s.whatsapp?.includes(q) ||
        s.email?.toLowerCase().includes(q)
      )
    })
  }, [suppliers, supplierSearch])

  // --- Book Filtering ---
  const filteredBooks = useMemo(() => {
    const q = bookSearch.trim().toLowerCase()
    if (!q) {
      // If no query, return linked books first or top catalog books
      if (supplierProducts.length > 0) {
        const linkedProductIds = new Set(supplierProducts.map((sp) => sp.productId))
        return catalogProducts
          .slice()
          .sort((a, b) => {
            const aLinked = linkedProductIds.has(a.id) ? 1 : 0
            const bLinked = linkedProductIds.has(b.id) ? 1 : 0
            return bLinked - aLinked
          })
          .slice(0, 15)
      }
      return catalogProducts.slice(0, 15)
    }

    return catalogProducts.filter((b) => {
      return (
        b.title?.toLowerCase().includes(q) ||
        b.author?.toLowerCase().includes(q) ||
        b.category?.toLowerCase().includes(q)
      )
    })
  }, [catalogProducts, bookSearch, supplierProducts])

  // --- Supplier Selection Handlers ---
  const handleSelectSupplier = (supplier) => {
    if (items.length > 0 && supplierId && String(supplierId) !== String(supplier.id)) {
      setPendingSupplier(supplier)
      setIsSwitchSupplierModalOpen(true)
      setIsSupplierDropdownOpen(false)
      return
    }

    setSupplierId(supplier.id)
    setSupplierSearch('')
    setIsSupplierDropdownOpen(false)
  }

  const handleConfirmSwitchSupplier = () => {
    if (pendingSupplier) {
      setSupplierId(pendingSupplier.id)
      setPendingSupplier(null)
      setIsSwitchSupplierModalOpen(false)
      showToast(t('supplierUpdatedSuccess') || 'Supplier changed', 'info')
    }
  }

  // --- Adding Books to Line Items ---
  // Case A: Book is already linked to supplier
  const handleAddLinkedBook = (book, supplierMapping) => {
    const agreedCost = Number(supplierMapping?.purchasePrice) || Number(book.costPrice) || Number(book.price) || 0
    const moq = Number(supplierMapping?.minimumOrderQuantity) || 1

    const existingIndex = items.findIndex((it) => it.productId === book.id)

    if (existingIndex >= 0) {
      // Increment quantity
      const updated = [...items]
      const currQty = Number(updated[existingIndex].quantityOrdered) || 1
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantityOrdered: currQty + 1,
      }
      setItems(updated)
      triggerRowHighlight(book.id)
      showToast(t('itemQuantityIncremented') || 'Quantity ordered incremented (+1)')
    } else {
      // Add new line item
      const newItem = {
        productId: book.id,
        product: book,
        quantityOrdered: moq,
        unitCost: agreedCost,
        discount: 0,
      }
      setItems([newItem, ...items])
      triggerRowHighlight(book.id)
      showToast(t('itemAddedSuccess') || 'Book added to purchase order')
    }

    setBookSearch('')
    setIsBookSearchOpen(false)
  }

  // Case B: Open Link Modal for unlinked book
  const handleOpenLinkModal = (book) => {
    setLinkBookTarget(book)
    setLinkBookForm({
      purchasePrice:
        book.costPrice != null && Number(book.costPrice) > 0
          ? String(book.costPrice)
          : String(book.price ? Math.round(Number(book.price) * 0.7) : ''),
      minimumOrderQuantity: '1',
      supplierSku: '',
      notes: '',
    })
    setLinkBookError('')
    setIsBookSearchOpen(false)
    setIsLinkBookModalOpen(true)
  }

  // Submit Case B: Link Book & Add to PO
  const handleSaveLinkBook = async (e) => {
    e.preventDefault()
    if (!supplierId || !linkBookTarget) return

    const price = Number(linkBookForm.purchasePrice)
    if (isNaN(price) || price < 0) {
      setLinkBookError(t('purchaseCostPerItem') + ' is required')
      return
    }

    setLinkBookBusy(true)
    setLinkBookError('')

    try {
      const payload = {
        productId: linkBookTarget.id,
        purchasePrice: price,
        minimumOrderQuantity: linkBookForm.minimumOrderQuantity
          ? Number(linkBookForm.minimumOrderQuantity)
          : undefined,
        supplierSku: linkBookForm.supplierSku?.trim() || undefined,
        notes: linkBookForm.notes?.trim() || undefined,
        isActive: true,
      }

      const res = await api.post(`/suppliers/${supplierId}/products`, payload)
      const newMapping = res?.data || res

      // Update local supplierProducts cache
      setSupplierProducts((prev) => {
        const filtered = prev.filter((sp) => sp.productId !== linkBookTarget.id)
        return [
          {
            ...newMapping,
            productId: linkBookTarget.id,
            purchasePrice: price,
            minimumOrderQuantity: payload.minimumOrderQuantity || 1,
            supplierSku: payload.supplierSku,
            product: linkBookTarget,
          },
          ...filtered,
        ]
      })

      // Add to line items
      const moq = Number(payload.minimumOrderQuantity) || 1
      const existingIndex = items.findIndex((it) => it.productId === linkBookTarget.id)

      if (existingIndex >= 0) {
        const updated = [...items]
        updated[existingIndex] = {
          ...updated[existingIndex],
          unitCost: price,
          quantityOrdered: (Number(updated[existingIndex].quantityOrdered) || 1) + 1,
        }
        setItems(updated)
      } else {
        const newItem = {
          productId: linkBookTarget.id,
          product: linkBookTarget,
          quantityOrdered: moq,
          unitCost: price,
          discount: 0,
        }
        setItems([newItem, ...items])
      }

      triggerRowHighlight(linkBookTarget.id)
      showToast(t('bookLinkedAndAddedSuccess') || 'Book linked and added to purchase order')
      setIsLinkBookModalOpen(false)
      setLinkBookTarget(null)
    } catch (err) {
      setLinkBookError(err.message || 'Failed to link book to supplier')
    } finally {
      setLinkBookBusy(false)
    }
  }

  // Case C: Open Quick Create Modal
  const handleOpenQuickCreateModal = () => {
    setQuickCreateForm({
      title: bookSearch.trim(),
      author: '',
      categoryId: categories[0]?.id ? String(categories[0].id) : '',
      price: '',
      purchasePrice: '',
      minimumOrderQuantity: '1',
      supplierSku: '',
      notes: '',
    })
    setQuickCreateError('')
    setIsBookSearchOpen(false)
    setIsQuickCreateModalOpen(true)
  }

  // Submit Case C: Create Book in Catalog + Link to Supplier + Add to PO
  const handleSaveQuickCreateBook = async (e) => {
    e.preventDefault()
    if (!supplierId) return

    if (!quickCreateForm.title.trim()) {
      setQuickCreateError(t('bookTitleLabelRequired') || 'Book title is required')
      return
    }
    if (!quickCreateForm.categoryId) {
      setQuickCreateError(t('categoryLabelRequired') || 'Category is required')
      return
    }
    const retailPrice = Number(quickCreateForm.price)
    if (isNaN(retailPrice) || retailPrice < 0) {
      setQuickCreateError(t('retailPriceLabel') || 'Valid retail price is required')
      return
    }
    const purchaseCost = Number(quickCreateForm.purchasePrice)
    if (isNaN(purchaseCost) || purchaseCost < 0) {
      setQuickCreateError(t('agreedPurchasePriceLabel') || 'Valid agreed purchase price is required')
      return
    }

    setQuickCreateBusy(true)
    setQuickCreateError('')

    try {
      // Step 1: Create catalog product with availability in-stock, stock = 0
      const productPayload = {
        title: quickCreateForm.title.trim(),
        author: quickCreateForm.author.trim() || '',
        categoryId: Number(quickCreateForm.categoryId),
        price: retailPrice,
        costPrice: purchaseCost,
        availability: 'in-stock',
      }

      const prodRes = await api.post('/products', productPayload)
      const createdProduct = prodRes?.data || prodRes

      // Step 2: Link product to supplier
      const moq = Number(quickCreateForm.minimumOrderQuantity) || 1
      const supplierProdPayload = {
        productId: createdProduct.id,
        purchasePrice: purchaseCost,
        minimumOrderQuantity: moq,
        supplierSku: quickCreateForm.supplierSku?.trim() || undefined,
        notes: quickCreateForm.notes?.trim() || undefined,
        isActive: true,
      }

      const linkRes = await api.post(`/suppliers/${supplierId}/products`, supplierProdPayload)
      const mapping = linkRes?.data || linkRes

      // Step 3: Update local caches
      setCatalogProducts((prev) => [createdProduct, ...prev])
      setSupplierProducts((prev) => [
        {
          ...mapping,
          productId: createdProduct.id,
          purchasePrice: purchaseCost,
          minimumOrderQuantity: moq,
          supplierSku: supplierProdPayload.supplierSku,
          product: createdProduct,
        },
        ...prev,
      ])

      // Step 4: Add to line items
      const newItem = {
        productId: createdProduct.id,
        product: createdProduct,
        quantityOrdered: moq,
        unitCost: purchaseCost,
        discount: 0,
      }
      setItems([newItem, ...items])

      triggerRowHighlight(createdProduct.id)
      showToast(t('bookCreatedAndAddedSuccess') || 'Book created, linked, and added to purchase order')
      setIsQuickCreateModalOpen(false)
    } catch (err) {
      setQuickCreateError(err.message || 'Failed to create and link book')
    } finally {
      setQuickCreateBusy(false)
    }
  }

  // --- Line Items Table Handlers ---
  const handleItemQuantityChange = (productId, newQty) => {
    const val = Math.max(1, parseInt(newQty, 10) || 1)
    setItems((prev) =>
      prev.map((it) => (it.productId === productId ? { ...it, quantityOrdered: val } : it))
    )
  }

  const handleItemCostChange = (productId, newCost) => {
    setItems((prev) =>
      prev.map((it) => (it.productId === productId ? { ...it, unitCost: newCost } : it))
    )
  }

  const handleItemDiscountChange = (productId, newDisc) => {
    setItems((prev) =>
      prev.map((it) => (it.productId === productId ? { ...it, discount: newDisc } : it))
    )
  }

  const handleRemoveItem = (productId) => {
    setItems((prev) => prev.filter((it) => it.productId !== productId))
  }

  // --- Financial Calculations ---
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const qty = Number(item.quantityOrdered) || 0
      const cost = Number(item.unitCost) || 0
      const disc = Number(item.discount) || 0
      const lineTotal = Math.max(0, qty * cost - disc)
      return sum + lineTotal
    }, 0)
  }, [items])

  const grandTotal = useMemo(() => {
    const ship = Number(shippingCost) || 0
    const other = Number(otherCost) || 0
    const disc = Number(discountAmount) || 0
    return Math.max(0, subtotal + ship + other - disc)
  }, [subtotal, shippingCost, otherCost, discountAmount])

  // --- Form Submission ---
  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!supplierId) {
      setFormError(t('noSupplierSelectedPrompt') || 'Please select a supplier')
      return
    }

    if (!items || items.length === 0) {
      setFormError(t('purchaseItemsTitle') + ': ' + (t('addItemToPurchaseBtn') || 'Please add at least one line item'))
      return
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (!it.productId) {
        setFormError(`Item #${i + 1}: ${t('selectProductPrompt')}`)
        return
      }
      if (!it.quantityOrdered || Number(it.quantityOrdered) < 1) {
        setFormError(`Item #${i + 1}: ${t('quantityOrdered')} >= 1`)
        return
      }
      if (it.unitCost === '' || Number(it.unitCost) < 0) {
        setFormError(`Item #${i + 1}: ${t('unitCost')} >= 0`)
        return
      }
    }

    setBusy(true)
    try {
      const payload = {
        supplierId: Number(supplierId),
        status: status || 'DRAFT',
        purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString() : new Date().toISOString(),
        expectedDate: expectedDate ? new Date(expectedDate).toISOString() : undefined,
        shippingCost: Number((Number(shippingCost) || 0).toFixed(2)),
        otherCost: Number((Number(otherCost) || 0).toFixed(2)),
        discount: Number((Number(discountAmount) || 0).toFixed(2)),
        notes: notes?.trim() || undefined,
        items: items.map((it) => ({
          productId: Number(it.productId),
          quantityOrdered: Number(it.quantityOrdered),
          unitCost: Number(Number(it.unitCost).toFixed(2)),
          discount: Number((Number(it.discount) || 0).toFixed(2)),
        })),
      }

      const res = await api.post('/purchases', payload)
      const newPurchase = res?.data || res
      navigate(`/purchases/${newPurchase.id}`)
    } catch (err) {
      setFormError(err.message || 'Failed to create purchase order')
    } finally {
      setBusy(false)
    }
  }

  // Format phone for WhatsApp
  const cleanPhoneForWa = (phone) => {
    if (!phone) return ''
    return phone.replace(/[^0-9]/g, '')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 ${
            isRTL ? 'left-6' : 'right-6'
          } z-50 flex items-center gap-2.5 px-4 py-3 rounded-[14px] bg-[var(--card)] border border-[var(--line)] shadow-xl text-xs font-semibold text-[var(--ink)] animate-in fade-in slide-in-from-bottom-3 duration-200`}
        >
          {toast.type === 'info' ? (
            <Info className="h-4 w-4 text-[var(--purple)] shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-[var(--green-badge)] shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Bar Navigation & Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            to="/purchases"
            className="p-2 rounded-[10px] border border-[var(--line)] bg-[var(--card)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold text-[var(--ink)] tracking-tight flex items-center gap-2">
              <FileText className="h-5 w-5 text-[var(--purple)]" />
              <span>{t('newPurchaseTitle') || 'Create Purchase Order'}</span>
            </h1>
            <p className="text-xs text-[var(--ink-soft)] mt-0.5">
              {t('newPurchaseSubtitle') || 'Draft a purchase order to replenish inventory from a supplier'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            type="button"
            onClick={() => navigate('/purchases')}
            disabled={busy}
          >
            {t('cancel') || 'Cancel'}
          </Button>
          <Button variant="primary" type="submit" disabled={busy}>
            {busy ? (t('saving') || 'Saving…') : (t('createPurchaseBtn') || 'Save Purchase Order')}
          </Button>
        </div>
      </div>

      {formError ? <ErrorBanner message={formError} /> : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Procurement Workflow */}
        <div className="lg:col-span-2 space-y-6">
          {/* STEP 1: Supplier Selector & Summary Card */}
          <Card padded className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[var(--purple)]/15 text-[var(--purple)] text-xs flex items-center justify-center font-extrabold">
                  1
                </span>
                <Building2 className="h-4 w-4 text-[var(--purple)]" />
                <span>{t('purchaseSupplier') || 'Supplier'}</span>
              </h2>

              {selectedSupplier && (
                <button
                  type="button"
                  onClick={() => setIsSupplierDropdownOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--purple)] hover:text-[var(--purple-hover)] transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>{t('changeSupplier') || 'Change Supplier'}</span>
                </button>
              )}
            </div>

            {/* Supplier Combobox Search Input */}
            <div ref={supplierDropdownRef} className="relative">
              {!selectedSupplier || isSupplierDropdownOpen ? (
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute top-2.5 inset-inline-start-3 h-4 w-4 text-[var(--ink-soft)]" />
                    <input
                      type="text"
                      placeholder={
                        t('searchSupplierComboboxPlaceholder') ||
                        'Search supplier by name, city, contact or phone...'
                      }
                      value={supplierSearch}
                      onChange={(e) => {
                        setSupplierSearch(e.target.value)
                        setIsSupplierDropdownOpen(true)
                      }}
                      onFocus={() => setIsSupplierDropdownOpen(true)}
                      className="w-full rounded-[12px] border border-[var(--line)] bg-[var(--card)] px-9 py-2.5 text-xs text-[var(--ink)] placeholder-[var(--ink-soft)]/60 focus:border-[var(--purple)] focus:ring-2 focus:ring-[var(--purple)]/15 focus:outline-none"
                    />
                    {supplierSearch && (
                      <button
                        type="button"
                        onClick={() => setSupplierSearch('')}
                        className="absolute top-2.5 inset-inline-end-3 text-[var(--ink-soft)] hover:text-[var(--ink)] cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown Options List */}
                  {isSupplierDropdownOpen && (
                    <div className="absolute top-full inset-x-0 mt-1.5 z-30 max-h-72 overflow-y-auto rounded-[14px] border border-[var(--line)] bg-[var(--card)] shadow-2xl p-1.5 space-y-1">
                      {filteredSuppliers.length === 0 ? (
                        <div className="p-4 text-center text-xs text-[var(--ink-soft)]">
                          {t('noSuppliersFound') || 'No matching suppliers found'}
                        </div>
                      ) : (
                        filteredSuppliers.map((s) => {
                          const isSelected = String(s.id) === String(supplierId)
                          return (
                            <div
                              key={s.id}
                              onClick={() => handleSelectSupplier(s)}
                              className={`p-3 rounded-[10px] cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                                isSelected
                                  ? 'bg-[var(--purple)]/10 text-[var(--purple)] font-semibold'
                                  : 'hover:bg-[var(--bg)] text-[var(--ink)]'
                              }`}
                            >
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs truncate">{s.name}</span>
                                  {s.city && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg)] border border-[var(--line)] text-[var(--ink-soft)]">
                                      {s.city}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-[11px] text-[var(--ink-soft)] flex-wrap">
                                  {s.contactPerson && (
                                    <span className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {s.contactPerson}
                                    </span>
                                  )}
                                  {s.phone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {s.phone}
                                    </span>
                                  )}
                                  <span>
                                    {t('supplierMappedProductsCount', {
                                      count: s.productsCount || s._count?.products || 0,
                                    }) || `${s.productsCount || 0} books in catalog`}
                                  </span>
                                </div>
                              </div>

                              {isSelected && (
                                <Check className="h-4 w-4 text-[var(--purple)] shrink-0" />
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Unselected State Callout */}
            {!selectedSupplier && (
              <div className="p-4 rounded-[14px] bg-[var(--bg)] border border-dashed border-[var(--line)] flex items-start gap-3 text-xs text-[var(--ink-soft)]">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[var(--ink)]">
                    {t('noSupplierSelectedPrompt') ||
                      'Please select a supplier first to add books and view agreed purchase prices.'}
                  </p>
                  <p className="mt-0.5 text-[11px]">
                    {t('supplierSelectionRequiredSub') ||
                      'Selecting a supplier unlocks custom catalog rates, supplier SKUs, and minimum order quantities.'}
                  </p>
                </div>
              </div>
            )}

            {/* Selected Supplier Summary Card */}
            {selectedSupplier && !isSupplierDropdownOpen && (
              <div className="p-4 rounded-[14px] bg-gradient-to-br from-[var(--purple)]/5 via-[var(--bg)] to-transparent border border-[var(--purple)]/20 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-[var(--ink)]">{selectedSupplier.name}</h3>
                      <Badge kind="ok">{t('active') || 'Active'}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--ink-soft)] flex-wrap">
                      {selectedSupplier.contactPerson && (
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-[var(--purple)]" />
                          <span>{selectedSupplier.contactPerson}</span>
                        </span>
                      )}
                      {selectedSupplier.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-[var(--purple)]" />
                          <span>{selectedSupplier.city}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1 font-medium text-[var(--ink)]">
                        <Package className="h-3.5 w-3.5 text-[var(--purple)]" />
                        <span>
                          {t('supplierMappedProductsCount', {
                            count: supplierProducts.length,
                          }) || `${supplierProducts.length} books`}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Financial Balance */}
                  <div className="text-end">
                    <span className="block text-[10.5px] text-[var(--ink-soft)]">
                      {t('supplierCurrentBalance') || 'Outstanding Balance'}
                    </span>
                    <span className="text-xs font-bold font-mono text-[var(--ink)]">
                      {formatMoney(selectedSupplier.balance || 0, language)}
                    </span>
                  </div>
                </div>

                {/* Direct Communication Shortcuts */}
                <div className="pt-2 border-t border-[var(--line)] flex items-center gap-2 flex-wrap text-xs">
                  {selectedSupplier.phone && (
                    <a
                      href={`tel:${selectedSupplier.phone}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] bg-[var(--card)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--purple)] hover:text-[var(--purple)] transition-colors"
                    >
                      <Phone className="h-3 w-3" />
                      <span>{t('supplierQuickCall') || 'Call'}</span>
                    </a>
                  )}
                  {(selectedSupplier.whatsapp || selectedSupplier.phone) && (
                    <a
                      href={`https://wa.me/${cleanPhoneForWa(
                        selectedSupplier.whatsapp || selectedSupplier.phone
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] bg-[var(--card)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--green-badge)] hover:text-[var(--green-badge)] transition-colors"
                    >
                      <MessageCircle className="h-3 w-3" />
                      <span>{t('supplierQuickWhatsapp') || 'WhatsApp'}</span>
                    </a>
                  )}
                  {selectedSupplier.email && (
                    <a
                      href={`mailto:${selectedSupplier.email}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] bg-[var(--card)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--purple)] hover:text-[var(--purple)] transition-colors"
                    >
                      <Mail className="h-3 w-3" />
                      <span>{t('supplierQuickEmail') || 'Email'}</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* STEP 2: Add Books / Products Handling 3 Essential Cases */}
          <Card padded className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[var(--purple)]/15 text-[var(--purple)] text-xs flex items-center justify-center font-extrabold">
                  2
                </span>
                <Package className="h-4 w-4 text-[var(--purple)]" />
                <span>{t('purchaseItemsTitle') || 'Order Items'}</span>
              </h2>

              {selectedSupplier && (
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={handleOpenQuickCreateModal}
                  className="gap-1.5 text-xs text-[var(--purple)] border-[var(--purple)]/30 hover:bg-[var(--purple)]/10"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{t('quickCreateBookAction') || '+ New Unlisted Book'}</span>
                </Button>
              )}
            </div>

            {/* Book Search Combobox */}
            {selectedSupplier ? (
              <div ref={bookSearchRef} className="relative">
                <div className="relative">
                  <Search className="absolute top-2.5 inset-inline-start-3 h-4 w-4 text-[var(--ink-soft)]" />
                  <input
                    type="text"
                    placeholder={
                      t('searchBooksToAddPlaceholder') ||
                      'Search book by title, author, or category to add...'
                    }
                    value={bookSearch}
                    onChange={(e) => {
                      setBookSearch(e.target.value)
                      setIsBookSearchOpen(true)
                    }}
                    onFocus={() => setIsBookSearchOpen(true)}
                    className="w-full rounded-[12px] border border-[var(--line)] bg-[var(--card)] px-9 py-2.5 text-xs text-[var(--ink)] placeholder-[var(--ink-soft)]/60 focus:border-[var(--purple)] focus:ring-2 focus:ring-[var(--purple)]/15 focus:outline-none"
                  />
                  {bookSearch && (
                    <button
                      type="button"
                      onClick={() => setBookSearch('')}
                      className="absolute top-2.5 inset-inline-end-3 text-[var(--ink-soft)] hover:text-[var(--ink)] cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Dropdown Results list */}
                {isBookSearchOpen && (
                  <div className="absolute top-full inset-x-0 mt-1.5 z-30 max-h-80 overflow-y-auto rounded-[14px] border border-[var(--line)] bg-[var(--card)] shadow-2xl p-2 space-y-1.5">
                    {filteredBooks.length === 0 ? (
                      <div className="p-4 text-center space-y-2">
                        <p className="text-xs text-[var(--ink-soft)]">
                          {t('noBooksFoundMatch') || 'No matching books found'}
                        </p>
                        <Button
                          variant="primary"
                          size="sm"
                          type="button"
                          onClick={handleOpenQuickCreateModal}
                          className="mx-auto"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>{t('quickCreateBookAction') || '+ Create New Unlisted Book'}</span>
                        </Button>
                      </div>
                    ) : (
                      filteredBooks.map((book) => {
                        const mapping = supplierProducts.find((sp) => sp.productId === book.id)
                        const isLinked = Boolean(mapping)
                        const coverImg = getImageUrl(book.image)

                        return (
                          <div
                            key={book.id}
                            className="p-3 rounded-[12px] bg-[var(--bg)] border border-[var(--line)] hover:border-[var(--purple)]/40 transition-all flex items-center justify-between gap-3"
                          >
                            {/* Book Thumbnail & Info */}
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-14 rounded-[6px] overflow-hidden bg-[var(--card)] border border-[var(--line)] shrink-0 flex items-center justify-center">
                                {coverImg ? (
                                  <img
                                    src={coverImg}
                                    alt={book.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <BookOpen className="w-5 h-5 text-[var(--ink-soft)]/40" />
                                )}
                              </div>

                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-xs text-[var(--ink)] truncate max-w-[240px] sm:max-w-xs">
                                    {book.title}
                                  </h4>
                                  {book.category && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--card)] border border-[var(--line)] text-[var(--ink-soft)]">
                                      {book.category}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-[var(--ink-soft)]">
                                    {t('currentStockBadge', { count: book.currentStock || 0 }) ||
                                      `Stock: ${book.currentStock || 0}`}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 text-[11px] text-[var(--ink-soft)] flex-wrap">
                                  {book.author && <span>{book.author}</span>}
                                  {isLinked ? (
                                    <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[var(--green-badge)]">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>{t('linkedToSupplierBadge') || 'Linked to Supplier'}</span>
                                      {mapping.supplierSku && ` (SKU: ${mapping.supplierSku})`}
                                    </span>
                                  ) : (
                                    <span className="text-[10.5px] text-amber-600 font-medium">
                                      {t('notLinkedToSupplierBadge') || 'Not Linked to this Supplier'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Price & Action */}
                            <div className="flex items-center gap-3 shrink-0">
                              {isLinked ? (
                                <div className="text-end">
                                  <span className="block text-[10px] text-[var(--ink-soft)]">
                                    {t('agreedPurchasePriceLabel') || 'Agreed Cost'}
                                  </span>
                                  <span className="text-xs font-bold font-mono text-[var(--purple)]">
                                    {formatMoney(mapping.purchasePrice, language)}
                                  </span>
                                </div>
                              ) : (
                                <div className="text-end">
                                  <span className="block text-[10px] text-[var(--ink-soft)]">
                                    {t('sellingPriceLabel') || 'Retail Price'}
                                  </span>
                                  <span className="text-xs font-semibold font-mono text-[var(--ink)]">
                                    {formatMoney(book.price, language)}
                                  </span>
                                </div>
                              )}

                              {isLinked ? (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  type="button"
                                  onClick={() => handleAddLinkedBook(book, mapping)}
                                  className="h-8 px-3 text-xs"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>{t('addItemToPurchaseBtn') || 'Add'}</span>
                                </Button>
                              ) : (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  type="button"
                                  onClick={() => handleOpenLinkModal(book)}
                                  className="h-8 px-3 text-xs text-[var(--purple)] border-[var(--purple)]/30 hover:bg-[var(--purple)]/10"
                                >
                                  <LinkIcon className="w-3.5 h-3.5" />
                                  <span>{t('linkBookToSupplierAction') || 'Link'}</span>
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            ) : null}

            {/* Line Items Table */}
            {items.length === 0 ? (
              <div className="py-10 text-center rounded-[14px] bg-[var(--bg)] border border-dashed border-[var(--line)] space-y-2">
                <Package className="h-8 w-8 text-[var(--ink-soft)]/40 mx-auto" />
                <p className="text-xs text-[var(--ink-soft)] font-medium">
                  {t('noProductsMapped') || 'No items added to this purchase order yet'}
                </p>
                <p className="text-[11px] text-[var(--ink-soft)]/80">
                  {selectedSupplier
                    ? t('searchBooksToAddPlaceholder') || 'Use the search box above to add books.'
                    : t('noSupplierSelectedPrompt') || 'Please select a supplier first.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-[14px] border border-[var(--line)]">
                <table className="w-full text-xs text-start border-collapse">
                  <thead>
                    <tr className="bg-[var(--bg)] border-b border-[var(--line)] text-[var(--ink-soft)] text-[11px] font-semibold">
                      <th className="p-3 text-start">{t('productLabel') || 'Book / Product'}</th>
                      <th className="p-3 text-center">{t('expectedStockAfterReceive') || 'Stock Forecast'}</th>
                      <th className="p-3 text-center w-24">{t('quantityOrdered') || 'Quantity'}</th>
                      <th className="p-3 text-end w-28">{t('purchaseCostPerItem') || 'Unit Cost (MAD)'}</th>
                      <th className="p-3 text-end w-24">{t('discount') || 'Discount'}</th>
                      <th className="p-3 text-end w-28">{t('totalLabel') || 'Total'}</th>
                      <th className="p-3 text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)] bg-[var(--card)]">
                    {items.map((item) => {
                      const lineTotal = Math.max(
                        0,
                        (Number(item.quantityOrdered) || 0) * (Number(item.unitCost) || 0) -
                          (Number(item.discount) || 0)
                      )
                      const coverImg = getImageUrl(item.product?.image)
                      const currentStock = item.product?.currentStock || 0
                      const expectedStock = currentStock + (Number(item.quantityOrdered) || 0)
                      const isHighlighted = highlightedRowId === item.productId

                      return (
                        <tr
                          key={item.productId}
                          className={`transition-colors ${
                            isHighlighted
                              ? 'bg-[var(--purple)]/15 ring-2 ring-[var(--purple)]'
                              : 'hover:bg-[var(--bg)]/50'
                          }`}
                        >
                          {/* Product Info */}
                          <td className="p-3">
                            <div className="flex items-center gap-2.5 min-w-[180px]">
                              <div className="w-8 h-11 rounded-[4px] overflow-hidden bg-[var(--bg)] border border-[var(--line)] shrink-0 flex items-center justify-center">
                                {coverImg ? (
                                  <img
                                    src={coverImg}
                                    alt={item.product?.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <BookOpen className="w-4 h-4 text-[var(--ink-soft)]/40" />
                                )}
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <span className="font-bold text-xs text-[var(--ink)] block truncate max-w-[200px]">
                                  {item.product?.title || `Product #${item.productId}`}
                                </span>
                                <div className="flex items-center gap-1.5 text-[10.5px] text-[var(--ink-soft)]">
                                  {item.product?.author && <span>{item.product.author}</span>}
                                  {item.product?.category && (
                                    <span className="px-1.5 py-0.2 rounded bg-[var(--bg)] border border-[var(--line)]">
                                      {item.product.category}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Stock Forecast */}
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)]">
                              <span>{currentStock}</span>
                              <span className="text-[var(--ink-soft)]">→</span>
                              <span className="text-[var(--purple)] font-bold">{expectedStock}</span>
                            </span>
                          </td>

                          {/* Ordered Quantity */}
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={item.quantityOrdered}
                              onChange={(e) =>
                                handleItemQuantityChange(item.productId, e.target.value)
                              }
                              className="w-20 rounded-[8px] border border-[var(--line)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--ink)] font-mono text-center focus:border-[var(--purple)] focus:outline-none"
                              required
                            />
                          </td>

                          {/* Unit Cost */}
                          <td className="p-3 text-end">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitCost}
                              onChange={(e) => handleItemCostChange(item.productId, e.target.value)}
                              className="w-24 rounded-[8px] border border-[var(--line)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--ink)] font-mono text-end focus:border-[var(--purple)] focus:outline-none"
                              required
                            />
                          </td>

                          {/* Line Discount */}
                          <td className="p-3 text-end">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.discount}
                              onChange={(e) =>
                                handleItemDiscountChange(item.productId, e.target.value)
                              }
                              className="w-20 rounded-[8px] border border-[var(--line)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--ink)] font-mono text-end focus:border-[var(--purple)] focus:outline-none"
                            />
                          </td>

                          {/* Line Total */}
                          <td className="p-3 text-end font-bold font-mono text-xs text-[var(--ink)] tabular-nums">
                            {formatMoney(lineTotal, language)}
                          </td>

                          {/* Delete Action */}
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.productId)}
                              className="p-1.5 rounded-[8px] text-[var(--ink-soft)] hover:text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer"
                              title={t('delete') || 'Remove'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Dates, Status & Notes Card */}
          <Card padded className="space-y-4">
            <h2 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[var(--purple)]" />
              <span>{t('orderGeneralInfo') || 'General Information & Dates'}</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label={t('purchaseDate') || 'Purchase Date *'}
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
              />

              <Input
                label={t('expectedDate') || 'Expected Delivery Date'}
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />

              <Select
                label={t('purchaseStatus') || 'Initial Status'}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="DRAFT">{t('purchaseStatus_DRAFT') || 'Draft'}</option>
                <option value="ORDERED">{t('purchaseStatus_ORDERED') || 'Ordered'}</option>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5">
                {t('purchaseNotes') || 'Notes & Delivery Instructions'}
              </label>
              <Textarea
                placeholder="Payment terms, delivery carrier details, special warehouse notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </Card>
        </div>

        {/* Right Column (1 Col): Financial Cost Breakdown */}
        <div className="space-y-6">
          <Card padded className="space-y-4 sticky top-6">
            <h2 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-[var(--purple)]" />
              <span>{t('financialSummary') || 'Cost Summary'}</span>
            </h2>

            <div className="space-y-3 pt-2 text-xs">
              {/* Items Subtotal */}
              <div className="flex justify-between items-center">
                <span className="text-[var(--ink-soft)]">{t('purchaseSubtotal') || 'Items Subtotal'}:</span>
                <span className="font-semibold text-[var(--ink)] font-mono tabular-nums">
                  {formatMoney(subtotal, language)}
                </span>
              </div>

              {/* Shipping Cost */}
              <div className="flex justify-between items-center gap-3">
                <span className="text-[var(--ink-soft)] shrink-0">
                  {t('purchaseShipping') || 'Shipping / Transport'}:
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)}
                  className="w-28 rounded-[8px] border border-[var(--line)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--ink)] font-mono text-end focus:border-[var(--purple)] focus:outline-none"
                />
              </div>

              {/* Other Costs */}
              <div className="flex justify-between items-center gap-3">
                <span className="text-[var(--ink-soft)] shrink-0">
                  {t('purchaseOtherCosts') || 'Other Costs (MAD)'}:
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={otherCost}
                  onChange={(e) => setOtherCost(e.target.value)}
                  className="w-28 rounded-[8px] border border-[var(--line)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--ink)] font-mono text-end focus:border-[var(--purple)] focus:outline-none"
                />
              </div>

              {/* Discount Amount */}
              <div className="flex justify-between items-center gap-3">
                <span className="text-[var(--ink-soft)] shrink-0">
                  {t('purchaseDiscount') || 'Order Discount'}:
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="w-28 rounded-[8px] border border-[var(--line)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--ink)] font-mono text-end focus:border-[var(--purple)] focus:outline-none"
                />
              </div>

              {/* Grand Total */}
              <div className="border-t border-[var(--line)] pt-3 flex justify-between items-center">
                <span className="text-sm font-bold text-[var(--ink)]">
                  {t('purchaseGrandTotal') || 'Grand Total'}:
                </span>
                <span className="text-base font-extrabold text-[var(--purple)] font-mono tabular-nums">
                  {formatMoney(grandTotal, language)}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--line)]">
              <Button variant="primary" type="submit" className="w-full" disabled={busy}>
                {busy ? (t('saving') || 'Saving…') : (t('createPurchaseBtn') || 'Save Purchase Order')}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* --- MODAL 1: Switch Supplier Confirmation --- */}
      <Modal
        open={isSwitchSupplierModalOpen}
        onClose={() => setIsSwitchSupplierModalOpen(false)}
        title={t('changeSupplier') || 'Change Supplier'}
        width="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-[var(--ink)] leading-relaxed">
            {t('switchSupplierConfirm') ||
              'Changing supplier will re-evaluate current item costs. Continue?'}
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--line)]">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setIsSwitchSupplierModalOpen(false)}
            >
              {t('cancel') || 'Cancel'}
            </Button>
            <Button variant="primary" type="button" onClick={handleConfirmSwitchSupplier}>
              {t('confirm') || 'Confirm Switch'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* --- MODAL 2: Link Existing Book to Supplier (Case B) --- */}
      <Modal
        open={isLinkBookModalOpen}
        onClose={() => setIsLinkBookModalOpen(false)}
        title={t('linkBookModalTitle') || 'Link Book to Supplier Catalog'}
        width="max-w-lg"
      >
        <form onSubmit={handleSaveLinkBook} className="space-y-4">
          {linkBookError && <ErrorBanner message={linkBookError} />}

          {/* Book Header Summary */}
          {linkBookTarget && (
            <div className="p-3 rounded-[12px] bg-[var(--bg)] border border-[var(--line)] flex items-center gap-3">
              <div className="w-9 h-12 rounded-[4px] overflow-hidden bg-[var(--card)] border border-[var(--line)] shrink-0 flex items-center justify-center">
                {getImageUrl(linkBookTarget.image) ? (
                  <img
                    src={getImageUrl(linkBookTarget.image)}
                    alt={linkBookTarget.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BookOpen className="w-4 h-4 text-[var(--ink-soft)]/40" />
                )}
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <h4 className="font-bold text-xs text-[var(--ink)] truncate">
                  {linkBookTarget.title}
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-[var(--ink-soft)]">
                  {linkBookTarget.author && <span>{linkBookTarget.author}</span>}
                  <span>•</span>
                  <span>
                    {t('sellingPriceLabel') || 'Retail Price'}:{' '}
                    <strong className="font-mono text-[var(--ink)]">
                      {formatMoney(linkBookTarget.price, language)}
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={(t('agreedPurchasePriceLabel') || 'Agreed Purchase Price (MAD)') + ' *'}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={linkBookForm.purchasePrice}
              onChange={(e) =>
                setLinkBookForm((prev) => ({ ...prev, purchasePrice: e.target.value }))
              }
              required
            />

            <Input
              label={t('moqLabel') || 'Minimum Order Qty (MOQ)'}
              type="number"
              min="1"
              step="1"
              placeholder="1"
              value={linkBookForm.minimumOrderQuantity}
              onChange={(e) =>
                setLinkBookForm((prev) => ({ ...prev, minimumOrderQuantity: e.target.value }))
              }
            />

            <Input
              label={t('supplierSkuLabel') || 'Supplier SKU / Reference'}
              type="text"
              placeholder="e.g. DAR-1029"
              value={linkBookForm.supplierSku}
              onChange={(e) =>
                setLinkBookForm((prev) => ({ ...prev, supplierSku: e.target.value }))
              }
            />

            <Input
              label={t('notesLabel') || 'Notes'}
              type="text"
              placeholder="Edition, discounts, terms..."
              value={linkBookForm.notes}
              onChange={(e) =>
                setLinkBookForm((prev) => ({ ...prev, notes: e.target.value }))
              }
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--line)]">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setIsLinkBookModalOpen(false)}
              disabled={linkBookBusy}
            >
              {t('cancel') || 'Cancel'}
            </Button>
            <Button variant="primary" type="submit" disabled={linkBookBusy}>
              {linkBookBusy
                ? (t('saving') || 'Saving…')
                : (t('linkBookToSupplierAction') || 'Link & Add to Order')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 3: Quick Create Unlisted Book & Link (Case C) --- */}
      <Modal
        open={isQuickCreateModalOpen}
        onClose={() => setIsQuickCreateModalOpen(false)}
        title={t('quickCreateBookTitle') || 'Create New Book & Add to Order'}
        width="max-w-lg"
      >
        <form onSubmit={handleSaveQuickCreateBook} className="space-y-4">
          {quickCreateError && <ErrorBanner message={quickCreateError} />}

          {/* Initial Stock Note */}
          <div className="p-3 rounded-[10px] bg-[var(--purple)]/10 border border-[var(--purple)]/20 text-xs text-[var(--purple)] flex items-start gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              {t('supplierBookInitialStockNote') ||
                'Note: The book will be created with an initial stock of 0. Quantities are added only via purchase orders and receiving.'}
            </span>
          </div>

          <div className="space-y-3">
            <Input
              label={(t('bookTitleLabelRequired') || 'Book Title') + ' *'}
              type="text"
              placeholder="e.g. تفسير القرآن العظيم"
              value={quickCreateForm.title}
              onChange={(e) =>
                setQuickCreateForm((prev) => ({ ...prev, title: e.target.value }))
              }
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label={t('authorLabel') || 'Author'}
                type="text"
                placeholder="e.g. ابن كثير"
                value={quickCreateForm.author}
                onChange={(e) =>
                  setQuickCreateForm((prev) => ({ ...prev, author: e.target.value }))
                }
              />

              <div>
                <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5">
                  {(t('categoryLabelRequired') || 'Category') + ' *'}
                </label>
                <select
                  value={quickCreateForm.categoryId}
                  onChange={(e) =>
                    setQuickCreateForm((prev) => ({ ...prev, categoryId: e.target.value }))
                  }
                  className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--ink)] focus:border-[var(--purple)] focus:outline-none"
                  required
                >
                  <option value="">{t('selectCategory') || '-- Select Category --'}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label={(t('retailPriceLabel') || 'Retail Selling Price (MAD)') + ' *'}
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={quickCreateForm.price}
                onChange={(e) =>
                  setQuickCreateForm((prev) => ({ ...prev, price: e.target.value }))
                }
                required
              />

              <Input
                label={(t('agreedPurchasePriceLabel') || 'Agreed Purchase Price (MAD)') + ' *'}
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={quickCreateForm.purchasePrice}
                onChange={(e) =>
                  setQuickCreateForm((prev) => ({ ...prev, purchasePrice: e.target.value }))
                }
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label={t('moqLabel') || 'Minimum Order Qty (MOQ)'}
                type="number"
                min="1"
                step="1"
                placeholder="1"
                value={quickCreateForm.minimumOrderQuantity}
                onChange={(e) =>
                  setQuickCreateForm((prev) => ({ ...prev, minimumOrderQuantity: e.target.value }))
                }
              />

              <Input
                label={t('supplierSkuLabel') || 'Supplier SKU'}
                type="text"
                placeholder="e.g. REF-2024"
                value={quickCreateForm.supplierSku}
                onChange={(e) =>
                  setQuickCreateForm((prev) => ({ ...prev, supplierSku: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--line)]">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setIsQuickCreateModalOpen(false)}
              disabled={quickCreateBusy}
            >
              {t('cancel') || 'Cancel'}
            </Button>
            <Button variant="primary" type="submit" disabled={quickCreateBusy}>
              {quickCreateBusy
                ? (t('saving') || 'Saving…')
                : (t('save') || 'Create & Add to Order')}
            </Button>
          </div>
        </form>
      </Modal>
    </form>
  )
}
