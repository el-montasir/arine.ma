import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import { useLanguage } from './context/LanguageContext.jsx'
import Spinner from './components/ui/Spinner.jsx'
import PermissionGate from './components/PermissionGate.jsx'
import Login from './pages/Login.jsx'
import NotFound from './pages/NotFound.jsx'
import AdminLayout from './layouts/AdminLayout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Orders from './pages/Orders.jsx'
import OrderDetails from './pages/OrderDetails.jsx'
import Products from './pages/Products.jsx'
import ProductForm from './pages/ProductForm.jsx'
import Packages from './pages/Packages.jsx'
import PackageForm from './pages/PackageForm.jsx'
import Categories from './pages/Categories.jsx'
import Finance from './pages/Finance.jsx'
import Customers from './pages/Customers.jsx'
import Banners from './pages/Banners.jsx'
import StoreSettings from './pages/StoreSettings.jsx'
import ShippingSettings from './pages/ShippingSettings.jsx'
import Settings from './pages/Settings.jsx'
import AdminTeam from './pages/AdminTeam.jsx'
import ActivityLog from './pages/ActivityLog.jsx'
import SecuritySettings from './pages/SecuritySettings.jsx'

function RequireAuth({ children }) {
  const { admin, loading } = useAuth()
  const { t } = useLanguage()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-950">
        <Spinner label={t('loadingData')} />
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

        <Route
          path="dashboard"
          element={
            <PermissionGate permission="DASHBOARD_VIEW" showDeniedView>
              <Dashboard />
            </PermissionGate>
          }
        />

        <Route
          path="orders"
          element={
            <PermissionGate permission="ORDERS_VIEW" showDeniedView>
              <Orders />
            </PermissionGate>
          }
        />
        <Route
          path="orders/:id"
          element={
            <PermissionGate permission="ORDERS_VIEW" showDeniedView>
              <OrderDetails />
            </PermissionGate>
          }
        />

        <Route
          path="products"
          element={
            <PermissionGate permission="PRODUCTS_VIEW" showDeniedView>
              <Products />
            </PermissionGate>
          }
        />
        <Route
          path="products/new"
          element={
            <PermissionGate permission="PRODUCTS_CREATE" showDeniedView>
              <ProductForm />
            </PermissionGate>
          }
        />
        <Route
          path="products/:id/edit"
          element={
            <PermissionGate permission="PRODUCTS_UPDATE" showDeniedView>
              <ProductForm />
            </PermissionGate>
          }
        />

        <Route
          path="packages"
          element={
            <PermissionGate permission="PACKAGES_VIEW" showDeniedView>
              <Packages />
            </PermissionGate>
          }
        />
        <Route
          path="packages/new"
          element={
            <PermissionGate permission="PACKAGES_CREATE" showDeniedView>
              <PackageForm />
            </PermissionGate>
          }
        />
        <Route
          path="packages/:id/edit"
          element={
            <PermissionGate permission="PACKAGES_UPDATE" showDeniedView>
              <PackageForm />
            </PermissionGate>
          }
        />

        <Route
          path="categories"
          element={
            <PermissionGate permission="CATEGORIES_VIEW" showDeniedView>
              <Categories />
            </PermissionGate>
          }
        />

        <Route
          path="finance"
          element={
            <PermissionGate permission="FINANCE_VIEW" showDeniedView>
              <Finance />
            </PermissionGate>
          }
        />

        <Route
          path="customers"
          element={
            <PermissionGate permission="CUSTOMERS_VIEW" showDeniedView>
              <Customers />
            </PermissionGate>
          }
        />

        <Route
          path="banners"
          element={
            <PermissionGate permission="BANNERS_VIEW" showDeniedView>
              <Banners />
            </PermissionGate>
          }
        />

        <Route
          path="admin-team"
          element={
            <PermissionGate permission="ADMIN_USERS_VIEW" showDeniedView>
              <AdminTeam />
            </PermissionGate>
          }
        />

        <Route
          path="activity-log"
          element={
            <PermissionGate permission="ACTIVITY_LOG_VIEW" showDeniedView>
              <ActivityLog />
            </PermissionGate>
          }
        />

        <Route
          path="security"
          element={
            <SecuritySettings />
          }
        />

        <Route
          path="store-settings"
          element={
            <PermissionGate permission="STORE_SETTINGS_VIEW" showDeniedView>
              <StoreSettings />
            </PermissionGate>
          }
        />

        <Route
          path="shipping-settings"
          element={
            <PermissionGate permission="SHIPPING_VIEW" showDeniedView>
              <ShippingSettings />
            </PermissionGate>
          }
        />

        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
