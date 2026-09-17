import { Send } from 'lucide-react'

export default function Newsletter() {
  return (
    <section className="max-w-[1440px] mx-auto px-4 lg:px-8">
      <div className="relative overflow-hidden bg-white border border-border/60 rounded-3xl p-8 lg:p-12 text-center">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-brand-100/50 rounded-full blur-2xl" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-brand-200/30 rounded-full blur-2xl" />

        <div className="relative">
          <h3 className="text-xl lg:text-2xl font-bold text-foreground">
            تابع أحدث الإصدارات
          </h3>
          <p className="text-muted text-[0.88rem] mt-2 mb-7 max-w-md mx-auto leading-relaxed">
            سجّل بريدك الإلكتروني لتكون أول من يعرف عن الإصدارات والعروض الجديدة.
          </p>

          <form
            onSubmit={(e) => e.preventDefault()}
            className="max-w-md mx-auto flex gap-2"
          >
            <input
              type="email"
              placeholder="بريدك الإلكتروني"
              className="flex-1 px-4 py-3.5 bg-[#F3F4F6] border border-border/60 rounded-xl text-[0.88rem] text-foreground placeholder:text-muted/60 outline-none focus:border-brand-400 focus:bg-white transition-colors"
            />
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-3.5 bg-brand-700 hover:bg-brand-800 text-white text-[0.88rem] font-semibold rounded-xl transition-colors shadow-sm"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">اشترك</span>
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}