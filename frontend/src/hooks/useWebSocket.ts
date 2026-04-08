import { useEffect, useState, useCallback, useRef } from 'react';
import { wsClient } from '../lib/wsClient';
import { WS_URL } from '../lib/constants';
import type { InboundMessage } from '../types/ws';

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const connectedRef = useRef(false);

  useEffect(() => {
    const unsub = wsClient.onConnectionChange((val) => {
      connectedRef.current = val;
      setConnected(val);
    });
    return () => {
      unsub();
    };
  }, []);

  const connect = useCallback(() => {
    if (!connectedRef.current) {
      wsClient.connect(WS_URL);
    }
  }, []);

  const disconnect = useCallback(() => {
    wsClient.disconnect();
  }, []);

  const send = useCallback((msg: InboundMessage) => {
    wsClient.send(msg);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsClient.disconnect();
    };
  }, []);

  return { connected, connect, disconnect, send };
}
