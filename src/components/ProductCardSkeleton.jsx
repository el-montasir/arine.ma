// Placeholder with the same footprint as ProductCard, shown while books load.
export default function ProductCardSkeleton() {
  return (
    <article
      className="bg-white rounded-[18px] border border-[#ece5f2] overflow-hidden flex flex-col justify-between relative h-full"
      aria-hidden="true"
    >
      <div>
        {/* Cover image placeholder */}
        <div className="skeleton-shimmer bg-gradient-to-br from-[#eadff1] to-[#dccbe6] aspect-[3/4]" />

        {/* Info Area placeholder */}
        <div className="p-3 sm:p-3.5 flex flex-col justify-between">
          <div>
            {/* Category tag placeholder */}
            <div className="mb-1.5 flex items-center">
              <div className="skeleton-shimmer w-12 h-4 rounded-full bg-[#efe7f4]" />
            </div>

            {/* Title placeholder */}
            <div className="min-h-[36px] flex flex-col gap-1.5 justify-center">
              <div className="skeleton-shimmer w-4/5 h-3.5 rounded bg-[#efe7f4]" />
              <div className="skeleton-shimmer w-3/5 h-3 rounded bg-[#efe7f4]" />
            </div>

            {/* Author placeholder */}
            <div className="skeleton-shimmer w-1/2 h-2.5 mt-1.5 rounded bg-[#f5f1f7]" />
          </div>

          {/* Price & Button placeholder */}
          <div className="flex items-center justify-between gap-2 mt-2.5 pt-1">
            <div className="skeleton-shimmer w-14 h-4 rounded bg-[#efe7f4]" />
            <div className="skeleton-shimmer w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#efe7f4] shrink-0" />
          </div>
        </div>
      </div>
    </article>
  )
}
