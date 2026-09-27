import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { useDuel, toMonacoLang } from '../hooks/useDuel';
import { DuelErrorBoundary } from '../components/duel/DuelErrorBoundary';
import { DuelHeader } from '../components/duel/DuelHeader';
import { ProblemPanel } from '../components/duel/ProblemPanel';
import { CodeEditor, type DuelLanguage } from '../components/duel/CodeEditor';
import { OpponentPanel } from '../components/duel/OpponentPanel';
import { TestResults } from '../components/duel/TestResults';
import { DuelChat } from '../components/duel/DuelChat';
import { DuelEndOverlay } from '../components/duel/DuelEndOverlay';
import { Spinner } from '../components/ui/Spinner';

/* ── Mock problem data (to be replaced by API fetch via problem_id) ── */

const MOCK_PROBLEM = {
  title: 'Two Sum',
  difficulty: 'EASY' as const,
  description:
    'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.',
  constraints: [
    '2 ≤ nums.length ≤ 10⁴',
    '-10⁹ ≤ nums[i] ≤ 10⁹',
    '-10⁹ ≤ target ≤ 10⁹',
    'Only one valid answer exists.',
  ],
  examples: [
    { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].' },
    { input: 'nums = [3,2,4], target = 6', output: '[1,2]' },
  ],
};

/* ── Page Styles (inline — layout skeleton) ── */

const PAGE_STYLE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  overflow: 'hidden',
  background: 'var(--cm-bg)',
};

const BODY_STYLE: React.CSSProperties = {
  display: 'flex',
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
  position: 'relative',
};

const CENTER_COL_STYLE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minWidth: 0,
};

const CONNECTING_STYLE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100vh',
  gap: 16,
  fontFamily: 'var(--cm-font-mono)',
  fontSize: 13,
  color: 'var(--cm-muted)',
};

/* ── Inner Page Component ── */

