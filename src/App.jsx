import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { LanguageProvider } from './context/LanguageContext'
import { CartProvider } from './context/CartContext'
import { initMetaPixel, trackPageView, captureAttribution } from './utils/tracking'
import { updateFavicon } from './hooks/useStoreConfig'
import AnnouncementBar from './components/AnnouncementBar'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import CartDrawer from './components/CartDrawer'
import Toast from './components/Toast'
import Home from './pages/Home'

const Shop = lazy(() => import('./pages/Shop'))
const BookDetails = lazy(() => import('./pages/BookDetails'))
const Packages = lazy(() => import('./pages/Packages'))
const PackageDetails = lazy(() => import('./pages/PackageDetails'))
const CartPage = lazy(() => import('./pages/CartPage'))
const Checkout = lazy(() => import('./pages/Checkout'))
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'))
const TrackOrder = lazy(() => import('./pages/TrackOrder'))
const Favorites = lazy(() => import('./pages/Favorites'))
const About = lazy(() => import('./pages/About'))
const Contact = lazy(() => import('./pages/Contact'))
const LibraryEntry = lazy(() => import('./pages/LibraryEntry'))
const NotFound = lazy(() => import('./pages/NotFound'))

function RouteTracker() {
  const { pathname, search } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
    captureAttribution()
    trackPageView()
  }, [pathname, search])
  return null
}

function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}

export default function App() {
  useEffect(() => {
    updateFavicon()
    initMetaPixel()
  }, [])

  return (
    <BrowserRouter>
      <LanguageProvider>
        <CartProvider>
          <RouteTracker />
          <Layout>
            <Suspense
              fallback={
                <div
                  className="min-h-[50vh] flex items-center justify-center"
                  aria-hidden="true"
                >
                  <div className="w-8 h-8 rounded-full border-2 border-[#8b2f9e]/20 border-t-[#8b2f9e] animate-spin" />
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/book/:id" element={<BookDetails />} />
                <Route path="/packages" element={<Packages />} />
                <Route path="/package/:id" element={<PackageDetails />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/order-success" element={<OrderSuccess />} />
                <Route path="/track-order" element={<TrackOrder />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/account" element={<TrackOrder />} />
                <Route path="/library" element={<LibraryEntry />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </Layout>
          <CartDrawer />
          <Toast />
        </CartProvider>
      </LanguageProvider>
    </BrowserRouter>
  )
}
