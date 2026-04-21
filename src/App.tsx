import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";
import CustomerDashboard from "./pages/dashboards/CustomerDashboard.tsx";
import VendorDashboard from "./pages/dashboards/VendorDashboard.tsx";
import AdminDashboard from "./pages/dashboards/AdminDashboard.tsx";
import VendorOnboarding from "./pages/vendor/VendorOnboarding.tsx";
import AdminVendors from "./pages/admin/AdminVendors.tsx";
import BrowseCategories from "./pages/customer/BrowseCategories.tsx";
import CategoryVendors from "./pages/customer/CategoryVendors.tsx";
import NewBooking from "./pages/customer/NewBooking.tsx";
import MyBookings from "./pages/customer/MyBookings.tsx";
import VendorJobs from "./pages/vendor/VendorJobs.tsx";
import BookingDetail from "./pages/BookingDetail.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import { AuthProvider } from "./hooks/useAuth.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requiredRole="customer">
                  <CustomerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendor"
              element={
                <ProtectedRoute requiredRole="vendor">
                  <VendorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendor/jobs"
              element={
                <ProtectedRoute requiredRole="vendor">
                  <VendorJobs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendor/onboarding"
              element={
                <ProtectedRoute requiredRole="vendor">
                  <VendorOnboarding />
                </ProtectedRoute>
              }
            />
            <Route
              path="/services"
              element={
                <ProtectedRoute requiredRole="customer">
                  <BrowseCategories />
                </ProtectedRoute>
              }
            />
            <Route
              path="/services/:slug"
              element={
                <ProtectedRoute requiredRole="customer">
                  <CategoryVendors />
                </ProtectedRoute>
              }
            />
            <Route
              path="/book/new"
              element={
                <ProtectedRoute requiredRole="customer">
                  <NewBooking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings"
              element={
                <ProtectedRoute requiredRole="customer">
                  <MyBookings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings/:id"
              element={
                <ProtectedRoute>
                  <BookingDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/vendors"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminVendors />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
