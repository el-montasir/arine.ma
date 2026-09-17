import { Truck } from 'lucide-react'

export default function AnnouncementBar() {
  return (
    <div className="bg-brand-700 text-white text-[0.82rem] py-2 text-center tracking-wide font-medium">
      <div className="max-w-[1440px] mx-auto px-4 flex items-center justify-center gap-2">
        <Truck className="w-4 h-4 opacity-90" />
        <span>توصيل سريع في جميع أنحاء المغرب &bull; الدفع عند الاستلام</span>
      </div>
    </div>
  )
}