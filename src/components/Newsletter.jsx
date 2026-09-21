import { Send } from 'lucide-react'

export default function Newsletter() {
  return (
    <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden bg-white border border-[#ece5f2] rounded-[22px] p-8 sm:p-10 lg:p-12 text-center shadow-[0_12px_26px_-18px_rgba(76,22,96,0.15)]">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-[#f3ebfa] rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-[#f3ebfa]/70 rounded-full blur-2xl pointer-events-none" />

        <div className="relative">
          <h3 className="font-tajawal font-extrabold text-xl sm:text-2xl text-[#161616]">
            تابع أحدث الإصدارات
          </h3>
          <p className="text-[#6b6577] text-xs sm:text-sm mt-2 mb-6 max-w-md mx-auto leading-relaxed">
            سجّل بريدك الإلكتروني لتكون أول من يعرف عن الإصدارات والعروض الجديدة.
          </p>

          <form
            onSubmit={(e) => e.preventDefault()}
            className="max-w-md mx-auto flex gap-2"
          >
            <input
              type="email"
              placeholder="بريدك الإلكتروني"
              className="flex-1 px-4 py-3 bg-[#FAF9F7] border border-[#ece5f2] rounded-xl text-xs sm:text-sm text-[#161616] placeholder:text-[#6b6577]/60 outline-none focus:border-[#8b2f9e] focus:bg-white transition-colors"
            />
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#8b2f9e] to-[#4c1660] hover:from-[#7c288d] hover:to-[#3e1150] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
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