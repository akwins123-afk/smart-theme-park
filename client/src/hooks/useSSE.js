import { useState, useEffect } from 'react';

export function useSSE(url = 'http://localhost:5000/api/events') {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const [sqlQueries, setSqlQueries] = useState([]);

  useEffect(() => {
    let eventSource;
    try {
      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        setConnected(true);
      };

      eventSource.onerror = (err) => {
        setConnected(false);
      };

      // General messages
      eventSource.addEventListener('connected', (e) => {
        setConnected(true);
      });

      // Wallet update event
      eventSource.addEventListener('wallet_updated', (e) => {
        const data = JSON.parse(e.data);
        setLastEvent({ type: 'wallet_updated', data, time: Date.now() });
      });

      // Queue update event
      eventSource.addEventListener('queue_updated', (e) => {
        const data = JSON.parse(e.data);
        setLastEvent({ type: 'queue_updated', data, time: Date.now() });
      });

      // Locker update event
      eventSource.addEventListener('locker_updated', (e) => {
        const data = JSON.parse(e.data);
        setLastEvent({ type: 'locker_updated', data, time: Date.now() });
      });

      // Turnstile tap event
      eventSource.addEventListener('turnstile_tap', (e) => {
        const data = JSON.parse(e.data);
        setLastEvent({ type: 'turnstile_tap', data, time: Date.now() });
      });

      // Wristband status changed event
      eventSource.addEventListener('wristband_status_changed', (e) => {
        const data = JSON.parse(e.data);
        setLastEvent({ type: 'wristband_status_changed', data, time: Date.now() });
      });

      // SQL Query execution event for Live SQL Inspector
      eventSource.addEventListener('sql_executed', (e) => {
        const data = JSON.parse(e.data);
        setSqlQueries((prev) => [data, ...prev.slice(0, 49)]); // keep last 50 queries
      });

    } catch (err) {
      console.error('SSE initialization error:', err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [url]);

  return { connected, lastEvent, sqlQueries, clearQueries: () => setSqlQueries([]) };
}
