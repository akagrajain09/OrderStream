import { useState, useEffect, useRef, useCallback } from 'react';

const RECONNECT_DELAY_MS = 3000;

/**
 * Custom hook that manages a persistent WebSocket connection with
 * automatic reconnection on disconnect or error.
 *
 * @param {string} url  WebSocket URL (ws:// or wss://)
 * @returns {{ messages: object[], status: 'connecting'|'connected'|'disconnected' }}
 */
export function useWebSocket(url) {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('connecting');
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const isMounted = useRef(true);

  const connect = useCallback(() => {
    if (!isMounted.current) return;

    setStatus('connecting');
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMounted.current) return;
      setStatus('connected');
      console.log('[WS] Connected');
    };

    ws.onmessage = (event) => {
      if (!isMounted.current) return;
      try {
        const data = JSON.parse(event.data);
        // Skip the initial handshake message from server
        if (data.type !== 'CONNECTED') {
          setMessages((prev) => [data, ...prev].slice(0, 200)); // keep last 200 events
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (!isMounted.current) return;
      setStatus('disconnected');
      console.log(`[WS] Disconnected. Reconnecting in ${RECONNECT_DELAY_MS}ms...`);
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
      ws.close();
    };
  }, [url]);

  useEffect(() => {
    isMounted.current = true;
    connect();

    return () => {
      isMounted.current = false;
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { messages, status };
}
