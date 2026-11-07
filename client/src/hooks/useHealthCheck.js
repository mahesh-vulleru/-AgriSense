import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { checkApiHealth } from '../services/healthService.js';

export const useHealthCheck = (autoCheck = true, pollIntervalMs = 30000) => {
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'connected' | 'disconnected'
  const [healthData, setHealthData] = useState(null);
  const [error, setError] = useState(null);
  const [latency, setLatency] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const isCheckingRef = useRef(false);

  const performCheck = useCallback(async (isManual = false) => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    // Only set loading if initial or manual to avoid background flicker
    if (isManual || status === 'idle') {
      setStatus('loading');
    }
    setError(null);

    try {
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
    } catch (err) {
      setStatus('disconnected');
      setError(err.message || 'Health check failed');
    } finally {
      isCheckingRef.current = false;
    }
  }, [status]);

  useEffect(() => {
    if (!autoCheck) return;

    // Defer initial execution via macrotask
    const timeoutId = setTimeout(() => {
      performCheck(false);
    }, 100);

    const intervalId = setInterval(() => {
      performCheck(false);
    }, pollIntervalMs);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [autoCheck, pollIntervalMs, performCheck]);

  const checkNow = useCallback(() => performCheck(true), [performCheck]);

  return useMemo(
    () => ({
      status,
      healthData,
      error,
      latency,
      lastChecked,
      checkNow,
    }),
    [status, healthData, error, latency, lastChecked, checkNow]
  );
};

export default useHealthCheck;
