import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import ProductCard from './ProductCard'
import { useLanguage } from '../context/LanguageContext'

export default function ProductGrid({ books, title, subtitle, viewAllLink }) {
  const { isRTL } = useLanguage()
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight

  if (!books || books.length === 0) {
    return (
      <div className="py-20 text-center">
        <div className="text-5xl mb-4 opacity-40">📚</div>
        <p className="font-tajawal font-bold text-lg text-[#161616]">لم نجد كتباً تطابق بحثك</p>
        <p className="text-[#6b6577] text-[13.5px] mt-1.5">جرّب كلمات مختلفة أو تصفّح جميع الكتب</p>
      </div>
    )
  }

  return (
    <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
      {title && (
        <div className="flex items-baseline justify-between mb-6 flex-wrap gap-2">
          <div>
            <h2 className="font-tajawal font-extrabold text-2xl sm:text-[26px] text-[#161616] tracking-tight m-0">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[#6b6577] text-[13px] mt-1 m-0">
                {subtitle}
              </p>
            )}
          </div>
          {viewAllLink && (
            <Link
              to={viewAllLink}
              className="inline-flex items-center gap-1.5 text-[#8b2f9e] hover:text-[#4c1660] text-[13.5px] font-bold transition-colors"
            >
              <span>عرض الكل</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
        {books.map((book) => (
          <ProductCard key={book.id} book={book} />
        ))}
      </div>
    </section>
  )
}