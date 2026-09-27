/**
 * Matchmaking WebSocket service.
 *
 * All WebSocket/matchmaking logic lives here — never inside components or hooks.
 * Uses query-param auth: ws://<host>/matchmaking/queue/?token=<jwt>
 */

import { WS_URL } from './env';

/* ── Types ── */

export type MatchmakingLanguage = 'PYTHON' | 'JAVASCRIPT' | 'CPP' | 'JAVA';
export type MatchmakingDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface QueueConfig {
  language: MatchmakingLanguage;
  difficulty: MatchmakingDifficulty;
}

/** Union of every message the server can send */
export type ServerMessage =
  | { type: 'connection_established'; user_id: number }
  | { type: 'queue_joined'; request_id: string; skill_rating: number; language: string; difficulty: string }
  | { type: 'queue_status'; request_id: string; status: string; skill_rating: number; language: string; difficulty: string; queued_at: string }
  | { type: 'queue_left'; message: string }
  | { type: 'not_in_queue'; message: string }
  | { type: 'match_found'; duel_id: string; opponent_id: number; opponent_username: string; problem_id: string; message: string }
  | { type: 'queue_expired'; message: string }
  | { type: 'error'; message: string };

export type MatchmakingPhase =
  | 'idle'           // popup not open / not connected
  | 'configuring'    // user picking language + difficulty
  | 'connecting'     // WebSocket opening
  | 'searching'      // in queue, waiting for match
  | 'match_found'    // match found, about to navigate
  | 'expired'        // timed out
  | 'error';         // something went wrong

export interface MatchFoundPayload {
  duelId: string;
  opponentId: number;
  opponentUsername: string;
  problemId: string;
}

/* ── Callbacks the hook registers ── */

export interface MatchmakingCallbacks {
  onPhaseChange: (phase: MatchmakingPhase) => void;
  onMatchFound: (payload: MatchFoundPayload) => void;
  onError: (message: string) => void;
  onQueueJoined: (data: { requestId: string; skillRating: number; language: string; difficulty: string }) => void;
  onExpired: () => void;
}

/* ── Service ── */

let ws: WebSocket | null = null;

/** Build the WS URL with the token as a query param */
function buildWsUrl(token: string): string {
  const base = WS_URL.replace(/\/$/, '');
  return `${base}/matchmaking/queue/?token=${encodeURIComponent(token)}`;
}

export function connect(token: string, callbacks: MatchmakingCallbacks): void {
  // Tear down any existing connection
  disconnect();

  callbacks.onPhaseChange('connecting');

  const url = buildWsUrl(token);
  ws = new WebSocket(url);

  ws.onopen = () => {
    // Server will send connection_established, but we're connected
  };

  ws.onmessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data as string) as ServerMessage;
      handleMessage(data, callbacks);
    } catch {
      callbacks.onError('Failed to parse server message');
    }
  };

  ws.onerror = () => {
    callbacks.onError('WebSocket connection error');
    callbacks.onPhaseChange('error');
  };

  ws.onclose = (event: CloseEvent) => {
    ws = null;
    // 1000 = normal close, 1001 = going away — not errors
    if (event.code !== 1000 && event.code !== 1001) {
      callbacks.onError(`Connection closed (code ${event.code})`);
      callbacks.onPhaseChange('error');
    }
  };
}

function handleMessage(msg: ServerMessage, cb: MatchmakingCallbacks): void {
  switch (msg.type) {
    case 'connection_established':
      // Connection ready — phase stays 'connecting' until we join queue
      break;

    case 'queue_joined':
      cb.onPhaseChange('searching');
      cb.onQueueJoined({
        requestId: msg.request_id,
        skillRating: msg.skill_rating,
        language: msg.language,
        difficulty: msg.difficulty,
      });
      break;

    case 'queue_status':
      // Already in queue from a previous connection
      cb.onPhaseChange('searching');
      cb.onQueueJoined({
        requestId: msg.request_id,
        skillRating: msg.skill_rating,
        language: msg.language,
        difficulty: msg.difficulty,
      });
      break;

    case 'match_found':
      cb.onPhaseChange('match_found');
      cb.onMatchFound({
        duelId: msg.duel_id,
        opponentId: msg.opponent_id,
        opponentUsername: msg.opponent_username,
        problemId: msg.problem_id,
      });
      break;

    case 'queue_expired':
      cb.onPhaseChange('expired');
      cb.onExpired();
      break;

    case 'queue_left':
      cb.onPhaseChange('idle');
      break;

    case 'not_in_queue':
      // No-op — user asked for status but isn't in queue
      break;

    case 'error':
      cb.onError(msg.message);
      cb.onPhaseChange('error');
      break;
  }
}

export function joinQueue(config: QueueConfig): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({
    type: 'join_queue',
    language: config.language,
    difficulty: config.difficulty,
  }));
}

export function leaveQueue(): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: 'leave_queue' }));
}

export function getStatus(): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: 'get_status' }));
}

export function disconnect(): void {
  if (ws) {
    ws.onclose = null; // prevent error callbacks on intentional close
    ws.close(1000, 'User closed matchmaking');
    ws = null;
  }
}

export function isConnected(): boolean {
  return ws !== null && ws.readyState === WebSocket.OPEN;
}
