import { Link } from 'react-router-dom'
import { Box, ArrowLeft, BookOpen } from 'lucide-react'

export default function LibraryEntry() {
  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 lg:py-12">
      <div className="max-w-2xl mx-auto text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-gradient-to-br from-brand-600 to-brand-800 rounded-3xl flex items-center justify-center shadow-xl shadow-brand-700/25">
            <Box className="w-12 h-12 text-white" />
          </div>
        </div>

        <h1 className="text-3xl lg:text-5xl font-bold text-foreground leading-snug">
          مرحباً بك في
          <br />
          <span className="text-brand-700">مكتبة أرين</span>
        </h1>

        <p className="text-muted text-lg mt-5 leading-relaxed max-w-lg mx-auto">
          تجربة مختلفة تتيح لك اكتشاف الكتب والتجول بين رفوف المكتبة. اكتشف عالمك في ثلاثية الأبعاد.
        </p>

        <p className="text-muted/70 text-[0.88rem] mt-3">
          قريباً — تجربة المكتبة الافتراضية قيد التطوير
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10">
          <button className="inline-flex items-center gap-2 px-8 py-4 bg-brand-700 hover:bg-brand-800 text-white text-[0.95rem] font-semibold rounded-2xl transition-all shadow-lg shadow-brand-700/25 hover:shadow-brand-800/30">
            <Box className="w-5 h-5" />
            ادخل إلى المكتبة
          </button>

          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white border border-border hover:border-brand-300 text-foreground text-[0.95rem] font-semibold rounded-2xl transition-all hover:text-brand-700"
          >
            <BookOpen className="w-5 h-5" />
            تصفح الكتب
          </Link>
        </div>

        {/* Features preview */}
        <div className="grid sm:grid-cols-3 gap-4 mt-12">
          {[
            { icon: '📚', title: 'رفوف حقيقية', desc: 'تصفح الكتب على أرفف المكتبة' },
            { icon: '🚶', title: 'تجوّل بحرية', desc: 'تحرّك داخل المكتبة بشخصيتك' },
            { icon: '📖', title: 'افتح واقرأ', desc: 'اقرأ مقتطفات من أي كتاب' },
          ].map((f) => (
            <div key={f.title} className="bg-white border border-border/60 rounded-2xl p-5 text-center">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h4 className="font-bold text-foreground text-[0.88rem]">{f.title}</h4>
              <p className="text-[0.78rem] text-muted mt-1">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Back */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 mt-8 text-muted hover:text-brand-700 transition-colors text-[0.88rem]"
        >
          العودة إلى الرئيسية
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}