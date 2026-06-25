import { useEffect, useRef, useState, useCallback } from 'react';

export type Phase = 'BRIEFING' | 'SIMULATION' | 'ACQUISITION' | 'PODIUM';

export interface StudentRank {
  user_id: number;
  nombre: string;
  score: number;
  streak: number;
  last_result: string;
  submitted: boolean;
}

export interface LeaderboardPayload {
  session_id: string;
  rankings: StudentRank[];
  phase: Phase;
  phase_timer: number;
}

export interface WSMessage {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: Record<string, any>;
}

interface UseSessionSocketOptions {
  sessionId: string;
  userId: number;
  role: 'teacher' | 'student';
  onLeaderboard?: (data: LeaderboardPayload) => void;
  onPhaseChange?: (phase: Phase, timer: number) => void;
  onStudentJoin?: (userId: number, nombre: string) => void;
  onStudentLeave?: (userId: number) => void;
  onStudentReady?: (userId: number, ready: boolean) => void;
  onAllReady?: () => void;
  onError?: (code: string, message: string) => void;
  onSubmitResult?: (success: boolean, p_total: number, m_tiempo: number) => void;
}

export function useSessionSocket({
  sessionId,
  userId,
  role,
  onLeaderboard,
  onPhaseChange,
  onStudentJoin,
  onStudentLeave,
  onStudentReady,
  onAllReady,
  onError,
  onSubmitResult,
}: UseSessionSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const reconnectAttemptsRef = useRef(0);
  const manuallyDisconnectedRef = useRef(false);
  const activeSessionIdRef = useRef(sessionId);
  const maxReconnectDelay = 30000;

  const callbacksRef = useRef({
    onLeaderboard,
    onPhaseChange,
    onStudentJoin,
    onStudentLeave,
    onStudentReady,
    onAllReady,
    onError,
    onSubmitResult,
  });

  const handleMessage = useCallback((msg: WSMessage) => {
    const cb = callbacksRef.current;
    const payload = msg.payload || {};
    switch (msg.type) {
      case 'leaderboard':
        cb.onLeaderboard?.(payload as LeaderboardPayload);
        break;
      case 'phase_change':
        cb.onPhaseChange?.(payload.phase, payload.timer);
        break;
      case 'join':
        cb.onStudentJoin?.(payload.user_id, payload.nombre);
        break;
      case 'leave':
        cb.onStudentLeave?.(payload.user_id);
        break;
      case 'student_ready':
        cb.onStudentReady?.(payload.user_id, payload.ready);
        break;
      case 'all_ready':
        cb.onAllReady?.();
        break;
      case 'error':
        cb.onError?.(payload.code, payload.message);
        break;
      case 'submit':
        cb.onSubmitResult?.(payload.success, payload.p_total, payload.m_tiempo);
        break;
      case 'session_ended':
        cb.onError?.('SESSION_ENDED', 'La sesión ha terminado');
        break;
    }
  }, []);

  useEffect(() => {
    callbacksRef.current = {
      onLeaderboard,
      onPhaseChange,
      onStudentJoin,
      onStudentLeave,
      onStudentReady,
      onAllReady,
      onError,
      onSubmitResult,
    };
  }, [onLeaderboard, onPhaseChange, onStudentJoin, onStudentLeave, onStudentReady, onAllReady, onError, onSubmitResult]);

  const connect = useCallback((sessionIdOverride?: string) => {
    const activeSessionId = sessionIdOverride || sessionId;
    activeSessionIdRef.current = activeSessionId;

    if (wsRef.current?.readyState === WebSocket.OPEN) return;

const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';
  const wsUrl = `${WS_BASE}/ws?user_id=${userId}&role=${role}&nombre=User${userId}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setReconnecting(false);
      reconnectAttemptsRef.current = 0;
      const joinMsg: WSMessage = {
        type: 'join',
        payload: { session_id: activeSessionId, role },
      };
      ws.send(JSON.stringify(joinMsg));
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        handleMessage(msg);
      } catch (e) {
        console.error('Failed to parse WS message:', e);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      if (!manuallyDisconnectedRef.current) {
        setReconnecting(true);
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), maxReconnectDelay);
        reconnectAttemptsRef.current++;
        setTimeout(() => {
          connect(activeSessionIdRef.current);
        }, delay);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [sessionId, userId, role, handleMessage]);

  const send = useCallback((msg: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const submitSequence = useCallback((sequenceName: string, p_geo: number, p_ant: number, p_param: number, timeMs: number) => {
    send({
      type: 'submit',
      payload: {
        session_id: sessionId,
        sequence_name: sequenceName,
        p_geo,
        p_ant,
        p_param,
        time_ms: timeMs,
      },
    });
  }, [sessionId, send]);

  const setReady = useCallback(() => {
    send({ type: 'student_ready', payload: { session_id: sessionId } });
  }, [sessionId, send]);

  const startSession = useCallback(() => {
    send({ type: 'start', payload: { session_id: sessionId } });
  }, [sessionId, send]);

  const pauseSession = useCallback(() => {
    send({ type: 'pause', payload: { session_id: sessionId } });
  }, [sessionId, send]);

  const resumeSession = useCallback(() => {
    send({ type: 'resume', payload: { session_id: sessionId } });
  }, [sessionId, send]);

  const endSession = useCallback(() => {
    send({ type: 'end', payload: { session_id: sessionId } });
  }, [sessionId, send]);

  const disconnect = useCallback(() => {
    manuallyDisconnectedRef.current = true;
    setReconnecting(false);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connected,
    reconnecting,
    connect,
    disconnect,
    submitSequence,
    setReady,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
  };
}