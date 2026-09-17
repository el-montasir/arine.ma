import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { BookMarked, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import Button from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await login(username.trim(), password)
      const from = location.state?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'تعذر تسجيل الدخول')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-bg flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-white">
            <BookMarked className="h-7 w-7" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white">لوحة تحكم أرين</h1>
            <p className="mt-1 text-sm text-[#8b80a8]">إدارة متجر الكتب الشرعية</p>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-line-soft bg-surface-900 p-6"
          aria-label="تسجيل الدخول"
        >
          <ErrorBanner message={error} />
          <div className="space-y-4">
            <Input
              label="اسم المستخدم"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
            />
            <Input
              label="كلمة المرور"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <Button type="submit" size="lg" disabled={busy} className="mt-6 w-full">
            <Lock className="h-4 w-4" aria-hidden="true" />
            {busy ? 'جارِ الدخول…' : 'تسجيل الدخول'}
          </Button>
        </form>
        <p className="mt-4 text-center text-[11px] text-[#6f6488]">
          منطقة محمية — الجلسة مشفرة ولا يمكن الوصول إلى البيانات إلا للمستخدمين المصرح لهم.
        </p>
      </div>
    </div>
  )
}