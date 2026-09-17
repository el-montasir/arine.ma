import { Link } from 'react-router-dom'
import { ArrowLeft, Box } from 'lucide-react'

export default function LibraryBanner() {
  return (
    <section className="max-w-[1440px] mx-auto px-4 lg:px-8">
      <Link
        to="/library"
        className="group block relative overflow-hidden bg-brand-800 text-white rounded-3xl p-8 lg:p-14 transition-all duration-300 hover:shadow-2xl hover:shadow-brand-900/30"
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.08]">
          <svg className="w-full h-full" viewBox="0 0 800 400" fill="none">
            {Array.from({ length: 5 }).map((_, i) => (
              <rect
                key={i}
                x={100 + i * 120}
                y={60 + i * 20}
                width={140}
                height={220}
                rx="6"
                stroke="currentColor"
                strokeWidth="1"
              />
            ))}
          </svg>
        </div>
        <div className="absolute inset-0 bg-gradient-to-l from-brand-900/90 to-transparent" />

        <div className="relative flex flex-col md:flex-row items-center gap-6 lg:gap-12 text-center md:text-right">
          <div className="flex-shrink-0">
            <div className="w-20 h-20 lg:w-24 lg:h-24 bg-white/15 backdrop-blur rounded-2xl flex items-center justify-center shadow-lg border border-white/10">
              <Box className="w-10 h-10 lg:w-12 lg:h-12 text-white/90" />
            </div>
          </div>

          <div className="flex-1">
            <h3 className="text-2xl lg:text-3xl font-bold">
              مرحبًا بك في مكتبة أرين
            </h3>
            <p className="text-white/75 mt-2 text-[0.9rem] max-w-lg leading-relaxed">
              تجربة مختلفة تتيح لك اكتشاف الكتب والتجول بين رفوف المكتبة — استكشف عالمك في ثلاثية الأبعاد.
            </p>
          </div>

          <div className="flex-shrink-0 hidden md:block">
            <div className="inline-flex items-center gap-2 px-7 py-4 bg-white/15 hover:bg-white/25 text-white font-semibold rounded-2xl transition-all border border-white/20 backdrop-blur-sm group-hover:bg-white/30">
              ادخل إلى المكتبة
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            </div>
          </div>

          {/* Mobile CTA */}
          <div className="w-full md:hidden">
            <div className="inline-flex items-center gap-2 px-7 py-4 bg-white/15 text-white font-semibold rounded-2xl w-full justify-center border border-white/20">
              ادخل إلى المكتبة
              <ArrowLeft className="w-4 h-4" />
            </div>
          </div>
        </div>
      </Link>
    </section>
  )
}