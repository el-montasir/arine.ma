import { Component } from 'react'
import { reloadOnceForNewBuild } from '../utils/chunk-reload'

const CHUNK_ERROR = /dynamically imported module|Importing a module script failed|module script|Unable to preload CSS/i

// Last line of defence for the page area: a render error shows a short message
// with a reload button instead of an empty white screen.
export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    if (CHUNK_ERROR.test(String(error?.message || error))) reloadOnceForNewBuild()
    console.error('Page crashed:', error)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-tajawal font-bold text-lg text-[#1C1220]">حدث خطأ أثناء تحميل الصفحة</p>
        <p className="text-[#6b6577] text-sm">أعد تحميل الصفحة للمتابعة، سلتك محفوظة.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full bg-[#8b2f9e] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#6B2178] transition-colors"
        >
          إعادة تحميل الصفحة
        </button>
      </div>
    )
  }
}
