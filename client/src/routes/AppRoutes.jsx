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
import NotFoundPage from '../pages/NotFoundPage.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import PublicRoute from './PublicRoute.jsx';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Public Authentication Pages (Redirects to /dashboard if already logged in) */}
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

      {/* Authenticated Dashboard Shell (Protected with JWT) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<FarmerDashboard />} />
        {/* Farm Management Routes */}
        <Route path="farms" element={<MyFarmsPage />} />
        <Route path="farms/new" element={<AddFarmPage />} />
        <Route path="farms/:id" element={<FarmDetailsPage />} />
        <Route path="farms/:id/edit" element={<EditFarmPage />} />
      </Route>

      {/* Catch-all 404 Route */}
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
};

export default AppRoutes;
