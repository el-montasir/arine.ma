import { RefreshCw, BookX, PackageX, Info } from 'lucide-react'
import PolicyPage, { PolicyCard, WhatsAppContact, POLICY_WHATSAPP_NUMBER } from '../components/PolicyPage'

export default function Returns() {
  return (
    <PolicyPage
      badgeIcon={RefreshCw}
      badge="الاستبدال والاسترجاع"
      title="سياسة الاستبدال والاسترجاع"
      subtitle="في مكتبة أرين، نحرص على أن تصلك كتبك في أفضل حالة، وأن يكون طلبك مطابقاً لما اخترته."
    >
      <PolicyCard icon={BookX} title="في حالة وجود مشكلة في الكتاب">
        <p>
          إذا توصّلت بكتاب تالف، أو به عيب في الطباعة أو التجليد، يمكنك التواصل معنا خلال{' '}
          <strong className="text-[#1C1220]">3 أيام من تاريخ استلام الطلب</strong>، وسنعمل على استبداله.
        </p>
      </PolicyCard>

      <PolicyCard icon={PackageX} title="في حالة وجود خطأ في الطلب">
        <p>
          إذا أرسلنا إليك كتاباً مختلفاً عن الكتاب الذي طلبته، يُرجى التواصل معنا لإبلاغنا بالخطأ، وسنعمل على استبداله
          بالكتاب الصحيح.
        </p>
      </PolicyCard>

      <div className="flex items-start gap-3 rounded-[18px] border border-[#EBDCF1] bg-[#F6EDF9] px-4 py-3.5 text-[#4A3D50] text-sm sm:text-[14.5px] leading-[1.9]">
        <Info className="w-5 h-5 shrink-0 mt-1 text-[#6B2178]" />
        <p>
          <strong className="text-[#6B2178]">ملاحظة:</strong> يُرجى التواصل معنا خلال 3 أيام من استلام الطلب للإبلاغ عن
          أي مشكلة، حتى نتمكن من مساعدتك ومعالجة طلب الاستبدال.
        </p>
      </div>

      <WhatsAppContact
        title="تواصل معنا عبر واتساب"
        message="السلام عليكم، أريد الإبلاغ عن مشكلة في طلبي رقم: "
        numbers={[POLICY_WHATSAPP_NUMBER]}
      />
    </PolicyPage>
  )
}
