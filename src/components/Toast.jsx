import { useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { useCart } from '../context/CartContext'

export default function Toast() {
  const { toast, clearToast } = useCart()

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(clearToast, 2400)
    return () => clearTimeout(t)
  }, [toast, clearToast])

  if (!toast) return null

  return (
    <div className="fixed top-5 inset-x-0 z-[110] flex justify-center pointer-events-none px-4">
      <div
        key={toast.id}
        role="status"
        className="toast-in flex items-center gap-2.5 bg-foreground text-white pl-4 pr-5 py-3 rounded-2xl shadow-2xl border border-white/10 text-[0.88rem] font-medium max-w-full"
      >
        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        <span className="truncate">{toast.message}</span>
      </div>
    </div>
  )
}