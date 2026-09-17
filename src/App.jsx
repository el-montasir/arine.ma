import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { CartProvider } from './context/CartContext'
import AnnouncementBar from './components/AnnouncementBar'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import CartDrawer from './components/CartDrawer'
import Toast from './components/Toast'
import Home from './pages/Home'
import Shop from './pages/Shop'
import BookDetails from './pages/BookDetails'
import CartPage from './pages/CartPage'
import Checkout from './pages/Checkout'
import OrderSuccess from './pages/OrderSuccess'
import About from './pages/About'
import Contact from './pages/Contact'
import Account from './pages/Account'
import LibraryEntry from './pages/LibraryEntry'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
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
  return (
    <BrowserRouter>
      <CartProvider>
        <ScrollToTop />
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/book/:id" element={<BookDetails />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-success" element={<OrderSuccess />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/account" element={<Account />} />
            <Route path="/library" element={<LibraryEntry />} />
          </Routes>
        </Layout>
        <CartDrawer />
        <Toast />
      </CartProvider>
    </BrowserRouter>
  )
}