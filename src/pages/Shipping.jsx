import { Truck, Clock, MapPin } from 'lucide-react'
import PolicyPage, { PolicyCard, WhatsAppContact, POLICY_WHATSAPP_NUMBER } from '../components/PolicyPage'

export default function Shipping() {
  return (
    <PolicyPage
      badgeIcon={Truck}
      badge="الشحن والتوصيل"
      title="الشحن والتوصيل"
      subtitle="توفّر مكتبة أرين خدمة التوصيل إلى مختلف أنحاء المغرب، ونسعى إلى إيصال طلباتكم في أقرب وقت ممكن."
    >
      <PolicyCard icon={Clock} title="مدة التوصيل">
        <p>
          تتراوح مدة التوصيل المعتادة بين <strong className="text-[#1C1220]">24 و48 ساعة</strong>، وغالباً ما يتم
          تسليم الطلبات خلال 24 ساعة.
        </p>
      </PolicyCard>

      <PolicyCard icon={MapPin} title="المدن والمناطق البعيدة">
        <p>
          بالنسبة لبعض المناطق التي لا تصل إليها شركات التوصيل يومياً، مثل القرى والمناطق خارج المدن، فقد تمتد مدة
          التوصيل إلى <strong className="text-[#1C1220]">72 ساعة</strong>.
        </p>
      </PolicyCard>

      <p className="text-center text-[#7A6D80] text-[13.5px] leading-[1.9] px-2">
        هذه المدد تقديرية، وقد تختلف بحسب المدينة وتوفّر خدمة التوصيل فيها.
      </p>

      <WhatsAppContact
        title="تواصل معنا عبر واتساب"
        message="السلام عليكم، لدي سؤال حول توصيل طلبي"
        numbers={[POLICY_WHATSAPP_NUMBER]}
      />
    </PolicyPage>
  )
}
