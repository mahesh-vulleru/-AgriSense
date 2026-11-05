import { useHealthCheck } from '../hooks/useHealthCheck.js';
import { HealthContext } from './healthContextInstance.js';

export const HealthProvider = ({ children }) => {
  const health = useHealthCheck(true, 30000);

  return (
    <HealthContext.Provider value={health}>
      {children}
    </HealthContext.Provider>
  );
};

export default HealthProvider;
