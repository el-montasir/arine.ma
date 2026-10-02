import { useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  Receipt,
  RotateCcw,
  Package,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Coins,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  ExternalLink,
} from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { api } from '../lib/api.js'
import { formatMoney, formatDateTime, formatNumber } from '../lib/format.js'
import { PageHeader, Card, StatCard } from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import Modal from '../components/ui/Modal.jsx'
import Button from '../components/ui/Button.jsx'
import { Input, Select, Textarea } from '../components/ui/Input.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function SupplierDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, language } = useLanguage()
  const { can, isOwner } = useAuth()

  const canManageSuppliers = isOwner || can('SUPPLIERS_MANAGE')
  const canManagePurchases = isOwner || can('PURCHASES_MANAGE')
  const canManagePayments = isOwner || can('PAYMENTS_MANAGE')

  const { data: responseData, loading, error, reload } = useFetch(`/suppliers/${id}`)
  const supplier = responseData?.data || responseData

  const [activeTab, setActiveTab] = useState('products') // 'products' | 'purchases' | 'payments' | 'returns'

  // Modals state
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isAddProductOpen, setIsAddProductOpen] = useState(false)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [deleteProductTarget, setDeleteProductTarget] = useState(null)

  // Edit Supplier Form
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    taxNumber: '',
    paymentTerms: '',
    notes: '',
    status: 'ACTIVE',
  })

  // Add Product Form
  const [productForm, setProductForm] = useState({
    productId: '',
    purchasePrice: '',
    supplierSku: '',
    minOrderQuantity: '',
    leadTimeDays: '',
    notes: '',
  })

  // Payment Form
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'CASH',
    reference: '',
    paymentDate: new Date().toISOString().split('T')[0],
    note: '',
  })

  // Products fetch for dropdown
  const { data: catalogData } = useFetch('/products?limit=500')
  const allProducts = Array.isArray(catalogData) ? catalogData : catalogData?.data || []

  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [toastMessage, setToastMessage] = useState(null)

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  const handleOpenEdit = () => {
    if (!supplier) return
    setSupplierForm({
      name: supplier.name || '',
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      taxNumber: supplier.taxNumber || '',
      paymentTerms: supplier.paymentTerms || '',
      notes: supplier.notes || '',
      status: supplier.status || 'ACTIVE',
    })
    setFormError('')
    setIsEditOpen(true)
  }

  const handleSaveSupplier = async (e) => {
    e.preventDefault()
    setBusy(true)
    setFormError('')
    try {
      await api.put(`/suppliers/${id}`, supplierForm)
      showToast(t('supplierUpdatedSuccess') || 'Supplier updated successfully')
      setIsEditOpen(false)
      reload()
    } catch (err) {
      setFormError(err.message || 'Failed to update supplier')
    } finally {
      setBusy(false)
    }
  }

  const handleAddProduct = async (e) => {
    e.preventDefault()
    if (!productForm.productId) {
      setFormError('Please select a product')
      return
    }
    if (!productForm.purchasePrice || Number(productForm.purchasePrice) < 0) {
      setFormError('Valid purchase price is required')
      return
    }

    setBusy(true)
    setFormError('')
    try {
      await api.post(`/suppliers/${id}/products`, {
        productId: Number(productForm.productId),
        purchasePrice: Number(productForm.purchasePrice),
        supplierSku: productForm.supplierSku || undefined,
        minOrderQuantity: productForm.minOrderQuantity ? Number(productForm.minOrderQuantity) : undefined,
        leadTimeDays: productForm.leadTimeDays ? Number(productForm.leadTimeDays) : undefined,
        notes: productForm.notes || undefined,
      })
      showToast(t('productAddedSuccess') || 'Product mapped to supplier successfully')
      setIsAddProductOpen(false)
      setProductForm({
        productId: '',
        purchasePrice: '',
        supplierSku: '',
        minOrderQuantity: '',
        leadTimeDays: '',
        notes: '',
      })
      reload()
    } catch (err) {
      setFormError(err.message || 'Failed to link product')
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteProduct = async () => {
    if (!deleteProductTarget) return
    setBusy(true)
    try {
      await api.del(`/suppliers/${id}/products/${deleteProductTarget.productId}`)
      showToast(t('productDeletedSuccess') || 'Product unlinked from supplier')
      setDeleteProductTarget(null)
      reload()
    } catch (err) {
      showToast(err.message || 'Failed to unlink product', 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleRecordPayment = async (e) => {
    e.preventDefault()
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      setFormError('Valid payment amount is required')
      return
    }

    setBusy(true)
    setFormError('')
    try {
      await api.post('/payments', {
        supplierId: Number(id),
        amount: Number(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        reference: paymentForm.reference || undefined,
        paymentDate: paymentForm.paymentDate ? new Date(paymentForm.paymentDate).toISOString() : new Date().toISOString(),
        note: paymentForm.note || undefined,
      })
      showToast(t('paymentSavedSuccess') || 'Payment recorded successfully')
      setIsPaymentOpen(false)
      setPaymentForm({
        amount: '',
        paymentMethod: 'CASH',
        reference: '',
        paymentDate: new Date().toISOString().split('T')[0],
        note: '',
      })
      reload()
    } catch (err) {
      setFormError(err.message || 'Failed to record payment')
    } finally {
      setBusy(false)
    }
  }

  if (loading && !supplier) {
    return (
      <div className="flex justify-center items-center py-24">
        <Spinner label={t('loadingData') || 'Loading supplier details...'} />
      </div>
    )
  }

  if (error || !supplier) {
    return (
      <div className="space-y-4">
        <ErrorBanner message={error || 'Supplier not found'} />
        <Button variant="secondary" onClick={() => navigate('/suppliers')}>
          <ArrowLeft className="h-4 w-4" /> {t('backToSuppliers') || 'Back to Suppliers'}
        </Button>
      </div>
    )
  }

  const supplierProducts = supplier.supplierProducts || []
  const purchases = supplier.purchases || []
  const payments = supplier.payments || []
  const returns = supplier.returns || []

  const balance = Number(supplier.currentBalance || 0)

  // Columns for Products Table
  const productColumns = [
    {
      key: 'product',
      label: t('productLabel') || 'Product',
      render: (sp) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[8px] bg-[var(--bg)] border border-[var(--line)] flex items-center justify-center shrink-0 overflow-hidden">
            {sp.product?.thumbnailUrl ? (
              <img src={sp.product.thumbnailUrl} alt={sp.product?.title} className="w-full h-full object-cover" />
            ) : (
              <Package className="h-4 w-4 text-[var(--ink-soft)]" />
            )}
          </div>
          <div className="min-w-0">
            <Link
              to={`/products/${sp.productId}/edit`}
              className="font-bold text-[var(--ink)] hover:text-[var(--purple)] transition-colors line-clamp-1 text-xs"
            >
              {sp.product?.title || `Product #${sp.productId}`}
            </Link>
            <div className="text-[11px] text-[var(--ink-soft)] flex items-center gap-1.5 mt-0.5">
              <span>SKU: {sp.product?.sku || '—'}</span>
              {sp.supplierSku ? <span className="font-mono">({sp.supplierSku})</span> : null}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'stock',
      label: t('currentStockLabel') || 'Stock',
      render: (sp) => (
        <span className="text-xs font-semibold text-[var(--ink)] tabular-nums">
          {formatNumber(sp.product?.currentStock ?? 0)}
        </span>
      ),
    },
    {
      key: 'purchasePrice',
      label: t('purchaseCostPerItem') || 'Purchase Price',
      render: (sp) => (
        <span className="text-xs font-bold text-[var(--ink)] tabular-nums">
          {formatMoney(sp.purchasePrice || 0, language)}
        </span>
      ),
    },
    {
      key: 'sellingPrice',
      label: t('sellingPriceLabel') || 'Selling Price',
      render: (sp) => (
        <span className="text-xs text-[var(--ink-soft)] tabular-nums">
          {formatMoney(sp.product?.regularPrice || sp.product?.price || 0, language)}
        </span>
      ),
    },
    {
      key: 'minOrderQuantity',
      label: t('supplierMoq') || 'MOQ',
      render: (sp) => (
        <span className="text-xs text-[var(--ink-soft)] tabular-nums">
          {sp.minOrderQuantity ? formatNumber(sp.minOrderQuantity) : '—'}
        </span>
      ),
    },
    {
      key: 'leadTime',
      label: t('supplierLeadTime') || 'Lead Time',
      render: (sp) => (
        <span className="text-xs text-[var(--ink-soft)]">
          {sp.leadTimeDays ? `${sp.leadTimeDays} ${t('days') || 'days'}` : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      className: 'text-end',
      render: (sp) =>
        canManageSuppliers ? (
          <button
            onClick={() => setDeleteProductTarget(sp)}
            className="p-1.5 rounded-[8px] text-[var(--red)] hover:bg-[var(--red-bg)] transition-colors cursor-pointer"
            title={t('delete') || 'Delete'}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null,
    },
  ]

  // Columns for Purchases Table
  const purchaseColumns = [
    {
      key: 'purchaseNumber',
      label: t('purchaseNumber') || 'PO Number',
      render: (p) => (
        <Link
          to={`/purchases/${p.id}`}
          className="font-bold text-[var(--purple)] hover:underline flex items-center gap-1.5 text-xs"
        >
          <FileText className="h-3.5 w-3.5 shrink-0" />
          <span>{p.purchaseNumber}</span>
        </Link>
      ),
    },
    {
      key: 'date',
      label: t('purchaseDate') || 'Date',
      render: (p) => (
        <span className="text-xs text-[var(--ink)]">
          {formatDateTime(p.purchaseDate || p.createdAt, language)}
        </span>
      ),
    },
    {
      key: 'itemsCount',
      label: t('itemsLabel') || 'Items',
      render: (p) => (
        <span className="text-xs text-[var(--ink-soft)] font-medium">
          {p.items?.length || 0} {t('productsLabel') || 'items'}
        </span>
      ),
    },
    {
      key: 'grandTotal',
      label: t('grandTotal') || 'Total',
      render: (p) => (
        <span className="text-xs font-bold text-[var(--ink)] tabular-nums">
          {formatMoney(p.grandTotal || 0, language)}
        </span>
      ),
    },
    {
      key: 'paid',
      label: t('paidLabel') || 'Paid',
      render: (p) => (
        <span className="text-xs font-semibold text-[var(--ink-soft)] tabular-nums">
          {formatMoney(p.amountPaid || 0, language)}
        </span>
      ),
    },
    {
      key: 'status',
      label: t('purchaseStatus') || 'Status',
      render: (p) => {
        let kind = 'neutral'
        if (p.status === 'RECEIVED') kind = 'ok'
        else if (p.status === 'PARTIALLY_RECEIVED') kind = 'shipping'
        else if (p.status === 'ORDERED') kind = 'pending'
        else if (p.status === 'CANCELLED') kind = 'neutral'
        return <Badge kind={kind}>{p.status}</Badge>
      },
    },
  ]

  // Columns for Payments Table
  const paymentColumns = [
    {
      key: 'date',
      label: t('paymentDate') || 'Payment Date',
      render: (pay) => (
        <span className="text-xs font-semibold text-[var(--ink)]">
          {formatDateTime(pay.paymentDate || pay.createdAt, language)}
        </span>
      ),
    },
    {
      key: 'amount',
      label: t('paymentAmount') || 'Amount',
      render: (pay) => (
        <span className="text-xs font-bold text-[var(--green)] tabular-nums">
          {formatMoney(pay.amount || 0, language)}
        </span>
      ),
    },
    {
      key: 'method',
      label: t('paymentMethod') || 'Method',
      render: (pay) => (
        <Badge kind="neutral">
          {pay.paymentMethod ? pay.paymentMethod.replace('_', ' ') : 'CASH'}
        </Badge>
      ),
    },
    {
      key: 'reference',
      label: t('paymentReference') || 'Reference',
      render: (pay) => (
        <span className="text-xs font-mono text-[var(--ink-soft)]">
          {pay.reference || '—'}
        </span>
      ),
    },
    {
      key: 'purchase',
      label: t('purchaseNumber') || 'Linked Purchase',
      render: (pay) =>
        pay.purchase ? (
          <Link
            to={`/purchases/${pay.purchase.id}`}
            className="text-xs font-medium text-[var(--purple)] hover:underline"
          >
            {pay.purchase.purchaseNumber}
          </Link>
        ) : (
          <span className="text-xs text-[var(--ink-soft)]">{t('supplierAccountPayment') || 'General Balance'}</span>
        ),
    },
    {
      key: 'creator',
      label: t('recordedBy') || 'Recorded By',
      render: (pay) => (
        <span className="text-xs text-[var(--ink-soft)]">
          {pay.createdByUser?.fullName || pay.createdByUser?.email || '—'}
        </span>
      ),
    },
  ]

  // Columns for Returns Table
  const returnColumns = [
    {
      key: 'returnNumber',
      label: t('returnNumber') || 'Return Number',
      render: (ret) => (
        <Link
          to={`/purchase-returns/${ret.id}`}
          className="font-bold text-[var(--purple)] hover:underline flex items-center gap-1.5 text-xs"
        >
          <RotateCcw className="h-3.5 w-3.5 shrink-0" />
          <span>{ret.returnNumber}</span>
        </Link>
      ),
    },
    {
      key: 'date',
      label: t('returnDate') || 'Date',
      render: (ret) => (
        <span className="text-xs text-[var(--ink)]">
          {formatDateTime(ret.returnDate || ret.createdAt, language)}
        </span>
      ),
    },
    {
      key: 'totalAmount',
      label: t('grandTotal') || 'Amount Credited',
      render: (ret) => (
        <span className="text-xs font-bold text-[var(--ink)] tabular-nums">
          {formatMoney(ret.totalAmount || 0, language)}
        </span>
      ),
    },
    {
      key: 'status',
      label: t('returnStatus') || 'Status',
      render: (ret) => (
        <Badge kind={ret.status === 'CONFIRMED' ? 'ok' : ret.status === 'DRAFT' ? 'pending' : 'neutral'}>
          {ret.status}
        </Badge>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage ? (
        <div
          className={`fixed bottom-5 end-5 z-50 flex items-center gap-2 px-4 py-3 rounded-[12px] shadow-lg text-xs font-semibold text-white transition-all ${
            toastMessage.type === 'error' ? 'bg-[var(--red)]' : 'bg-[var(--green)]'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>{toastMessage.message}</span>
        </div>
      ) : null}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/suppliers"
            className="p-2 rounded-[10px] border border-[var(--line)] bg-[var(--card)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-extrabold text-[var(--ink)] tracking-tight flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[var(--purple)]" />
                <span>{supplier.name}</span>
              </h1>
              <Badge kind={supplier.status === 'ACTIVE' ? 'ok' : 'neutral'}>
                {supplier.status === 'ACTIVE' ? t('supplierActive') || 'Active' : t('supplierInactive') || 'Inactive'}
              </Badge>
            </div>
            {supplier.contactPerson ? (
              <p className="text-xs text-[var(--ink-soft)] mt-0.5 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                <span>{supplier.contactPerson}</span>
              </p>
            ) : null}
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {canManageSuppliers ? (
            <Button variant="secondary" onClick={handleOpenEdit}>
              <Pencil className="h-4 w-4" />
              {t('editSupplierBtn') || 'Edit Info'}
            </Button>
          ) : null}

          {canManagePayments ? (
            <Button variant="secondary" onClick={() => setIsPaymentOpen(true)}>
              <Coins className="h-4 w-4 text-[var(--green)]" />
              {t('recordPaymentBtn') || 'Record Payment'}
            </Button>
          ) : null}

          {canManagePurchases ? (
            <Button variant="primary" onClick={() => navigate(`/purchases/new?supplierId=${supplier.id}`)}>
              <Plus className="h-4 w-4" />
              {t('newPurchaseBtn') || 'New Purchase Order'}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('supplierCurrentBalance') || 'Outstanding Balance'}
          value={formatMoney(balance, language)}
          tone={balance > 0 ? 'danger' : 'ok'}
          icon={Coins}
        />
        <StatCard
          label={t('supplierTotalPurchases') || 'Total Purchases'}
          value={formatMoney(supplier.totalPurchases || 0, language)}
          tone="brand"
          icon={Receipt}
        />
        <StatCard
          label={t('supplierTotalPaid') || 'Total Paid'}
          value={formatMoney(supplier.totalPaid || 0, language)}
          tone="ok"
          icon={CreditCard}
        />
        <StatCard
          label={t('supplierProductsCount') || 'Mapped Products'}
          value={formatNumber(supplierProducts.length)}
          tone="default"
          icon={Package}
        />
      </div>

      {/* Supplier Profile Info Card */}
      <Card padded className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-[var(--ink-soft)] uppercase tracking-wider">
            {t('contactInfo') || 'Contact Information'}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[var(--ink)]">
              <Phone className="h-3.5 w-3.5 text-[var(--ink-soft)] shrink-0" />
              <span className="font-mono" dir="ltr">{supplier.phone || '—'}</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--ink)]">
              <Mail className="h-3.5 w-3.5 text-[var(--ink-soft)] shrink-0" />
              <span>{supplier.email || '—'}</span>
            </div>
            <div className="flex items-start gap-2 text-[var(--ink)]">
              <MapPin className="h-3.5 w-3.5 text-[var(--ink-soft)] shrink-0 mt-0.5" />
              <span>{supplier.address || '—'}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-[11px] font-bold text-[var(--ink-soft)] uppercase tracking-wider">
            {t('businessTerms') || 'Business & Tax'}
          </div>
          <div className="space-y-1.5">
            <div>
              <span className="text-[var(--ink-soft)]">{t('supplierTaxNumber') || 'Tax ID / ICE'}: </span>
              <span className="font-semibold text-[var(--ink)]">{supplier.taxNumber || '—'}</span>
            </div>
            <div>
              <span className="text-[var(--ink-soft)]">{t('supplierPaymentTerms') || 'Terms'}: </span>
              <span className="font-semibold text-[var(--ink)]">{supplier.paymentTerms || 'Standard'}</span>
            </div>
            <div>
              <span className="text-[var(--ink-soft)]">{t('createdAt') || 'Joined'}: </span>
              <span className="text-[var(--ink)]">{formatDateTime(supplier.createdAt, language)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-[11px] font-bold text-[var(--ink-soft)] uppercase tracking-wider">
            {t('supplierNotes') || 'Internal Notes'}
          </div>
          <p className="text-[var(--ink-soft)] italic whitespace-pre-wrap leading-relaxed">
            {supplier.notes || t('noNotesAdded') || 'No internal notes added.'}
          </p>
        </div>
      </Card>

      {/* Tabs Layout */}
      <div className="space-y-4">
        <div className="flex items-center gap-1.5 border-b border-[var(--line)] overflow-x-auto pb-0.5">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'products'
                ? 'border-[var(--purple)] text-[var(--purple)]'
                : 'border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)]'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>{t('supplierProductsTitle') || 'Products Catalog'} ({supplierProducts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('purchases')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'purchases'
                ? 'border-[var(--purple)] text-[var(--purple)]'
                : 'border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)]'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>{t('navPurchases') || 'Purchase Orders'} ({purchases.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'payments'
                ? 'border-[var(--purple)] text-[var(--purple)]'
                : 'border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)]'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>{t('navPayments') || 'Payments History'} ({payments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('returns')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'returns'
                ? 'border-[var(--purple)] text-[var(--purple)]'
                : 'border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)]'
            }`}
          >
            <RotateCcw className="h-4 w-4" />
            <span>{t('navPurchaseReturns') || 'Returns'} ({returns.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'products' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--ink)]">
                {t('supplierProductsTitle') || 'Supplier Negotiated Products'}
              </h2>
              {canManageSuppliers ? (
                <Button variant="primary" onClick={() => setIsAddProductOpen(true)}>
                  <Plus className="h-4 w-4" />
                  {t('supplierAddProductBtn') || 'Map Product'}
                </Button>
              ) : null}
            </div>

            <Card padded={false}>
              <Table
                columns={productColumns}
                rows={supplierProducts}
                rowKey={(sp) => `${sp.supplierId}-${sp.productId}`}
                empty={t('noProductsMapped') || 'No products mapped to this supplier yet.'}
              />
            </Card>
          </div>
        ) : null}

        {activeTab === 'purchases' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--ink)]">
                {t('navPurchases') || 'Purchase Orders'}
              </h2>
              {canManagePurchases ? (
                <Button variant="primary" onClick={() => navigate(`/purchases/new?supplierId=${supplier.id}`)}>
                  <Plus className="h-4 w-4" />
                  {t('newPurchaseBtn') || 'New Purchase'}
                </Button>
              ) : null}
            </div>

            <Card padded={false}>
              <Table
                columns={purchaseColumns}
                rows={purchases}
                rowKey={(p) => p.id}
                empty={t('noPurchasesFound') || 'No purchase orders recorded yet.'}
              />
            </Card>
          </div>
        ) : null}

        {activeTab === 'payments' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--ink)]">
                {t('navPayments') || 'Supplier Payments'}
              </h2>
              {canManagePayments ? (
                <Button variant="primary" onClick={() => setIsPaymentOpen(true)}>
                  <Coins className="h-4 w-4" />
                  {t('recordPaymentBtn') || 'Record Payment'}
                </Button>
              ) : null}
            </div>

            <Card padded={false}>
              <Table
                columns={paymentColumns}
                rows={payments}
                rowKey={(pay) => pay.id}
                empty={t('noPaymentsFound') || 'No payments recorded yet.'}
              />
            </Card>
          </div>
        ) : null}

        {activeTab === 'returns' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--ink)]">
                {t('navPurchaseReturns') || 'Purchase Returns'}
              </h2>
            </div>

            <Card padded={false}>
              <Table
                columns={returnColumns}
                rows={returns}
                rowKey={(ret) => ret.id}
                empty={t('noReturnsFound') || 'No purchase returns recorded yet.'}
              />
            </Card>
          </div>
        ) : null}
      </div>

      {/* Edit Supplier Modal */}
      <Modal
        open={isEditOpen}
        onClose={() => !busy && setIsEditOpen(false)}
        title={t('editSupplierBtn') || 'Edit Supplier'}
        width="max-w-xl"
      >
        <form onSubmit={handleSaveSupplier} className="space-y-4">
          {formError ? <ErrorBanner message={formError} /> : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input
                label={t('supplierName') || 'Supplier Name *'}
                value={supplierForm.name}
                onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                required
              />
            </div>

            <Input
              label={t('supplierContactPerson') || 'Contact Person'}
              value={supplierForm.contactPerson}
              onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
            />

            <Input
              label={t('supplierPhone') || 'Phone'}
              value={supplierForm.phone}
              onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
              dir="ltr"
            />

            <Input
              label={t('supplierEmail') || 'Email'}
              type="email"
              value={supplierForm.email}
              onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
            />

            <Input
              label={t('supplierTaxNumber') || 'Tax ID / ICE'}
              value={supplierForm.taxNumber}
              onChange={(e) => setSupplierForm({ ...supplierForm, taxNumber: e.target.value })}
            />

            <div className="sm:col-span-2">
              <Input
                label={t('supplierAddress') || 'Address'}
                value={supplierForm.address}
                onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
              />
            </div>

            <Input
              label={t('supplierPaymentTerms') || 'Payment Terms'}
              value={supplierForm.paymentTerms}
              onChange={(e) => setSupplierForm({ ...supplierForm, paymentTerms: e.target.value })}
            />

            <Select
              label={t('supplierStatus') || 'Status'}
              value={supplierForm.status}
              onChange={(e) => setSupplierForm({ ...supplierForm, status: e.target.value })}
            >
              <option value="ACTIVE">{t('supplierActive') || 'Active'}</option>
              <option value="INACTIVE">{t('supplierInactive') || 'Inactive'}</option>
            </Select>

            <div className="sm:col-span-2">
              <Textarea
                label={t('supplierNotes') || 'Internal Notes'}
                value={supplierForm.notes}
                onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--line)]">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setIsEditOpen(false)}
              disabled={busy}
            >
              {t('cancel') || 'Cancel'}
            </Button>
            <Button variant="primary" type="submit" disabled={busy}>
              {busy ? (t('saving') || 'Saving…') : (t('save') || 'Save')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add / Map Product Modal */}
      <Modal
        open={isAddProductOpen}
        onClose={() => !busy && setIsAddProductOpen(false)}
        title={t('supplierAddProductBtn') || 'Map Product to Supplier'}
        width="max-w-lg"
      >
        <form onSubmit={handleAddProduct} className="space-y-4">
          {formError ? <ErrorBanner message={formError} /> : null}

          <div>
            <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5">
              {t('productLabel') || 'Select Product *'}
            </label>
            <select
              value={productForm.productId}
              onChange={(e) => {
                const prodId = e.target.value
                const selected = allProducts.find((p) => p.id === Number(prodId))
                setProductForm({
                  ...productForm,
                  productId: prodId,
                  purchasePrice: selected?.costPrice ?? selected?.regularPrice ?? '',
                })
              }}
              className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--ink)] focus:border-[var(--purple)] focus:outline-none"
              required
            >
              <option value="">{t('selectProductPrompt') || '— Select a product —'}</option>
              {allProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.sku ? `SKU: ${p.sku}` : `ID: ${p.id}`})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t('purchaseCostPerItem') || 'Purchase Price (MAD) *'}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={productForm.purchasePrice}
              onChange={(e) => setProductForm({ ...productForm, purchasePrice: e.target.value })}
              required
            />

            <Input
              label={t('supplierSku') || 'Supplier Item Code / SKU'}
              placeholder="e.g. SUP-1002"
              value={productForm.supplierSku}
              onChange={(e) => setProductForm({ ...productForm, supplierSku: e.target.value })}
            />

            <Input
              label={t('supplierMoq') || 'Min Order Quantity (MOQ)'}
              type="number"
              min="1"
              placeholder="e.g. 10"
              value={productForm.minOrderQuantity}
              onChange={(e) => setProductForm({ ...productForm, minOrderQuantity: e.target.value })}
            />

            <Input
              label={t('supplierLeadTime') || 'Lead Time (Days)'}
              type="number"
              min="0"
              placeholder="e.g. 7"
              value={productForm.leadTimeDays}
              onChange={(e) => setProductForm({ ...productForm, leadTimeDays: e.target.value })}
            />
          </div>

          <Textarea
            label={t('notesLabel') || 'Notes'}
            placeholder="Special packing or quality agreements..."
            value={productForm.notes}
            onChange={(e) => setProductForm({ ...productForm, notes: e.target.value })}
            rows={2}
          />

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--line)]">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setIsAddProductOpen(false)}
              disabled={busy}
            >
              {t('cancel') || 'Cancel'}
            </Button>
            <Button variant="primary" type="submit" disabled={busy}>
              {busy ? (t('saving') || 'Saving…') : (t('save') || 'Save')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        open={isPaymentOpen}
        onClose={() => !busy && setIsPaymentOpen(false)}
        title={t('recordPaymentBtn') || 'Record Supplier Payment'}
        width="max-w-md"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          {formError ? <ErrorBanner message={formError} /> : null}

          <div className="p-3 rounded-[10px] bg-[var(--bg)] border border-[var(--line)] text-xs flex justify-between items-center">
            <span className="text-[var(--ink-soft)]">{t('supplierCurrentBalance') || 'Current Balance'}:</span>
            <span className={`font-bold tabular-nums ${balance > 0 ? 'text-[var(--red)]' : 'text-[var(--green)]'}`}>
              {formatMoney(balance, language)}
            </span>
          </div>

          <Input
            label={t('paymentAmount') || 'Payment Amount (MAD) *'}
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={paymentForm.amount}
            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label={t('paymentMethod') || 'Payment Method'}
              value={paymentForm.paymentMethod}
              onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
            >
              <option value="CASH">{t('methodCash') || 'Cash'}</option>
              <option value="BANK_TRANSFER">{t('methodBankTransfer') || 'Bank Transfer'}</option>
              <option value="CARD">{t('methodCard') || 'Card'}</option>
              <option value="OTHER">{t('methodOther') || 'Other'}</option>
            </Select>

            <Input
              label={t('paymentDate') || 'Date'}
              type="date"
              value={paymentForm.paymentDate}
              onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
              required
            />
          </div>

          <Input
            label={t('paymentReference') || 'Reference / Cheque Number'}
            placeholder="e.g. TR-998822 or Cheque #4421"
            value={paymentForm.reference}
            onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
          />

          <Textarea
            label={t('paymentNotes') || 'Payment Notes'}
            placeholder="e.g. Settlement for September invoices"
            value={paymentForm.note}
            onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
            rows={2}
          />

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--line)]">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setIsPaymentOpen(false)}
              disabled={busy}
            >
              {t('cancel') || 'Cancel'}
            </Button>
            <Button variant="primary" type="submit" disabled={busy}>
              {busy ? (t('saving') || 'Saving…') : (t('recordPaymentBtn') || 'Save Payment')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Unlink Product Confirmation Modal */}
      <Modal
        open={Boolean(deleteProductTarget)}
        onClose={() => !busy && setDeleteProductTarget(null)}
        title={t('unlinkProductConfirm') || 'Unlink Product'}
        width="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 text-[var(--red)]">
            <AlertTriangle className="h-6 w-6 shrink-0" />
            <p className="text-xs leading-relaxed text-[var(--ink)]">
              {t('unlinkProductText') ||
                'Are you sure you want to remove this product from the supplier catalog?'}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--line)]">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setDeleteProductTarget(null)}
              disabled={busy}
            >
              {t('cancel') || 'Cancel'}
            </Button>
            <Button variant="danger" type="button" onClick={handleDeleteProduct} disabled={busy}>
              {busy ? (t('saving') || 'Removing…') : (t('delete') || 'Remove')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
