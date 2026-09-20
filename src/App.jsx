import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { LanguageProvider } from './context/LanguageContext'
import { CartProvider } from './context/CartContext'
import { initMetaPixel, trackPageView, captureAttribution } from './utils/tracking'
import AnnouncementBar from './components/AnnouncementBar'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import CartDrawer from './components/CartDrawer'
import Toast from './components/Toast'
import Home from './pages/Home'
import Shop from './pages/Shop'
import BookDetails from './pages/BookDetails'
import Packages from './pages/Packages'
import PackageDetails from './pages/PackageDetails'
import CartPage from './pages/CartPage'
import Checkout from './pages/Checkout'
import OrderSuccess from './pages/OrderSuccess'
import TrackOrder from './pages/TrackOrder'
import Favorites from './pages/Favorites'
import About from './pages/About'
import Contact from './pages/Contact'
import LibraryEntry from './pages/LibraryEntry'
import NotFound from './pages/NotFound'

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
    initMetaPixel()
  }, [])

  return (
    <BrowserRouter>
      <LanguageProvider>
        <CartProvider>
          <RouteTracker />
          <Layout>
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
          </Layout>
          <CartDrawer />
          <Toast />
        </CartProvider>
      </LanguageProvider>
    </BrowserRouter>
  )
}
