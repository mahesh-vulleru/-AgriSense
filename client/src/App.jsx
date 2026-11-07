import { BrowserRouter } from 'react-router-dom';
import { HealthProvider } from './context/HealthContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import AppRoutes from './routes/AppRoutes.jsx';

function App() {
  return (
    <BrowserRouter>
      <HealthProvider>
        <AuthProvider>
          <NotificationProvider>
            <AppRoutes />
          </NotificationProvider>
        </AuthProvider>
      </HealthProvider>
    </BrowserRouter>
  );
}

export default App;
