import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import { useLanguage } from './context/LanguageContext.jsx'
import { useAdminFavicon } from './hooks/useAdminFavicon.js'
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
import MarketingOverview from './pages/MarketingOverview.jsx'
import MarketingCampaigns from './pages/MarketingCampaigns.jsx'
import MarketingTracking from './pages/MarketingTracking.jsx'
import MarketingAttribution from './pages/MarketingAttribution.jsx'
import MarketingCatalog from './pages/MarketingCatalog.jsx'
import MarketingSettings from './pages/MarketingSettings.jsx'
import Stock from './pages/Stock.jsx'
import Suppliers from './pages/Suppliers.jsx'
import SupplierDetails from './pages/SupplierDetails.jsx'
import Purchases from './pages/Purchases.jsx'
import CreatePurchase from './pages/CreatePurchase.jsx'
import PurchaseDetails from './pages/PurchaseDetails.jsx'
import Payments from './pages/Payments.jsx'
import PurchaseReturns from './pages/PurchaseReturns.jsx'
import PurchaseReturnDetails from './pages/PurchaseReturnDetails.jsx'

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
  useAdminFavicon()

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
          path="stock"
          element={
            <PermissionGate permission="STOCK_VIEW" showDeniedView>
              <Stock />
            </PermissionGate>
          }
        />

        {/* Procurement / Suppliers */}
        <Route
          path="suppliers"
          element={
            <PermissionGate permission="SUPPLIERS_VIEW" showDeniedView>
              <Suppliers />
            </PermissionGate>
          }
        />
        <Route
          path="suppliers/:id"
          element={
            <PermissionGate permission="SUPPLIERS_VIEW" showDeniedView>
              <SupplierDetails />
            </PermissionGate>
          }
        />

        <Route
          path="purchases"
          element={
            <PermissionGate permission="PURCHASES_VIEW" showDeniedView>
              <Purchases />
            </PermissionGate>
          }
        />
        <Route
          path="purchases/new"
          element={
            <PermissionGate permission="PURCHASES_MANAGE" showDeniedView>
              <CreatePurchase />
            </PermissionGate>
          }
        />
        <Route
          path="purchases/:id"
          element={
            <PermissionGate permission="PURCHASES_VIEW" showDeniedView>
              <PurchaseDetails />
            </PermissionGate>
          }
        />

        <Route
          path="payments"
          element={
            <PermissionGate permission="PAYMENTS_VIEW" showDeniedView>
              <Payments />
            </PermissionGate>
          }
        />

        <Route
          path="purchase-returns"
          element={
            <PermissionGate permission="RETURNS_VIEW" showDeniedView>
              <PurchaseReturns />
            </PermissionGate>
          }
        />
        <Route
          path="purchase-returns/:id"
          element={
            <PermissionGate permission="RETURNS_VIEW" showDeniedView>
              <PurchaseReturnDetails />
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

        {/* Marketing & Meta Ads */}
        <Route
          path="marketing"
          element={
            <PermissionGate permission="MARKETING_VIEW" showDeniedView>
              <MarketingOverview />
            </PermissionGate>
          }
        />
        <Route
          path="marketing/campaigns"
          element={
            <PermissionGate permission="MARKETING_VIEW" showDeniedView>
              <MarketingCampaigns />
            </PermissionGate>
          }
        />
        <Route
          path="marketing/tracking"
          element={
            <PermissionGate permission="MARKETING_VIEW" showDeniedView>
              <MarketingTracking />
            </PermissionGate>
          }
        />
        <Route
          path="marketing/attribution"
          element={
            <PermissionGate permission="MARKETING_VIEW" showDeniedView>
              <MarketingAttribution />
            </PermissionGate>
          }
        />
        <Route
          path="marketing/catalog"
          element={
            <PermissionGate permission="MARKETING_VIEW" showDeniedView>
              <MarketingCatalog />
            </PermissionGate>
          }
        />
        <Route
          path="marketing/settings"
          element={
            <PermissionGate permission="MARKETING_VIEW" showDeniedView>
              <MarketingSettings />
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
