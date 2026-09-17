import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import Spinner from './components/ui/Spinner.jsx'
import Login from './pages/Login.jsx'
import NotFound from './pages/NotFound.jsx'
import AdminLayout from './layouts/AdminLayout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Orders from './pages/Orders.jsx'
import OrderDetails from './pages/OrderDetails.jsx'
import Products from './pages/Products.jsx'
import ProductForm from './pages/ProductForm.jsx'
import Categories from './pages/Categories.jsx'
import Finance from './pages/Finance.jsx'
import Customers from './pages/Customers.jsx'
import Settings from './pages/Settings.jsx'

function RequireAuth({ children }) {
  const { admin, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner label="جارِ التحميل…" />
      </div>
    )
  }
  if (!admin) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/:id" element={<OrderDetails />} />
        <Route path="products" element={<Products />} />
        <Route path="products/new" element={<ProductForm />} />
        <Route path="products/:id/edit" element={<ProductForm />} />
        <Route path="categories" element={<Categories />} />
        <Route path="finance" element={<Finance />} />
        <Route path="customers" element={<Customers />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}