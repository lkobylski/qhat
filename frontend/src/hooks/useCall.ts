import { useState, useCallback, useEffect, useRef } from 'react';
import { wsClient } from '../lib/wsClient';
import type { OutboundMessage } from '../types/ws';

export type CallState = 'idle' | 'calling' | 'incoming' | 'accepted';

interface CallerInfo {
  id: string;
  name: string;
  lang: string;
}

export interface MissedCall {
  id: number;
  name: string;
  lang: string;
  time: string;
}

let missedId = 0;

export function useCall() {
  const [callState, setCallState] = useState<CallState>('idle');
  const [incomingCaller, setIncomingCaller] = useState<CallerInfo | null>(null);
  const [targetRoomCode, setTargetRoomCode] = useState<string | null>(null);
  const [missedCalls, setMissedCalls] = useState<MissedCall[]>([]);
  const incomingCallerRef = useRef<CallerInfo | null>(null);
  const autoDeclineTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const callUser = useCallback((targetId: string) => {
    wsClient.send({ type: 'call_request', targetId });
    setCallState('calling');
  }, []);

  const acceptCall = useCallback(() => {
    if (!incomingCaller) return;
    wsClient.send({ type: 'call_accept', callerId: incomingCaller.id });
    if (autoDeclineTimer.current) {
      clearTimeout(autoDeclineTimer.current);
      autoDeclineTimer.current = null;
    }
  }, [incomingCaller]);

  const declineCall = useCallback(() => {
    if (!incomingCaller) return;
    wsClient.send({ type: 'call_decline', callerId: incomingCaller.id });
    setCallState('idle');
    setIncomingCaller(null);
    if (autoDeclineTimer.current) {
      clearTimeout(autoDeclineTimer.current);
      autoDeclineTimer.current = null;
    }
  }, [incomingCaller]);

  const cancelCall = useCallback(() => {
    wsClient.send({ type: 'call_cancel' });
    setCallState('idle');
  }, []);

  const reset = useCallback(() => {
    setCallState('idle');
    setIncomingCaller(null);
    setTargetRoomCode(null);
  }, []);

  useEffect(() => {
    const unsubIncoming = wsClient.on('call_incoming', (msg: OutboundMessage) => {
      const caller = {
        id: msg.callerId || '',
        name: msg.callerName || 'Unknown',
        lang: msg.callerLang || '',
      };
      setIncomingCaller(caller);
      incomingCallerRef.current = caller;
      setCallState('incoming');

      // Auto-decline after 30s → becomes missed call
      autoDeclineTimer.current = setTimeout(() => {
        wsClient.send({ type: 'call_decline', callerId: msg.callerId });
        setMissedCalls((prev) => [{
          id: ++missedId,
          name: msg.callerName || 'Unknown',
          lang: msg.callerLang || '',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }, ...prev].slice(0, 10));
        setCallState('idle');
        setIncomingCaller(null);
      }, 30000);
    });

    const unsubDeclined = wsClient.on('call_declined', () => {
      setCallState('idle');
    });

    const unsubCancelled = wsClient.on('call_cancelled', (msg: OutboundMessage) => {
      // Caller cancelled → missed call
      if (incomingCallerRef.current) {
        setMissedCalls((prev) => [{
          id: ++missedId,
          name: incomingCallerRef.current?.name || msg.callerName || 'Unknown',
          lang: incomingCallerRef.current?.lang || msg.callerLang || '',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }, ...prev].slice(0, 10));
      }
      setCallState('idle');
      setIncomingCaller(null);
      if (autoDeclineTimer.current) {
        clearTimeout(autoDeclineTimer.current);
        autoDeclineTimer.current = null;
      }
    });

    const unsubStart = wsClient.on('call_start', (msg: OutboundMessage) => {
      if (msg.roomCode) {
        setTargetRoomCode(msg.roomCode);
        setCallState('accepted');
      }
    });

    return () => {
      unsubIncoming();
      unsubDeclined();
      unsubCancelled();
      unsubStart();
      if (autoDeclineTimer.current) clearTimeout(autoDeclineTimer.current);
    };
  }, []);

  const clearMissedCalls = useCallback(() => setMissedCalls([]), []);

  return {
    callState,
    incomingCaller,
    targetRoomCode,
    missedCalls,
    callUser,
    acceptCall,
    declineCall,
    cancelCall,
    clearMissedCalls,
    reset,
  };
}
