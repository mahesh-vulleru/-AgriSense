import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout.jsx';
import LandingPage from '../pages/LandingPage.jsx';
import FarmerDashboard from '../pages/FarmerDashboard.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Authenticated/Farmer Dashboard Shell */}
      <Route path="/dashboard" element={<AppLayout />}>
        <Route index element={<FarmerDashboard />} />
      </Route>

      {/* Catch-all 404 Route */}
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
};

export default AppRoutes;

