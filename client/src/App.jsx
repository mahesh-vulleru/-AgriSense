import { BrowserRouter } from 'react-router-dom';
import { HealthProvider } from './context/HealthContext.jsx';
import AppRoutes from './routes/AppRoutes.jsx';

function App() {
  return (
    <BrowserRouter>
      <HealthProvider>
        <AppRoutes />
      </HealthProvider>
    </BrowserRouter>
  );
}

export default App;
