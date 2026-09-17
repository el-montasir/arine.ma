import { Link } from 'react-router-dom'
import { ArrowLeft, Sparkles } from 'lucide-react'

export default function Hero({ onExplore, onBestsellers }) {
  return (
    <section className="relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[1100px] rounded-full opacity-40 blur-3xl"
          style={{
            background: 'radial-gradient(circle at 50% 30%, #EDE9FE 0%, transparent 60%)',
          }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full opacity-30 blur-3xl"
          style={{
            background: 'radial-gradient(circle at center, #DDD6FE 0%, transparent 65%)',
          }}
        />
        {/* Subtle geometric arc pattern */}
        <svg
          className="absolute top-0 right-[8%] h-[420px] w-[420px] opacity-[0.07] text-brand-800"
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.6"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <rect
              key={i}
              x={40 + i * 6}
              y={40 + i * 6}
              width={120 - i * 12}
              height={120 - i * 12}
              rx="4"
            />
          ))}
        </svg>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-20 lg:py-24">
        <div className="max-w-2xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-brand-100 text-brand-800 text-[0.82rem] font-medium rounded-full mb-7">
            <Sparkles className="w-3.5 h-3.5" />
            مكتبة أرين للكتب الشرعية
          </span>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground lg:leading-[1.15] leading-[1.25]">
            اكتشف
            <span className="text-brand-700"> كتابك القادم </span>
          </h1>

          <p className="mt-5 text-lg text-muted leading-relaxed max-w-xl mx-auto">
            مجموعة مختارة من الكتب الشرعية والمعرفية لعشاق القراءة وطلب العلم.
          </p>

          <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={onExplore}
              className="inline-flex items-center gap-2 px-7 py-4 bg-brand-700 hover:bg-brand-800 text-white text-[0.95rem] font-semibold rounded-2xl transition-all shadow-lg shadow-brand-700/25 hover:shadow-brand-800/30 hover:-translate-y-0.5"
            >
              استكشف الكتب
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={onBestsellers}
              className="px-7 py-4 bg-white border border-border hover:border-brand-300 text-foreground text-[0.95rem] font-semibold rounded-2xl transition-all hover:text-brand-700"
            >
              الأكثر مبيعاً
            </button>
          </div>

          {/* Trust markers */}
          <div className="mt-16 grid grid-cols-3 gap-4 max-w-md mx-auto">
            {[
              { label: 'كتاب', value: '+2000' },
              { label: 'توصيل سريع', value: '24/48h' },
              { label: 'عملاء', value: '+5000' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="text-center px-2 py-4 bg-white/70 backdrop-blur rounded-xl border border-border/60"
              >
                <div className="text-lg font-bold text-brand-800">{stat.value}</div>
                <div className="text-[0.72rem] text-muted mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}