# Context.md: The Competitive Coding Engine

## 1. Project Vision
**Concept:** CodeMate is a high-performance, real-time 1v1 coding platform—effectively "Chess.com for developers." It aims to gamify technical skill through head-to-head "duels" where speed, accuracy, and logic are tested in a synchronized arena.

**Core Tech Stack:**
- **Frontend:** React.js (v19) + TypeScript + Vite.
- **Styling:** CSS Modules (Vanilla CSS) for granular control and performance.
- **Editor:** Monaco Editor (`@monaco-editor/react`) for a professional-grade IDE experience.
- **Real-time:** Native WebSocket implementation (`src/lib/duel.ts`) for sub-100ms synchronization.
- **Backend:** Supabase (PostgreSQL + Auth + Realtime).

---

## 2. Architecture Requirements

### State Management & Data Flow
The system utilizes a **Unidirectional WebSocket Flow** to maintain game integrity:
1. **Keystroke Sync:** Monaco Editor events → Debounced (300ms) → `sendCodeUpdate()` → WebSocket.
2. **Execution Flow:** `submitCode()` → WebSocket → Judge Sandbox (Backend) → `submission_result` broadcast.
3. **Reactive Updates:** The `useDuel` hook subscribes to the service and pushes state changes down to functional components, ensuring the UI remains a pure function of the match state.

### Component Hierarchy (Module Mapping)
- **Arena (`DuelPage`):** The primary match interface. Orchestrates the Monaco editor, live opponent stats, and problem constraints.
- **Matchmaking (`MatchmakingModal`):** Handles queue state, ELO-based pairing (backend), and socket handshakes for match initiation.
- **SpectatorView (Planned):** A read-only variant of the Arena that subscribes to a `duelId` without a session token, allowing others to watch live matches.
- **Leaderboard (Planned):** A global ranking system based on ELO and match history, typically served via the Dashboard.

---

## 3. RCA (Root Cause Analysis) Framework

### Race Conditions (Simultaneous Submissions)
- **Root Cause:** Multiple "Submit" calls before the judge responds.
- **Fix:** Implementation of a `submitting` phase in `useDuel`. The UI must transition to a non-interactive state (lock buttons/editor) until the server acknowledges the submission with a result or error.

### Environment Mismatch
- **Root Cause:** Local JavaScript/Python version differences vs. the Judge's execution environment.
- **Fix:** Standardized execution through the judge sandbox. `TestResults.tsx` should only render verified server-side outputs. Monaco settings must strictly follow the target environment's specs (e.g., Python 3.10+, ES6+).

### Socket Desync
- **Root Cause:** Packet loss or heartbeat failure in high-latency environments.
- **Fix:** 
  - **Exponential Backoff:** Reconnect logic in `lib/duel.ts` with 5-step retry.
  - **State Re-Sync:** The server must send a full "Sync Packet" on reconnection to reset the client's local state (score, phase, time elapsed).
  - **Manual Closure:** Distinguish between `1000/1001` (normal) and abnormal closures to prevent aggressive reconnect loops on user-initiated exits.
