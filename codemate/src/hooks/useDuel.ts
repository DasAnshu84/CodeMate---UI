import { useCallback, useEffect, useRef, useState } from 'react';
import {
  connect,
  disconnect,
  sendCodeUpdate,
  submitCode,
  sendChat,
  type DuelPhase,
  type SubmissionReceived,
  type TestCaseExecutionUpdate,
  type SubmissionFinalResult,
  type OpponentSubmission,
  type OpponentActivity,
  type DuelEndPayload,
  type ChatMessage,
} from '../lib/duel';

/* ── Language Map ── */

const MONACO_LANG_MAP: Record<string, string> = {
  PYTHON: 'python',
  JAVASCRIPT: 'javascript',
  CPP: 'cpp',
  JAVA: 'java',
};

export function toMonacoLang(lang: string): string {
  return MONACO_LANG_MAP[lang.toUpperCase()] ?? 'python';
}

/* ── Types for Real-Time Execution ── */

export interface RealtimeTestCase {
  index: number;
  testCaseUuid?: string;
  isHidden?: boolean;
  status: 'PENDING' | 'ACCEPTED' | 'WRONG_ANSWER' | 'TIME_LIMIT_EXCEEDED' | 'COMPILATION_ERROR' | string;
  executionTimeMs: number | null;
  memoryUsedKb: number | null;
}

export interface ActiveSubmissionState {
  submissionUuid: string;
  totalTestCases: number;
  completedTestCases: number;
  isEvaluating: boolean;
  testCases: Record<number, RealtimeTestCase>;
  finalResult: SubmissionFinalResult | null;
}

/* ── Return Type ── */

export interface UseDuelReturn {
  phase: DuelPhase;
  error: string | null;
  reconnectAttempt: number;
  ownUserId: string | null;
  ownScore: number;
  ownSubmission: ActiveSubmissionState | null;
  opponentActivity: OpponentActivity | null;
  opponentSubmission: OpponentSubmission | null;
  duelEnd: DuelEndPayload | null;
  chatMessages: ChatMessage[];
  elapsed: number;
  sendCode: (code: string, language: string) => void;
  submit: (code: string, language: string) => void;
  chat: (message: string) => void;
}

/* ── Hook ── */

export function useDuel(duelId: string, token: string): UseDuelReturn {
  const [phase, setPhase] = useState<DuelPhase>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [ownUserId, setOwnUserId] = useState<string | null>(null);
  const [ownScore, setOwnScore] = useState(0);
  
  const [ownSubmission, setOwnSubmission] = useState<ActiveSubmissionState | null>(null);
  const [opponentActivity, setOpponentActivity] = useState<OpponentActivity | null>(null);
  const [opponentSubmission, setOpponentSubmission] = useState<OpponentSubmission | null>(null);
  const [duelEnd, setDuelEnd] = useState<DuelEndPayload | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [elapsed, setElapsed] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

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

  useEffect(() => {
    connect(duelId, token, {
      onPhaseChange: (p) => {
        setPhase(p);
        if (p === 'ended' || p === 'error') {
          stopTimer();
        }
      },
      onConnected: (userId) => {
        setOwnUserId(userId);
        startTimer();
      },
      onUserJoined: () => {},
      onUserLeft: () => {},
      onOpponentActivity: (activity) => {
        setOpponentActivity(activity);
      },
      onSubmissionReceived: (data: SubmissionReceived) => {
        setPhase('submitting');
        const initialTestCases: Record<number, RealtimeTestCase> = {};
        for (let i = 1; i <= data.totalTestCases; i++) {
          initialTestCases[i] = {
            index: i,
            status: 'PENDING',
            executionTimeMs: null,
            memoryUsedKb: null,
          };
        }
        setOwnSubmission({
          submissionUuid: data.submissionUuid,
          totalTestCases: data.totalTestCases,
          completedTestCases: 0,
          isEvaluating: true,
          testCases: initialTestCases,
          finalResult: null,
        });
      },
      onTestCaseExecutionUpdate: (data: TestCaseExecutionUpdate) => {
        if (data.isSubmitter) {
          setOwnSubmission((prev) => {
            if (!prev || prev.submissionUuid !== data.submissionUuid) return prev;
            const updatedCases = {
              ...prev.testCases,
              [data.testCaseIndex]: {
                index: data.testCaseIndex,
                testCaseUuid: data.testCaseUuid,
                isHidden: data.isHidden,
                status: data.status,
                executionTimeMs: data.executionTimeMs,
                memoryUsedKb: data.memoryUsedKb,
              },
            };
            return {
              ...prev,
              completedTestCases: data.completedTestCases,
              totalTestCases: data.totalTestCases,
              testCases: updatedCases,
            };
          });
        } else {
          setOpponentSubmission((prev) => ({
            userId: data.userId,
            total: data.totalTestCases,
            completed: data.completedTestCases,
            passed: (prev?.passed ?? 0) + (data.status === 'ACCEPTED' ? 1 : 0),
            status: data.status,
            message: `Evaluated ${data.completedTestCases}/${data.totalTestCases} test cases`,
            timestamp: new Date().toISOString(),
          }));
        }
      },
      onSubmissionFinalResult: (data: SubmissionFinalResult) => {
        if (data.isSubmitter) {
          setPhase('active');
          setOwnScore(data.score);
          setOwnSubmission((prev) => {
            if (!prev || prev.submissionUuid !== data.submissionUuid) {
              return {
                submissionUuid: data.submissionUuid,
                totalTestCases: data.totalTestCases,
                completedTestCases: data.passedTestCases,
                isEvaluating: false,
                testCases: {},
                finalResult: data,
              };
            }
            return {
              ...prev,
              isEvaluating: false,
              finalResult: data,
            };
          });
        } else {
          setOpponentSubmission({
            userId: data.userId,
            total: data.totalTestCases,
            completed: data.totalTestCases,
            passed: data.passedTestCases,
            status: data.status,
            message: `${data.passedTestCases}/${data.totalTestCases} test cases passed (${data.status})`,
            timestamp: new Date().toISOString(),
          });
        }
      },
      onOpponentSubmitted: (sub) => {
        setOpponentSubmission({
          userId: sub.userId,
          total: sub.total,
          completed: 0,
          passed: 0,
          status: 'EVALUATING',
          message: sub.message,
          timestamp: sub.timestamp,
        });
      },
      onDuelEnded: (payload) => {
        setDuelEnd(payload);
        setPhase('ended');
        stopTimer();
      },
      onChatMessage: (msg) => {
        setChatMessages((prev) => [...prev, msg]);
      },
      onError: (msg) => {
        setError(msg);
      },
      onReconnecting: (attempt) => {
        setReconnectAttempt(attempt);
      },
    });

    return () => {
      stopTimer();
      disconnect();
    };
  }, [duelId, token, startTimer, stopTimer]);

  const sendCode = useCallback((code: string, language: string) => {
    sendCodeUpdate(code, language);
  }, []);

  const submit = useCallback((code: string, language: string) => {
    submitCode(code, language);
  }, []);

  const chat = useCallback((message: string) => {
    sendChat(message);
  }, []);

  return {
    phase,
    error,
    reconnectAttempt,
    ownUserId,
    ownScore,
    ownSubmission,
    opponentActivity,
    opponentSubmission,
    duelEnd,
    chatMessages,
    elapsed,
    sendCode,
    submit,
    chat,
  };
}

