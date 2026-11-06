import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout.jsx';
import LandingPage from '../pages/LandingPage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import RegisterPage from '../pages/RegisterPage.jsx';
import FarmerDashboard from '../pages/FarmerDashboard.jsx';
import MyFarmsPage from '../pages/farms/MyFarmsPage.jsx';
import AddFarmPage from '../pages/farms/AddFarmPage.jsx';
import FarmDetailsPage from '../pages/farms/FarmDetailsPage.jsx';
import EditFarmPage from '../pages/farms/EditFarmPage.jsx';
import WeatherAdvisoryPage from '../pages/weather/WeatherAdvisoryPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import PublicRoute from './PublicRoute.jsx';
import GenericModulePage from '../pages/portal/GenericModulePage.jsx';
import ExpertDashboard from '../pages/portal/ExpertDashboard.jsx';
import AdminDashboard from '../pages/portal/AdminDashboard.jsx';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Landing & Informational Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/about" element={<LandingPage />} />
      <Route path="/features" element={<LandingPage />} />

      {/* Public Authentication Pages (Redirects to role portal if already logged in) */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />

      {/* ========================================================= */}
      {/* 1. FARMER PORTAL ROUTES (Protected)                      */}
      {/* ========================================================= */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['farmer', 'expert', 'admin']}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<FarmerDashboard />} />

        {/* Farm Management Routes */}
        <Route path="farms" element={<MyFarmsPage />} />
        <Route path="farms/new" element={<AddFarmPage />} />
        <Route path="farms/add" element={<AddFarmPage />} />
        <Route path="farms/:id" element={<FarmDetailsPage />} />
        <Route path="farms/:id/edit" element={<EditFarmPage />} />

        {/* Crop Management Routes */}
        <Route path="crops" element={<GenericModulePage />} />
        <Route path="crops/new" element={<GenericModulePage />} />
        <Route path="crops/add" element={<GenericModulePage />} />
        <Route path="crops/:id" element={<GenericModulePage />} />
        <Route path="crops/:id/edit" element={<GenericModulePage />} />

        {/* Agricultural Precision Modules */}
        <Route path="monitoring" element={<GenericModulePage />} />
        <Route path="soil-analysis" element={<GenericModulePage />} />
        <Route path="irrigation" element={<GenericModulePage />} />
        <Route path="weather" element={<WeatherAdvisoryPage />} />
        <Route path="disease-detection" element={<GenericModulePage />} />
        <Route path="reports" element={<GenericModulePage />} />
        <Route path="notifications" element={<GenericModulePage />} />
        <Route path="consultation" element={<GenericModulePage />} />
        <Route path="profile" element={<GenericModulePage />} />
        <Route path="settings" element={<GenericModulePage />} />
      </Route>

      {/* ========================================================= */}
      {/* 2. EXPERT PORTAL ROUTES (Protected)                      */}
      {/* ========================================================= */}
      <Route
        path="/expert"
        element={
          <ProtectedRoute allowedRoles={['expert', 'admin']}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/expert/dashboard" replace />} />
        <Route path="dashboard" element={<ExpertDashboard />} />
        <Route path="consultations" element={<GenericModulePage />} />
        <Route path="consultations/:id" element={<GenericModulePage />} />
        <Route path="profile" element={<GenericModulePage />} />
      </Route>

      {/* ========================================================= */}
      {/* 3. ADMIN PORTAL ROUTES (Protected - Admin Only)          */}
      {/* ========================================================= */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<GenericModulePage />} />
        <Route path="farmers" element={<GenericModulePage />} />
        <Route path="experts" element={<GenericModulePage />} />
        <Route path="farms" element={<GenericModulePage />} />
        <Route path="crops" element={<GenericModulePage />} />
        <Route path="disease-detections" element={<GenericModulePage />} />
        <Route path="consultations" element={<GenericModulePage />} />
        <Route path="notifications" element={<GenericModulePage />} />
        <Route path="reports" element={<GenericModulePage />} />
        <Route path="settings" element={<GenericModulePage />} />
      </Route>

      {/* Catch-all 404 Route */}
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
};

export default AppRoutes;
