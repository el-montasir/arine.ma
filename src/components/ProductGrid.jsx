import ProductCard from './ProductCard'

export default function ProductGrid({ books, title, subtitle }) {
  if (!books || books.length === 0) {
    return (
      <div className="py-20 text-center">
        <div className="text-5xl mb-4 opacity-40">📚</div>
        <p className="text-foreground font-semibold text-lg">لم نجد كتباً تطابق بحثك</p>
        <p className="text-muted text-[0.88rem] mt-1.5">جرّب كلمات مختلفة أو تصفّح جميع الكتب</p>
      </div>
    )
  }

  return (
    <section className="max-w-[1440px] mx-auto px-4 lg:px-8">
      {title && (
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-foreground">{title}</h2>
            {subtitle && <p className="text-[0.85rem] text-muted mt-1">{subtitle}</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 lg:gap-5">
        {books.map((book) => (
          <ProductCard key={book.id} book={book} />
        ))}
      </div>
    </section>
  )
}