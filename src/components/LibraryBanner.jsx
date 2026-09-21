import { Link } from 'react-router-dom'
import { ArrowLeft, Box } from 'lucide-react'

export default function LibraryBanner() {
  return (
    <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
      <Link
        to="/library"
        className="group block relative overflow-hidden bg-gradient-to-r from-[#4c1660] to-[#8b2f9e] text-white rounded-[22px] p-7 sm:p-10 lg:p-14 transition-all duration-200 hover:shadow-xl hover:shadow-[#4c1660]/25 border border-white/10"
      >
        {/* Background geometric pattern */}
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 800 400" fill="none">
            {Array.from({ length: 5 }).map((_, i) => (
              <rect
                key={i}
                x={100 + i * 120}
                y={60 + i * 20}
                width={140}
                height={220}
                rx="8"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            ))}
          </svg>
        </div>

        <div className="relative flex flex-col md:flex-row items-center gap-6 lg:gap-12 text-center md:text-right">
          <div className="flex-shrink-0">
            <div className="w-18 h-18 lg:w-20 lg:h-20 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg border border-white/20">
              <Box className="w-9 h-9 lg:w-10 lg:h-10 text-white" />
            </div>
          </div>

          <div className="flex-1">
            <h3 className="font-tajawal font-extrabold text-2xl lg:text-3xl text-white">
              مرحبًا بك في مكتبة أرين
            </h3>
            <p className="text-white/85 mt-2 text-sm max-w-lg leading-relaxed">
              تجربة مختلفة تتيح لك اكتشاف الكتب والتجول بين رفوف المكتبة — استكشف عالمك في ثلاثية الأبعاد.
            </p>
          </div>

          <div className="flex-shrink-0 hidden md:block">
            <div className="inline-flex items-center gap-2 px-6 py-3.5 bg-white/20 hover:bg-white/30 text-white font-bold text-sm rounded-xl transition-all border border-white/25 backdrop-blur-sm group-hover:bg-white/30">
              <span>ادخل إلى المكتبة</span>
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            </div>
          </div>

          {/* Mobile CTA */}
          <div className="w-full md:hidden">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 text-white font-bold text-sm rounded-xl w-full justify-center border border-white/25">
              <span>ادخل إلى المكتبة</span>
              <ArrowLeft className="w-4 h-4" />
            </div>
          </div>
        </div>
      </Link>
    </section>
  )
}