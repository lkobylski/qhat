import { useEffect, useState, useCallback, useRef } from 'react';
import { wsClient } from '../lib/wsClient';
import { WS_URL } from '../lib/constants';
import type { InboundMessage } from '../types/ws';

export function useWebSocket() {
  const [connected, setConnected] = useState(() => wsClient.connected);
  const connectedRef = useRef(wsClient.connected);

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

  // No disconnect on unmount — WS must persist across lobby→room navigation.
  // Pages explicitly call disconnect() when they want to tear down.

  return { connected, connect, disconnect, send };
}