function DuelPageInner() {
  const { duelId } = useParams<{ duelId: string }>();
  const { session, loading: sessionLoading } = useSession();

  const [language, setLanguage] = useState<DuelLanguage>('PYTHON');
  const [code, setCode] = useState('# Write your solution here\n\ndef solve():\n    pass\n');
  const [problemCollapsed, setProblemCollapsed] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  // Guard: need duelId and session
  if (!duelId) return <Navigate to="/dashboard" replace />;
  if (sessionLoading) {
    return (
      <div style={CONNECTING_STYLE}>
        <Spinner size="md" />
        <span>Loading session…</span>
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;

  return (
    <DuelPageConnected
      duelId={duelId}
      token={session.access_token}
      ownSessionUserId={session.user.id}
      language={language}
      onLanguageChange={setLanguage}
      code={code}
      onCodeChange={setCode}
      problemCollapsed={problemCollapsed}
      onProblemToggle={() => setProblemCollapsed((v) => !v)}
      chatOpen={chatOpen}
      onChatToggle={() => setChatOpen((v) => !v)}
    />
  );
}

/* ── Connected Duel (has session + duelId) ── */

interface ConnectedProps {
  duelId: string;
  token: string;
  ownSessionUserId: string;
  language: DuelLanguage;
  onLanguageChange: (lang: DuelLanguage) => void;
  code: string;
  onCodeChange: (code: string) => void;
  problemCollapsed: boolean;
  onProblemToggle: () => void;
  chatOpen: boolean;
  onChatToggle: () => void;
}

function DuelPageConnected({
  duelId,
  token,
  ownSessionUserId,
  language,
  onLanguageChange,
  code,
  onCodeChange,
  problemCollapsed,
  onProblemToggle,
  chatOpen,
  onChatToggle,
}: ConnectedProps) {
  const {
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
  } = useDuel(duelId, token);

  // Track test pass triggers for border pulse animation
  const [userPulse, setUserPulse] = useState(false);
  const [oppPulse, setOppPulse] = useState(false);
  const prevUserPassedRef = useRef(0);
  const prevOppPassedRef = useRef(0);

  const ownPassed = ownSubmission?.finalResult?.passedTestCases ?? ownSubmission?.completedTestCases ?? 0;
  const opponentPassed = opponentSubmission?.passed ?? 0;
  const totalTestCases = ownSubmission?.totalTestCases ?? opponentSubmission?.total ?? 5;

  useEffect(() => {
    if (ownPassed > prevUserPassedRef.current) {
      setUserPulse(true);
      const t = setTimeout(() => setUserPulse(false), 1300);
      return () => clearTimeout(t);
    }
    prevUserPassedRef.current = ownPassed;
  }, [ownPassed]);

  useEffect(() => {
    if (opponentPassed > prevOppPassedRef.current) {
      setOppPulse(true);
      const t = setTimeout(() => setOppPulse(false), 1300);
      return () => clearTimeout(t);
    }
    prevOppPassedRef.current = opponentPassed;
  }, [opponentPassed]);

  // Send code updates on change
  const handleCodeChange = useCallback((newCode: string) => {
    onCodeChange(newCode);
    sendCode(newCode, toMonacoLang(language));
  }, [onCodeChange, sendCode, language]);

  // Submit
  const handleSubmit = useCallback(() => {
    if (phase === 'submitting') return;
    submit(code, toMonacoLang(language));
  }, [code, language, phase, submit]);

  // Leave duel confirmation — beforeunload
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (phase === 'active' || phase === 'submitting') {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [phase]);

  // Escape to close chat or drawer
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (chatOpen) onChatToggle();
        else if (!problemCollapsed) onProblemToggle();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [chatOpen, onChatToggle, problemCollapsed, onProblemToggle]);

  // Connecting state
  if (phase === 'connecting') {
    return (
      <div style={CONNECTING_STYLE}>
        <Spinner size="md" />
        <span>Connecting to duel battlefield…</span>
      </div>
    );
  }

  // Error state (after all reconnection attempts exhausted)
  if (phase === 'error') {
    return (
      <div style={CONNECTING_STYLE}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--cm-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span style={{ color: 'var(--cm-danger)', fontWeight: 600, fontSize: 16 }}>Connection Failed</span>
        <span>{error}</span>
        <button
          onClick={() => window.location.href = '/dashboard'}
          style={{
            marginTop: 12,
            padding: '10px 24px',
            border: 'none',
            borderRadius: 8,
            background: 'var(--cm-player-blue-deep)',
            color: '#ffffff',
            fontFamily: 'var(--cm-font-ui)',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 0 16px var(--cm-player-blue-glow)',
          }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const opponentScore = opponentSubmission && opponentSubmission.passed != null && opponentSubmission.total
    ? Math.round((opponentSubmission.passed / opponentSubmission.total) * 100)
    : 0;

  const resolvedUserId = ownUserId ?? ownSessionUserId;

  return (
    <div style={PAGE_STYLE}>
      {/* 52px Fixed Match HUD Header */}
      <DuelHeader
        elapsed={elapsed}
        ownScore={ownScore}
        opponentScore={opponentScore}
        ownPassed={ownPassed}
        opponentPassed={opponentPassed}
        totalTestCases={totalTestCases}
        duelId={duelId}
        chatOpen={chatOpen}
        onToggleChat={onChatToggle}
        drawerOpen={!problemCollapsed}
        onToggleDrawer={onProblemToggle}
        reconnecting={phase === 'reconnecting'}
        reconnectAttempt={reconnectAttempt}
      />

      {/* Main Battlefield Canvas: 48px Collapsed Rail + 50/50 Parallel IDE Split-Screen */}
      <div style={BODY_STYLE}>
        {/* Left Problem Drawer (Rail + Glassmorphic Overlay) */}
        <ProblemPanel
          title={MOCK_PROBLEM.title}
          difficulty={MOCK_PROBLEM.difficulty}
          description={MOCK_PROBLEM.description}
          constraints={MOCK_PROBLEM.constraints}
          examples={MOCK_PROBLEM.examples}
          collapsed={problemCollapsed}
          onToggle={onProblemToggle}
        />

        {/* Player 1 Editor (Left Split — Blue Identity) */}
        <div style={CENTER_COL_STYLE}>
          <CodeEditor
            language={language}
            onLanguageChange={onLanguageChange}
            code={code}
            onCodeChange={handleCodeChange}
            onSubmit={handleSubmit}
            submitting={phase === 'submitting'}
            disabled={phase === 'ended'}
            triggerPulse={userPulse}
          />

          {ownSubmission && <TestResults submission={ownSubmission} />}
        </div>

        {/* Player 2 Editor (Right Split — Crimson Rose Identity) */}
        <div style={{ display: 'flex', flex: 1, minWidth: 0 }}>
          <OpponentPanel
            activity={opponentActivity}
            submission={opponentSubmission}
            triggerPulse={oppPulse}
          />
        </div>
      </div>

      {/* Battle Chat Overlay */}
      {chatOpen && (
        <DuelChat
          messages={chatMessages}
          ownUserId={resolvedUserId}
          onSend={chat}
          onClose={onChatToggle}
        />
      )}

      {/* Match Conclusion Victory / Defeat Overlay */}
      {phase === 'ended' && duelEnd && (
        <DuelEndOverlay
          payload={duelEnd}
          ownUserId={resolvedUserId}
        />
      )}
    </div>
  );
}

/* ── Exported Page (wrapped in Error Boundary) ── */

export function DuelPage() {
  return (
    <DuelErrorBoundary>
      <DuelPageInner />
    </DuelErrorBoundary>
  );
}
