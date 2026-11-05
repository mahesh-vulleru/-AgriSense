import { useState, useEffect, useCallback } from 'react';
import { checkApiHealth } from '../services/healthService.js';

export const useHealthCheck = (autoCheck = true, pollIntervalMs = 30000) => {
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'connected' | 'disconnected'
  const [healthData, setHealthData] = useState(null);
  const [error, setError] = useState(null);
  const [latency, setLatency] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const performCheck = useCallback(async () => {
    setStatus('loading');
    setError(null);

    const result = await checkApiHealth();

    setLastChecked(new Date());
    setLatency(result.latency);

    if (result.success && result.data?.success) {
      setStatus('connected');
      setHealthData(result.data);
      setError(null);
    } else {
      setStatus('disconnected');
      setError(result.error || 'Server responded with an unhealthy state');
      setHealthData(result.data || null);
    }
  }, []);

  useEffect(() => {
    if (!autoCheck) return;

    // Defer initial execution via macrotask to prevent synchronous setState during effect
    const timeoutId = setTimeout(() => {
      performCheck();
    }, 0);

    const intervalId = setInterval(() => {
      performCheck();
    }, pollIntervalMs);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [autoCheck, pollIntervalMs, performCheck]);

  return {
    status,
    healthData,
    error,
    latency,
    lastChecked,
    checkNow: performCheck,
  };
};

export default useHealthCheck;
