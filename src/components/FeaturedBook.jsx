import { Link } from 'react-router-dom'
import { ArrowLeft, Star, BookOpen } from 'lucide-react'
import BookCover from './BookCover'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../utils/format'

export default function FeaturedBook({ book }) {
  const { addToCart } = useCart()
  const outOfStock = book.availability === 'out-of-stock'

  return (
    <section className="max-w-[1440px] mx-auto px-4 lg:px-8">
      <div className="relative overflow-hidden bg-gradient-to-br from-white to-brand-50/60 rounded-3xl border border-brand-100/60 p-6 lg:p-12">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-brand-100/40 rounded-full blur-2xl" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-brand-200/30 rounded-full blur-2xl" />

        <div className="relative flex flex-col md:flex-row items-center gap-8 lg:gap-14">
          {/* Book cover */}
          <div className="flex-shrink-0 w-48 lg:w-56">
            <BookCover book={book} size="lg" className="w-full" />
          </div>

          {/* Details */}
          <div className="flex-1 text-center md:text-right">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-100 text-brand-700 text-[0.78rem] font-semibold rounded-full mb-4">
              <BookOpen className="w-3.5 h-3.5" />
              الكتب المميزة
            </span>

            <h3 className="text-2xl lg:text-3xl font-bold text-foreground leading-snug">
              {book.title}
            </h3>

            <p className="text-muted text-[0.9rem] mt-2">{book.author}</p>

            {/* Rating */}
            <div className="flex items-center gap-1 mt-3 justify-center md:justify-start">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className="w-4 h-4"
                  fill={i < book.rating ? '#F59E0B' : 'none'}
                  stroke={i < book.rating ? '#F59E0B' : '#D4D4D8'}
                  strokeWidth={1.5}
                />
              ))}
            </div>

            <p className="text-muted text-[0.88rem] leading-relaxed mt-4 max-w-xl">
              {book.description}
            </p>

            <div className="flex items-center gap-4 mt-6 justify-center md:justify-start">
              <div className="flex items-baseline gap-2">
                <span className="text-brand-700 font-bold text-xl">{formatPrice(book.price)}</span>
                {book.oldPrice && (
                  <span className="text-muted/50 text-[0.88rem] line-through">{formatPrice(book.oldPrice)}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-7 justify-center md:justify-start">
              {outOfStock ? (
                <span className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#F3F4F6] text-muted text-[0.9rem] font-semibold rounded-2xl">
                  غير متوفر حالياً
                </span>
              ) : (
                <button
                  onClick={() => addToCart(book)}
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-brand-700 hover:bg-brand-800 text-white text-[0.9rem] font-semibold rounded-2xl transition-all shadow-lg shadow-brand-700/20 hover:shadow-brand-800/25 hover:-translate-y-0.5"
                >
                  أضف للسلة
                </button>
              )}
              <Link
                to={`/book/${book.id}`}
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-white border border-border hover:border-brand-300 text-foreground text-[0.9rem] font-semibold rounded-2xl transition-all hover:text-brand-700"
              >
                عرض التفاصيل
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}