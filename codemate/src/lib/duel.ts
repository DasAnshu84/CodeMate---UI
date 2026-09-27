/**
 * Duel WebSocket service.
 *
 * All duel WS logic lives here — never inside components or hooks.
 * Uses query-param auth: ws://<host>/duel/<duelId>/?token=<jwt>
 *
 * Features:
 *  - Auto-reconnection with exponential backoff (1s → 16s, max 5 attempts)
 *  - Debounced code updates (300ms)
 *  - Clean teardown on disconnect()
 */

import { WS_URL } from './env';

/* ── Types ── */

export interface SubmissionReceived {
  submissionUuid: string;
  userId: string;
  totalTestCases: number;
  message: string;
}

export interface TestCaseExecutionUpdate {
  submissionUuid: string;
  executionUuid: string;
  testCaseUuid: string;
  testCaseIndex: number;
  isHidden: boolean;
  status: string;
  executionTimeMs: number | null;
  memoryUsedKb: number | null;
  completedTestCases: number;
  totalTestCases: number;
  userId: string;
  isSubmitter: boolean;
}

export interface SubmissionFinalResult {
  submissionUuid: string;
  userId: string;
  isSubmitter: boolean;
  status: string;
  score: number;
  passedTestCases: number;
  totalTestCases: number;
  executionTimeMs: number | null;
  memoryUsedKb: number | null;
}

export interface OpponentSubmission {
  userId: string;
  total: number;
  completed?: number;
  passed?: number;
  status?: string;
  message: string;
  timestamp: string;
}

export interface OpponentActivity {
  userId: string;
  code?: string;
  codeLength: number;
  language: string;
  timestamp: string;
}

export interface DuelEndPayload {
  winnerId: string;
  finalScores: Record<string, number>;
  message: string;
  timestamp: string;
}

export interface ChatMessage {
  userId: string;
  message: string;
  timestamp: string;
}

export type DuelPhase =
  | 'connecting'
  | 'reconnecting'
  | 'active'
  | 'submitting'
  | 'ended'
  | 'error';

/** Discriminated union of every server→client message (v1.1) */
export type DuelServerMessage =
  | { type: 'connection_established'; message: string; user_id: string; duel_id: string }
  | { type: 'user_joined'; user_id: string; message: string; timestamp: string }
  | { type: 'user_left'; user_id: string; message: string; timestamp: string }
  | { type: 'opponent_code_update'; user_id: string; code?: string; code_length: number; language: string; timestamp: string }
  | { type: 'submission_received'; submission_uuid: string; user_id: string; total_test_cases: number; message: string }
  | { type: 'opponent_submitted'; user_id: string; total: number; message: string; timestamp: string }
  | { type: 'test_case_execution_update'; submission_uuid: string; execution_uuid: string; test_case_uuid: string; test_case_index: number; is_hidden: boolean; status: string; execution_time_ms: number | null; memory_used_kb: number | null; completed_test_cases: number; total_test_cases: number; user_id: string; is_submitter: boolean }
  | { type: 'submission_final_result'; submission_uuid: string; user_id: string; is_submitter: boolean; status: string; score: number; passed_test_cases: number; total_test_cases: number; execution_time_ms: number | null; memory_used_kb: number | null }
  | { type: 'duel_ended'; winner_id: string; final_scores: Record<string, number>; message: string; timestamp: string }
  | { type: 'chat_message'; user_id: string; message: string; timestamp: string }
  | { type: 'error'; message: string };

/* ── Callbacks ── */

export interface DuelCallbacks {
  onPhaseChange: (phase: DuelPhase) => void;
  onConnected: (userId: string, duelId: string) => void;
  onUserJoined: (userId: string) => void;
  onUserLeft: (userId: string) => void;
  onOpponentActivity: (activity: OpponentActivity) => void;
  onSubmissionReceived: (data: SubmissionReceived) => void;
  onTestCaseExecutionUpdate: (data: TestCaseExecutionUpdate) => void;
  onSubmissionFinalResult: (data: SubmissionFinalResult) => void;
  onOpponentSubmitted: (submission: OpponentSubmission) => void;
  onDuelEnded: (payload: DuelEndPayload) => void;
  onChatMessage: (msg: ChatMessage) => void;
  onError: (message: string) => void;
  onReconnecting: (attempt: number) => void;
}

/* ── Internal State ── */

let ws: WebSocket | null = null;
let manualClose = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempt = 0;
let codeUpdateTimer: ReturnType<typeof setTimeout> | null = null;

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 16000;

// Stored for reconnection
let storedDuelId = '';
let storedToken = '';
let storedCallbacks: DuelCallbacks | null = null;

/* ── URL Builder ── */

function buildWsUrl(duelId: string, token: string): string {
  const base = WS_URL.replace(/\/$/, '');
  return `${base}/duel/${duelId}/?token=${encodeURIComponent(token)}`;
}

/* ── Connect ── */

export function connect(duelId: string, token: string, callbacks: DuelCallbacks): void {
  disconnect();
  manualClose = false;
  reconnectAttempt = 0;
  storedDuelId = duelId;
  storedToken = token;
  storedCallbacks = callbacks;

  openConnection(callbacks);
}

