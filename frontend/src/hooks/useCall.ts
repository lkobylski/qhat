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

const MISSED_CALLS_KEY = 'qhat_missed_calls';
const MISSED_CALLS_MAX = 10;

function loadMissedCalls(): MissedCall[] {
  try {
    const raw = localStorage.getItem(MISSED_CALLS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MissedCall[];
    if (!Array.isArray(parsed)) return [];
    // Reseed id counter so newly pushed entries stay unique.
    for (const m of parsed) if (typeof m.id === 'number' && m.id > missedId) missedId = m.id;
    return parsed.slice(0, MISSED_CALLS_MAX);
  } catch {
    return [];
  }
}

function saveMissedCalls(calls: MissedCall[]): void {
  try {
    localStorage.setItem(MISSED_CALLS_KEY, JSON.stringify(calls));
  } catch {
    // ignore quota / disabled storage
  }
}

export function useCall() {
  const [callState, setCallState] = useState<CallState>('idle');
  const [incomingCaller, setIncomingCaller] = useState<CallerInfo | null>(null);
  const [targetRoomCode, setTargetRoomCode] = useState<string | null>(null);
  const [missedCalls, setMissedCalls] = useState<MissedCall[]>(loadMissedCalls);
  const incomingCallerRef = useRef<CallerInfo | null>(null);
  const autoDeclineTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const callUser = useCallback((targetId: string) => {
    wsClient.send({ type: 'call_request', targetId });
    setCallState('calling');
  }, []);

  const acceptCall = useCallback(() => {
    if (!incomingCaller) return;
    wsClient.send({ type: 'call_accept', callerId: incomingCaller.id });
    incomingCallerRef.current = null;
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
    incomingCallerRef.current = null;
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
        setMissedCalls((prev) => {
          const next = [{
            id: ++missedId,
            name: msg.callerName || 'Unknown',
            lang: msg.callerLang || '',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }, ...prev].slice(0, MISSED_CALLS_MAX);
          saveMissedCalls(next);
          return next;
        });
        setCallState('idle');
        setIncomingCaller(null);
        incomingCallerRef.current = null;
      }, 30000);
    });

    const unsubDeclined = wsClient.on('call_declined', () => {
      setCallState('idle');
    });

    const unsubCancelled = wsClient.on('call_cancelled', (msg: OutboundMessage) => {
      // Caller cancelled (or disconnected) → missed call. Prefer the live
      // ref, but fall back to server-provided caller info so the entry is
      // still recorded if the ref was cleared (e.g. after a reload/reconnect).
      const name = incomingCallerRef.current?.name || msg.callerName;
      const lang = incomingCallerRef.current?.lang || msg.callerLang || '';
      if (name) {
        setMissedCalls((prev) => {
          const next = [{
            id: ++missedId,
            name,
            lang,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }, ...prev].slice(0, MISSED_CALLS_MAX);
          saveMissedCalls(next);
          return next;
        });
      }
      setCallState('idle');
      setIncomingCaller(null);
      incomingCallerRef.current = null;
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

  const clearMissedCalls = useCallback(() => {
    setMissedCalls([]);
    saveMissedCalls([]);
  }, []);

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
