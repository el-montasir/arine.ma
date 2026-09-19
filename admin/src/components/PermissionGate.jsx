import { ShieldAlert, ArrowRight, LayoutDashboard } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import Button from './ui/Button.jsx'

/**
 * Conditionally renders children or fallback/Access Denied based on permission.
 */
export default function PermissionGate({
  permission,
  permissions = [],
  requireAll = false,
  fallback = null,
  showDeniedView = false,
  children,
}) {
  const { can, hasAnyPermission, hasAllPermissions, isOwner } = useAuth()
  const { t, isRTL } = useLanguage()

  let allowed = isOwner

  if (!allowed) {
    if (permission) {
      allowed = can(permission)
    } else if (permissions.length > 0) {
      allowed = requireAll
        ? hasAllPermissions(permissions)
        : hasAnyPermission(permissions)
    } else {
      allowed = true
    }
  }

  if (allowed) {
    return children
  }

  if (fallback) {
    return fallback
  }

  if (showDeniedView) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-danger-500/30 bg-danger-500/10 text-danger-400 shadow-xl">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-white">
          {t('accessDeniedTitle')}
        </h2>
        <p className="mt-2 max-w-md text-sm text-[#8b80a8]">
          {t('accessDeniedDesc')}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link to="/dashboard">
            <Button variant="primary" size="sm">
              <LayoutDashboard className="h-4 w-4" />
              <span>{t('backToDashboard')}</span>
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return null
}