function openConnection(callbacks: DuelCallbacks): void {
  if (reconnectAttempt === 0) {
    callbacks.onPhaseChange('connecting');
  } else {
    callbacks.onPhaseChange('reconnecting');
    callbacks.onReconnecting(reconnectAttempt);
  }

  const url = buildWsUrl(storedDuelId, storedToken);
  ws = new WebSocket(url);

  ws.onopen = () => {
    reconnectAttempt = 0;
  };

  ws.onmessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data as string) as DuelServerMessage;
      handleMessage(data, callbacks);
    } catch {
      callbacks.onError('Failed to parse server message');
    }
  };

  ws.onerror = () => {
    // onerror is always followed by onclose, so we handle reconnection there
  };

  ws.onclose = (event: CloseEvent) => {
    ws = null;
    if (manualClose) return;

    if (event.code !== 1000 && event.code !== 1001) {
      attemptReconnect(callbacks);
    }
  };
}

/* ── Reconnection ── */

function attemptReconnect(callbacks: DuelCallbacks): void {
  reconnectAttempt++;

  if (reconnectAttempt > MAX_RECONNECT_ATTEMPTS) {
    callbacks.onError(`Connection lost after ${MAX_RECONNECT_ATTEMPTS} reconnection attempts`);
    callbacks.onPhaseChange('error');
    return;
  }

  const delay = Math.min(
    BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempt - 1),
    MAX_RECONNECT_DELAY,
  );

  reconnectTimer = setTimeout(() => {
    openConnection(callbacks);
  }, delay);
}

/* ── Message Handling ── */

function handleMessage(msg: DuelServerMessage, cb: DuelCallbacks): void {
  switch (msg.type) {
    case 'connection_established':
      cb.onPhaseChange('active');
      cb.onConnected(msg.user_id, msg.duel_id);
      break;

    case 'user_joined':
      cb.onUserJoined(msg.user_id);
      break;

    case 'user_left':
      cb.onUserLeft(msg.user_id);
      break;

    case 'opponent_code_update':
      cb.onOpponentActivity({
        userId: msg.user_id,
        code: msg.code,
        codeLength: msg.code_length ?? (msg.code ? msg.code.length : 0),
        language: msg.language,
        timestamp: msg.timestamp,
      });
      break;

    case 'submission_received':
      cb.onSubmissionReceived({
        submissionUuid: msg.submission_uuid,
        userId: msg.user_id,
        totalTestCases: msg.total_test_cases,
        message: msg.message,
      });
      break;

    case 'opponent_submitted':
      cb.onOpponentSubmitted({
        userId: msg.user_id,
        total: msg.total,
        message: msg.message,
        timestamp: msg.timestamp,
      });
      break;

    case 'test_case_execution_update':
      cb.onTestCaseExecutionUpdate({
        submissionUuid: msg.submission_uuid,
        executionUuid: msg.execution_uuid,
        testCaseUuid: msg.test_case_uuid,
        testCaseIndex: msg.test_case_index,
        isHidden: msg.is_hidden,
        status: msg.status,
        executionTimeMs: msg.execution_time_ms,
        memoryUsedKb: msg.memory_used_kb,
        completedTestCases: msg.completed_test_cases,
        totalTestCases: msg.total_test_cases,
        userId: msg.user_id,
        isSubmitter: msg.is_submitter,
      });
      break;

    case 'submission_final_result':
      cb.onSubmissionFinalResult({
        submissionUuid: msg.submission_uuid,
        userId: msg.user_id,
        isSubmitter: msg.is_submitter,
        status: msg.status,
        score: msg.score,
        passedTestCases: msg.passed_test_cases,
        totalTestCases: msg.total_test_cases,
        executionTimeMs: msg.execution_time_ms,
        memoryUsedKb: msg.memory_used_kb,
      });
      break;

    case 'duel_ended':
      cb.onPhaseChange('ended');
      cb.onDuelEnded({
        winnerId: msg.winner_id,
        finalScores: msg.final_scores,
        message: msg.message,
        timestamp: msg.timestamp,
      });
      break;

    case 'chat_message':
      cb.onChatMessage({
        userId: msg.user_id,
        message: msg.message,
        timestamp: msg.timestamp,
      });
      break;

    case 'error':
      cb.onError(msg.message);
      break;
  }
}

/* ── Client → Server Actions ── */

export function sendCodeUpdate(code: string, language: string): void {
  // Debounce code updates at 300ms
  if (codeUpdateTimer) clearTimeout(codeUpdateTimer);
  codeUpdateTimer = setTimeout(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({
      type: 'code_update',
      code,
      language,
    }));
  }, 300);
}

export function submitCode(code: string, language: string): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  if (storedCallbacks) {
    storedCallbacks.onPhaseChange('submitting');
  }
  ws.send(JSON.stringify({
    type: 'code_submit',
    code,
    language,
  }));
}

export function sendChat(message: string): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  if (!message.trim()) return;
  ws.send(JSON.stringify({
    type: 'chat_message',
    message,
  }));
}

/* ── Disconnect ── */

export function disconnect(): void {
  manualClose = true;

  if (codeUpdateTimer) {
    clearTimeout(codeUpdateTimer);
    codeUpdateTimer = null;
  }

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (ws) {
    ws.onclose = null;
    ws.close(1000, 'User left duel');
    ws = null;
  }

  storedCallbacks = null;
}

export function isConnected(): boolean {
  return ws !== null && ws.readyState === WebSocket.OPEN;
}
