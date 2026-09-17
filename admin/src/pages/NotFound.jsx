import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import Button from '../components/ui/Button.jsx'

export default function NotFound() {
  return (
    <div className="app-bg flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-800 text-brand-400">
        <Compass className="h-7 w-7" aria-hidden="true" />
      </span>
      <h1 className="text-lg font-semibold text-white">الصفحة غير موجودة</h1>
      <p className="text-sm text-[#8b80a8]">تعذر العثور على الصفحة المطلوبة.</p>
      <Link to="/dashboard" className="mt-2">
        <Button variant="primary">العودة للوحة التحكم</Button>
      </Link>
    </div>
  )
}