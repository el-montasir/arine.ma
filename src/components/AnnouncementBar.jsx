import { Truck, Megaphone } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useBanners } from '../hooks/useBanners'
import { useStoreConfig } from '../hooks/useStoreConfig'

export default function AnnouncementBar() {
  const { t } = useLanguage()
  const { banners } = useBanners('announcement')
  const { config } = useStoreConfig()

  const activeAnnouncement = banners && banners.length > 0 ? banners[0] : null
  const storeAnnouncement = config?.store?.announcement !== undefined ? config.store.announcement : t('announcementText')

  // If there is no banner and the store announcement text is empty, hide the announcement bar cleanly
  if (!activeAnnouncement && (!storeAnnouncement || !storeAnnouncement.trim())) {
    return null
  }

  return (
    <div className="bg-purple-800 text-white text-[0.82rem] py-2 text-center tracking-wide font-medium">
      <div className="max-w-[1440px] mx-auto px-4 flex items-center justify-center gap-2">
        {activeAnnouncement ? (
          <>
            <Megaphone className="w-4 h-4 text-white opacity-95 shrink-0" />
            <span className="text-white">{activeAnnouncement.title}</span>
            {activeAnnouncement.link && (
              <a
                href={activeAnnouncement.link}
                className="underline text-white hover:text-purple-200 transition-colors mr-2"
              >
                {t('more') || 'المزيد'}
              </a>
            )}
          </>
        ) : (
          <>
            <Truck className="w-4 h-4 text-white opacity-95 shrink-0" />
            <span className="text-white">{storeAnnouncement}</span>
          </>
        )}
      </div>
    </div>
  )
}
