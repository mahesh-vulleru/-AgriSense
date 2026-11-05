import { BrowserRouter } from 'react-router-dom';
import { HealthProvider } from './context/HealthContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import AppRoutes from './routes/AppRoutes.jsx';

function App() {
  return (
    <BrowserRouter>
      <HealthProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </HealthProvider>
    </BrowserRouter>
  );
}

export default App;
