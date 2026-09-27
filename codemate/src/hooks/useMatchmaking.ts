import { useCallback, useEffect, useRef, useState } from 'react';
import {
  connect,
  disconnect,
  joinQueue,
  leaveQueue,
  isConnected,
  type MatchmakingPhase,
  type MatchFoundPayload,
  type QueueConfig,
} from '../lib/matchmaking';

interface UseMatchmakingReturn {
  /** Current lifecycle phase */
  phase: MatchmakingPhase;
  /** Error message (if any) */
  error: string | null;
  /** Match result once found */
  match: MatchFoundPayload | null;
  /** Queue metadata once joined */
  queueInfo: { requestId: string; skillRating: number; language: string; difficulty: string } | null;
  /** Seconds elapsed since entering the queue */
  elapsed: number;
  /** Open WS connection + immediately join queue */
  startSearching: (token: string, config: QueueConfig) => void;
  /** Send leave_queue + tear down WS */
  cancel: () => void;
  /** Reset back to idle after error / expiry */
  reset: () => void;
}

export function useMatchmaking(): UseMatchmakingReturn {
  const [phase, setPhase] = useState<MatchmakingPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<MatchFoundPayload | null>(null);
  const [queueInfo, setQueueInfo] = useState<UseMatchmakingReturn['queueInfo']>(null);
  const [elapsed, setElapsed] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const joinRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearJoinRetry = useCallback(() => {
    if (joinRetryRef.current) {
      clearTimeout(joinRetryRef.current);
      joinRetryRef.current = null;
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      clearJoinRetry();
      disconnect();
    };
  }, [stopTimer, clearJoinRetry]);

  const startSearching = useCallback(
    (token: string, config: QueueConfig) => {
      setError(null);
      setMatch(null);
      setQueueInfo(null);
      clearJoinRetry();

      connect(token, {
        onPhaseChange: (p) => {
          setPhase(p);
          if (p === 'match_found' || p === 'expired' || p === 'error' || p === 'idle') {
            stopTimer();
          }
        },
        onMatchFound: (payload) => {
          setMatch(payload);
        },
        onError: (msg) => {
          setError(msg);
        },
        onQueueJoined: (info) => {
          setQueueInfo(info);
          startTimer();
        },
        onExpired: () => {
          stopTimer();
        },
      });

      // Poll until the WS is open, then send join_queue
      const tryJoin = () => {
        if (isConnected()) {
          joinQueue(config);
        } else {
          joinRetryRef.current = setTimeout(tryJoin, 100);
        }
      };
      joinRetryRef.current = setTimeout(tryJoin, 150);
    },
    [startTimer, stopTimer, clearJoinRetry],
  );

  const cancel = useCallback(() => {
    stopTimer();
    clearJoinRetry();
    leaveQueue();
    // Give the server a moment to process, then disconnect
    setTimeout(() => {
      disconnect();
      setPhase('idle');
      setQueueInfo(null);
    }, 200);
  }, [stopTimer, clearJoinRetry]);

  const reset = useCallback(() => {
    stopTimer();
    clearJoinRetry();
    disconnect();
    setPhase('idle');
    setError(null);
    setMatch(null);
    setQueueInfo(null);
    setElapsed(0);
  }, [stopTimer, clearJoinRetry]);

  return { phase, error, match, queueInfo, elapsed, startSearching, cancel, reset };
}
