import { Truck, Megaphone } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useBanners } from '../hooks/useBanners'

export default function AnnouncementBar() {
  const { t } = useLanguage()
  const { banners } = useBanners('announcement')

  const activeAnnouncement = banners && banners.length > 0 ? banners[0] : null

  return (
    <div className="bg-brand-700 text-white text-[0.82rem] py-2 text-center tracking-wide font-medium">
      <div className="max-w-[1440px] mx-auto px-4 flex items-center justify-center gap-2">
        {activeAnnouncement ? (
          <>
            <Megaphone className="w-4 h-4 opacity-90 shrink-0" />
            <span>{activeAnnouncement.title}</span>
            {activeAnnouncement.link && (
              <a
                href={activeAnnouncement.link}
                className="underline hover:text-brand-200 transition-colors mr-2"
              >
                المزيد
              </a>
            )}
          </>
        ) : (
          <>
            <Truck className="w-4 h-4 opacity-90 shrink-0" />
            <span>{t('announcementText')}</span>
          </>
        )}
      </div>
    </div>
  )
}