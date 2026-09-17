import { useState } from 'react'
import { MapPin, Phone, Mail, Send } from 'lucide-react'

export default function Contact() {
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 4000)
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-10 lg:py-16">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
          تواصل <span className="text-brand-700">معنا</span>
        </h1>
        <p className="text-muted text-lg mt-3 leading-relaxed">
          نحن هنا لمساعدتك. لا تتردد في التواصل معنا لأي استفسار.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Contact Info */}
        <div className="space-y-4">
          {[
            { icon: MapPin, title: 'العنوان', lines: ['شارع الحسن الثاني، رقم 123', 'الدار البيضاء، المغرب'] },
            { icon: Phone, title: 'الهاتف', lines: ['+212 600 00 00 00', '+212 522 00 00 00'] },
            { icon: Mail, title: 'البريد الإلكتروني', lines: ['info@arine.ma', 'support@arine.ma'] },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-4 p-5 bg-white border border-border/60 rounded-2xl">
              <div className="w-11 h-11 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <item.icon className="w-5 h-5 text-brand-700" />
              </div>
              <div>
                <h4 className="font-bold text-foreground text-[0.92rem]">{item.title}</h4>
                {item.lines.map((l, i) => (
                  <p key={i} className="text-muted text-[0.85rem] mt-0.5">{l}</p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="bg-white border border-border/60 rounded-3xl p-6 lg:p-8">
          <h3 className="font-bold text-foreground text-lg mb-6">أرسل لنا رسالة</h3>

          {submitted ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✓</span>
              </div>
              <p className="font-semibold text-foreground mb-1">شكراً لك!</p>
              <p className="text-muted text-[0.85rem]">تم استلام رسالتك وسنرد عليك قريباً.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[0.82rem] text-muted mb-1.5">الاسم</label>
                  <input
                    type="text"
                    required
                    placeholder="محمد أمين"
                    className="w-full px-4 py-3 bg-[#F3F4F6] border border-border/60 rounded-xl text-[0.88rem] text-foreground placeholder:text-muted/60 outline-none focus:border-brand-400 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[0.82rem] text-muted mb-1.5">البريد الإلكتروني</label>
                  <input
                    type="email"
                    required
                    placeholder="mohamed@example.com"
                    className="w-full px-4 py-3 bg-[#F3F4F6] border border-border/60 rounded-xl text-[0.88rem] text-foreground placeholder:text-muted/60 outline-none focus:border-brand-400 focus:bg-white transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[0.82rem] text-muted mb-1.5">الموضوع</label>
                <input
                  type="text"
                  required
                  placeholder="موضوع الرسالة"
                  className="w-full px-4 py-3 bg-[#F3F4F6] border border-border/60 rounded-xl text-[0.88rem] text-foreground placeholder:text-muted/60 outline-none focus:border-brand-400 focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-[0.82rem] text-muted mb-1.5">الرسالة</label>
                <textarea
                  required
                  rows={5}
                  placeholder="اكتب رسالتك هنا..."
                  className="w-full px-4 py-3 bg-[#F3F4F6] border border-border/60 rounded-xl text-[0.88rem] text-foreground placeholder:text-muted/60 outline-none focus:border-brand-400 focus:bg-white transition-colors resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand-700 hover:bg-brand-800 text-white text-[0.92rem] font-semibold rounded-xl transition-colors shadow-sm"
              >
                <Send className="w-4 h-4" />
                إرسال الرسالة
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}