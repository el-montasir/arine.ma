import { useState, useEffect, useMemo } from 'react'
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
} from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { api } from '../lib/api.js'
import { formatMoney, formatNumber } from '../lib/format.js'
import { PageHeader, Card } from '../components/ui/Card.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Button from '../components/ui/Button.jsx'
import { Input, Select, Textarea } from '../components/ui/Input.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function CreatePurchase() {
  const { t, language } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedSupplierId = searchParams.get('supplierId')

  const { data: suppliersData, loading: loadingSuppliers } = useFetch('/suppliers')
  const suppliers = Array.isArray(suppliersData) ? suppliersData : suppliersData?.data || []

  const { data: productsData, loading: loadingProducts } = useFetch('/products?limit=500')
  const products = Array.isArray(productsData) ? productsData : productsData?.data || []

  const [supplierId, setSupplierId] = useState(preselectedSupplierId || '')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  const [expectedDate, setExpectedDate] = useState('')
  const [status, setStatus] = useState('DRAFT')
  const [notes, setNotes] = useState('')

  // Financial adjustments
  const [shippingCost, setShippingCost] = useState('0')
  const [taxAmount, setTaxAmount] = useState('0')
  const [discountAmount, setDiscountAmount] = useState('0')

  // Line items state
  const [items, setItems] = useState([
    {
      productId: '',
      quantity: 1,
      unitCost: '',
      discount: 0,
    },
  ])

  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  // If supplier changes, fetch supplier mapped products if needed
  const selectedSupplier = useMemo(() => {
    return suppliers.find((s) => String(s.id) === String(supplierId))
  }, [suppliers, supplierId])

  const handleSupplierChange = (newSupplierId) => {
    setSupplierId(newSupplierId)
  }

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        productId: '',
        quantity: 1,
        unitCost: '',
        discount: 0,
      },
    ])
  }

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const handleItemChange = (index, field, value) => {
    const updated = [...items]
    const item = { ...updated[index], [field]: value }

    // If product changed, prefill unitCost
    if (field === 'productId') {
      const prod = products.find((p) => p.id === Number(value))
      if (prod) {
        // If supplier mapped product exists in supplier.supplierProducts
        const mapped = selectedSupplier?.supplierProducts?.find((sp) => sp.productId === prod.id)
        if (mapped && mapped.purchasePrice) {
          item.unitCost = mapped.purchasePrice
        } else if (prod.costPrice != null && Number(prod.costPrice) > 0) {
          item.unitCost = prod.costPrice
        } else {
          item.unitCost = prod.price || prod.regularPrice || 0
        }
      }
    }

    updated[index] = item
    setItems(updated)
  }

  // Calculate live totals
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0
      const cost = Number(item.unitCost) || 0
      const disc = Number(item.discount) || 0
      const lineTotal = Math.max(0, qty * cost - disc)
      return sum + lineTotal
    }, 0)
  }, [items])

  const grandTotal = useMemo(() => {
    const ship = Number(shippingCost) || 0
    const tax = Number(taxAmount) || 0
    const disc = Number(discountAmount) || 0
    return Math.max(0, subtotal + ship + tax - disc)
  }, [subtotal, shippingCost, taxAmount, discountAmount])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!supplierId) {
      setFormError('Please select a supplier')
      return
    }

    if (!items || items.length === 0) {
      setFormError('Please add at least one line item')
      return
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item.productId) {
        setFormError(`Item #${i + 1}: Please select a product`)
        return
      }
      if (!item.quantity || Number(item.quantity) <= 0) {
        setFormError(`Item #${i + 1}: Quantity must be greater than 0`)
        return
      }
      if (item.unitCost === '' || Number(item.unitCost) < 0) {
        setFormError(`Item #${i + 1}: Unit cost must be 0 or greater`)
        return
      }
    }

    setBusy(true)
    try {
      const payload = {
        supplierId: Number(supplierId),
        purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString() : new Date().toISOString(),
        expectedDate: expectedDate ? new Date(expectedDate).toISOString() : undefined,
        status: status,
        notes: notes || undefined,
        subtotal: Number(subtotal.toFixed(2)),
        shippingCost: Number((Number(shippingCost) || 0).toFixed(2)),
        taxAmount: Number((Number(taxAmount) || 0).toFixed(2)),
        discountAmount: Number((Number(discountAmount) || 0).toFixed(2)),
        grandTotal: Number(grandTotal.toFixed(2)),
        items: items.map((it) => ({
          productId: Number(it.productId),
          quantity: Number(it.quantity),
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between gap-4">
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
        {/* Left Column: Supplier & Order Details (2 cols on lg) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Supplier and Dates Card */}
          <Card padded className="space-y-4">
            <h2 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[var(--purple)]" />
              <span>{t('orderGeneralInfo') || 'General Information'}</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5">
                  {t('supplierLabel') || 'Supplier *'}
                </label>
                <select
                  value={supplierId}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--ink)] focus:border-[var(--purple)] focus:outline-none"
                  required
                >
                  <option value="">{t('selectSupplierPrompt') || '— Select a supplier —'}</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.contactPerson ? `(${s.contactPerson})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <Select
                label={t('purchaseStatus') || 'Initial Status'}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="DRAFT">{t('purchaseStatusDraft') || 'Draft'}</option>
                <option value="ORDERED">{t('purchaseStatusOrdered') || 'Ordered'}</option>
              </Select>

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
            </div>
          </Card>

          {/* Line Items Card */}
          <Card padded className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
                <Package className="h-4 w-4 text-[var(--purple)]" />
                <span>{t('purchaseItemsTitle') || 'Purchase Items'}</span>
              </h2>

              <Button variant="secondary" size="sm" type="button" onClick={handleAddItem}>
                <Plus className="h-3.5 w-3.5" />
                {t('addItemBtn') || 'Add Line Item'}
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => {
                const lineTotal = Math.max(
                  0,
                  (Number(item.quantity) || 0) * (Number(item.unitCost) || 0) - (Number(item.discount) || 0)
                )

                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-[12px] bg-[var(--bg)] border border-[var(--line)] space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3"
                  >
                    {/* Product Selection */}
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-[11px] font-semibold text-[var(--ink-soft)] mb-1">
                        {t('productLabel') || 'Product *'}
                      </label>
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                        className="w-full rounded-[8px] border border-[var(--line)] bg-[var(--card)] px-2.5 py-1.5 text-xs text-[var(--ink)] focus:border-[var(--purple)] focus:outline-none"
                        required
                      >
                        <option value="">{t('selectProductPrompt') || '— Select product —'}</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title} (Stock: {p.currentStock})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div className="w-24">
                      <label className="block text-[11px] font-semibold text-[var(--ink-soft)] mb-1">
                        {t('quantityLabel') || 'Quantity'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-full rounded-[8px] border border-[var(--line)] bg-[var(--card)] px-2.5 py-1.5 text-xs text-[var(--ink)] font-mono text-center focus:border-[var(--purple)] focus:outline-none"
                        required
                      />
                    </div>

                    {/* Unit Cost */}
                    <div className="w-28">
                      <label className="block text-[11px] font-semibold text-[var(--ink-soft)] mb-1">
                        {t('purchaseCostPerItem') || 'Unit Cost (MAD)'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={item.unitCost}
                        onChange={(e) => handleItemChange(idx, 'unitCost', e.target.value)}
                        className="w-full rounded-[8px] border border-[var(--line)] bg-[var(--card)] px-2.5 py-1.5 text-xs text-[var(--ink)] font-mono text-end focus:border-[var(--purple)] focus:outline-none"
                        required
                      />
                    </div>

                    {/* Discount */}
                    <div className="w-24">
                      <label className="block text-[11px] font-semibold text-[var(--ink-soft)] mb-1">
                        {t('discount') || 'Discount'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={item.discount}
                        onChange={(e) => handleItemChange(idx, 'discount', e.target.value)}
                        className="w-full rounded-[8px] border border-[var(--line)] bg-[var(--card)] px-2.5 py-1.5 text-xs text-[var(--ink)] font-mono text-end focus:border-[var(--purple)] focus:outline-none"
                      />
                    </div>

                    {/* Line Total */}
                    <div className="w-28 text-end pt-2 sm:pt-0">
                      <span className="block text-[10.5px] font-semibold text-[var(--ink-soft)]">
                        {t('totalLabel') || 'Total'}
                      </span>
                      <span className="text-xs font-bold text-[var(--ink)] tabular-nums">
                        {formatMoney(lineTotal, language)}
                      </span>
                    </div>

                    {/* Remove Action */}
                    <div className="pt-2 sm:pt-4 text-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                        className={`p-1.5 rounded-[8px] text-[var(--red)] hover:bg-[var(--red-bg)] transition-colors ${
                          items.length <= 1 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                        title={t('delete') || 'Delete'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Notes Card */}
          <Card padded className="space-y-2">
            <h2 className="text-sm font-bold text-[var(--ink)]">
              {t('notesLabel') || 'Notes & Instructions'}
            </h2>
            <Textarea
              placeholder="Delivery terms, special requirements, transport contact..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </Card>
        </div>

        {/* Right Column: Order Summary & Financials (1 col on lg) */}
        <div className="space-y-6">
          <Card padded className="space-y-4 sticky top-6">
            <h2 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-[var(--purple)]" />
              <span>{t('financialSummary') || 'Cost Summary'}</span>
            </h2>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--ink-soft)]">{t('subtotal') || 'Items Subtotal'}:</span>
                <span className="font-semibold text-[var(--ink)] tabular-nums">
                  {formatMoney(subtotal, language)}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs gap-3">
                <span className="text-[var(--ink-soft)] shrink-0">{t('shippingCost') || 'Shipping Cost'}:</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)}
                  className="w-28 rounded-[8px] border border-[var(--line)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--ink)] font-mono text-end focus:border-[var(--purple)] focus:outline-none"
                />
              </div>

              <div className="flex justify-between items-center text-xs gap-3">
                <span className="text-[var(--ink-soft)] shrink-0">{t('taxAmount') || 'Tax / VAT'}:</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(e.target.value)}
                  className="w-28 rounded-[8px] border border-[var(--line)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--ink)] font-mono text-end focus:border-[var(--purple)] focus:outline-none"
                />
              </div>

              <div className="flex justify-between items-center text-xs gap-3">
                <span className="text-[var(--ink-soft)] shrink-0">{t('overallDiscount') || 'Discount'}:</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="w-28 rounded-[8px] border border-[var(--line)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--ink)] font-mono text-end focus:border-[var(--purple)] focus:outline-none"
                />
              </div>

              <div className="border-t border-[var(--line)] pt-3 flex justify-between items-center">
                <span className="text-sm font-bold text-[var(--ink)]">{t('grandTotal') || 'Grand Total'}:</span>
                <span className="text-base font-extrabold text-[var(--purple)] tabular-nums">
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
    </form>
  )
}
