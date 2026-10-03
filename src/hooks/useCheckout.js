import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { trackInitiateCheckout, generateClientEventId, getAttributionData } from '../utils/tracking'
import api from '../utils/api'

const INITIAL_FORM = {
  fullName: '',
  phone: '',
  city: '',
  address: '',
  note: '',
  paymentMethod: 'CASH_ON_DELIVERY',
}

export function useCheckout({ onSuccess } = {}) {
  const { items, subtotal, shipping, total, shippingConfig, clearCart } = useCart()
  const { t } = useLanguage()
  const navigate = useNavigate()

  const [form, setForm] = useState(INITIAL_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (items.length > 0) {
      trackInitiateCheckout(items, total)
    }
  }, [])

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev))
  }

  function validate() {
    const errors = {}
    if (!form.fullName.trim()) errors.fullName = t('reqFullName')
    if (!form.phone.trim()) {
      errors.phone = t('reqPhone')
    } else if (form.phone.replace(/\D/g, '').length < 8) {
      errors.phone = t('invalidPhone')
    }
    if (!form.city.trim()) errors.city = t('reqCity')
    if (!form.address.trim()) errors.address = t('reqAddress')
    return errors
  }

  async function handleSubmit(e) {
    if (e?.preventDefault) e.preventDefault()

    if (items.length === 0) {
      setFormError(t('emptyCartError'))
      return
    }

    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setFormError(t('reqFullName'))
      if (typeof window !== 'undefined' && window.scrollTo) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      const bookItems = items
        .filter((i) => !i.isPackage)
        .map((i) => ({ productId: typeof i.id === 'number' ? i.id : Number(String(i.id).replace('book-', '')), quantity: i.quantity }))

      const packageItems = items
        .filter((i) => i.isPackage)
        .map((i) => ({ packageId: i.packageId || Number(String(i.id).replace('pkg-', '')), quantity: i.quantity }))

      const eventId = generateClientEventId('pur')
      const attribution = getAttributionData()

      const res = await api.post('/orders', {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        note: form.note.trim() || undefined,
        paymentMethod: form.paymentMethod,
        items: bookItems,
        packages: packageItems,
        attribution,
        eventId,
      })

      // Success: the server confirmed the order.
      const order = res.order
      const receipt = {
        orderNumber: order.orderNumber,
        total: order.total,
        fullName: form.fullName.trim(),
        city: form.city.trim(),
        paymentMethod: form.paymentMethod,
        items: items,
        eventId: eventId,
      }
      try {
        sessionStorage.setItem('arine-last-order', JSON.stringify(receipt))
      } catch {
        /* storage unavailable — receipt still works via router state */
      }
      clearCart()
      if (onSuccess) {
        onSuccess(receipt)
      }
      navigate('/order-success', { state: receipt })
    } catch (err) {
      // Failure: keep the cart AND the form data intact so the user can retry.
      setFormError(err.message || t('orderFailed'))
      setSubmitting(false)
    }
  }

  return {
    form,
    setForm,
    fieldErrors,
    setFieldErrors,
    formError,
    setFormError,
    submitting,
    update,
    validate,
    handleSubmit,
    items,
    subtotal,
    shipping,
    total,
    shippingConfig,
    clearCart,
  }
}
