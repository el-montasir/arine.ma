import React from 'react'
import { AlertTriangle, RefreshCw, LayoutDashboard, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    console.error('Unhandled Admin Panel Error:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoDashboard = () => {
    window.location.href = '/dashboard'
  }

  handleCopy = () => {
    const errorText = `${this.state.error?.toString()}\n\nStack:\n${this.state.errorInfo?.componentStack || this.state.error?.stack || ''}`
    navigator.clipboard.writeText(errorText).then(() => {
      this.setState({ copied: true })
      setTimeout(() => this.setState({ copied: false }), 2500)
    })
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    const lang = localStorage.getItem('arine_admin_lang') || 'ar'
    const isRTL = lang === 'ar'

    const labels = {
      ar: {
        title: 'حدث خطأ غير متوقع في النظام',
        desc: 'عذراً، واجهت لوحة التحكم مشكلة أثناء عرض هذه الصفحة. يمكنك محاولة إعادة التحميل أو العودة للرئيسية.',
        reload: 'إعادة تحميل الصفحة',
        dashboard: 'العودة للوحة التحكم',
        details: 'تفاصيل الخطأ التقني',
        copy: 'نسخ تفاصيل الخطأ',
        copied: 'تم النسخ!',
      },
      en: {
        title: 'An unexpected error occurred',
        desc: 'Sorry, the admin panel encountered a problem while rendering this page. You can try reloading or return to the dashboard.',
        reload: 'Reload Page',
        dashboard: 'Go to Dashboard',
        details: 'Technical Error Details',
        copy: 'Copy Error Details',
        copied: 'Copied!',
      },
      fr: {
        title: 'Une erreur inattendue est survenue',
        desc: 'Désolé, le panneau d\'administration a rencontré un problème. Vous pouvez actualiser ou retourner au tableau de bord.',
        reload: 'Recharger la page',
        dashboard: 'Tableau de bord',
        details: 'Détails techniques de l\'erreur',
        copy: 'Copier l\'erreur',
        copied: 'Copié !',
      },
    }

    const t = labels[lang] || labels.ar

    return (
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        className="min-h-screen bg-ink-950 text-[#f2eefb] flex items-center justify-center p-4 font-sans select-text"
      >
        <div className="w-full max-w-xl rounded-2xl border border-line bg-surface-900/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-danger-950/80 border border-danger-800/80 text-danger-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white leading-tight">
                {t.title}
              </h1>
              <p className="text-xs sm:text-sm text-[#8b80a8] mt-1">
                {t.desc}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-line/60">
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-brand-500 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>{t.reload}</span>
            </button>

            <button
              type="button"
              onClick={this.handleGoDashboard}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface-800 px-4 py-2 text-xs font-semibold text-[#c0b6d6] hover:bg-surface-700 hover:text-white transition-colors"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>{t.dashboard}</span>
            </button>
          </div>

          {/* Technical Details Collapsible */}
          <div className="rounded-xl border border-line/60 bg-ink-900/60 overflow-hidden">
            <button
              type="button"
              onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
              className="w-full flex items-center justify-between p-3 text-xs font-mono text-[#8b80a8] hover:text-[#c0b6d6] transition-colors"
            >
              <span className="flex items-center gap-2">
                <span>{t.details}</span>
              </span>
              {this.state.showDetails ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>

            {this.state.showDetails && (
              <div className="p-3 border-t border-line/40 space-y-3 bg-black/40">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-danger-400">
                    {this.state.error?.name || 'Error'}: {this.state.error?.message}
                  </span>
                  <button
                    type="button"
                    onClick={this.handleCopy}
                    className="inline-flex items-center gap-1 text-[11px] text-[#8b80a8] hover:text-brand-400 font-mono transition-colors"
                  >
                    {this.state.copied ? (
                      <>
                        <Check className="h-3 w-3 text-ok-400" />
                        <span className="text-ok-400">{t.copied}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>{t.copy}</span>
                      </>
                    )}
                  </button>
                </div>
                <pre
                  dir="ltr"
                  className="max-h-48 overflow-y-auto text-[10px] font-mono text-[#a79cc4] bg-black/60 p-2.5 rounded-lg border border-line/30 whitespace-pre-wrap select-all"
                >
                  {this.state.error?.stack || this.state.errorInfo?.componentStack || 'No stack trace available'}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
}
