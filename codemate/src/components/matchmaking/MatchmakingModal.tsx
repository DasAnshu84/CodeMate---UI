import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { useMatchmaking } from '../../hooks/useMatchmaking';
import type { MatchmakingLanguage, MatchmakingDifficulty } from '../../lib/matchmaking';
import { Button } from '../ui/Button';
import styles from './MatchmakingModal.module.css';

/* ── Props ── */

interface MatchmakingModalProps {
  session: Session;
  onClose: () => void;
}

/* ── Constants ── */

const LANGUAGES: { value: MatchmakingLanguage; label: string }[] = [
  { value: 'PYTHON', label: 'Python' },
  { value: 'JAVASCRIPT', label: 'JavaScript' },
  { value: 'CPP', label: 'C++' },
  { value: 'JAVA', label: 'Java' },
];

const DIFFICULTIES: { value: MatchmakingDifficulty; label: string }[] = [
  { value: 'EASY', label: 'Easy' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HARD', label: 'Hard' },
];

/* ── Inline SVG Icons ── */

function MagnifyingGlassIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="28" cy="28" r="18" />
      <line x1="41" y1="41" x2="56" y2="56" strokeWidth="4" />
      {/* Sparkle accents inside the lens */}
      <circle cx="22" cy="22" r="2" fill="currentColor" opacity="0.3" stroke="none" />
      <circle cx="32" cy="20" r="1.5" fill="currentColor" opacity="0.2" stroke="none" />
    </svg>
  );
}

function SwordsIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="8" y1="40" x2="36" y2="12" />
      <polyline points="30,8 36,12 32,18" />
      <line x1="40" y1="40" x2="12" y2="12" />
      <polyline points="18,8 12,12 16,18" />
      <circle cx="24" cy="28" r="3" fill="currentColor" opacity="0.25" stroke="none" />
    </svg>
  );
}

function AlertCircleIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function HourglassIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 3h14v4l-5 5 5 5v4H5v-4l5-5-5-5z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="2" y1="2" x2="12" y2="12" />
      <line x1="12" y1="2" x2="2" y2="12" />
    </svg>
  );
}

/* ── Helpers ── */

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/* ── Component ── */

export function MatchmakingModal({ session, onClose }: MatchmakingModalProps) {
  const navigate = useNavigate();
  const {
    phase,
    error,
    match,
    queueInfo,
    elapsed,
    startSearching,
    cancel,
    reset,
  } = useMatchmaking();

  const [language, setLanguage] = useState<MatchmakingLanguage>('PYTHON');
  const [difficulty, setDifficulty] = useState<MatchmakingDifficulty>('EASY');

  // Navigate to duel on match found
  useEffect(() => {
    if (phase === 'match_found' && match) {
      const timer = setTimeout(() => {
        onClose();
        navigate(`/duel/${match.duelId}`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [phase, match, navigate, onClose]);

  const handleStart = useCallback(() => {
    startSearching(session.access_token, { language, difficulty });
  }, [session.access_token, language, difficulty, startSearching]);

  const handleCancel = useCallback(() => {
    cancel();
  }, [cancel]);

  const handleRetry = useCallback(() => {
    reset();
  }, [reset]);

  const handleClose = useCallback(() => {
    if (phase === 'searching' || phase === 'connecting') {
      cancel();
    } else {
      reset();
    }
    onClose();
  }, [phase, cancel, reset, onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleClose]);

  /* ── Render phases ── */

  const isIdle = phase === 'idle' || phase === 'configuring';
  const isSearching = phase === 'connecting' || phase === 'searching';

  return (
    <div className={styles.overlay} onClick={handleClose} id="matchmaking-overlay">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} id="matchmaking-modal">
        {/* Close Button */}
        <button className={styles.closeBtn} onClick={handleClose} type="button" aria-label="Close matchmaking">
          <CloseIcon />
        </button>

        {/* Header */}
        <div className={styles.header}>
          <span className={styles.pulse} />
          <h2 className={styles.title}>Matchmaking</h2>
        </div>

        <p className={styles.subtitle}>
          {isIdle && 'Configure your duel preferences'}
          {isSearching && 'Searching for an opponent…'}
          {phase === 'match_found' && 'Opponent found!'}
          {phase === 'expired' && 'Search timed out'}
          {phase === 'error' && 'Something went wrong'}
        </p>

        {/* ── IDLE: Config Form ── */}
        {isIdle && (
          <div className={styles.configSection}>
            <div className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Language</span>
              <div className={styles.selectGrid}>
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.value}
                    type="button"
                    className={`${styles.selectOption} ${language === lang.value ? styles.selectOptionActive : ''}`}
                    onClick={() => setLanguage(lang.value)}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Difficulty</span>
              <div className={styles.selectGrid}>
                {DIFFICULTIES.map((diff) => (
                  <button
                    key={diff.value}
                    type="button"
                    className={`${styles.selectOption} ${difficulty === diff.value ? styles.selectOptionActive : ''}`}
                    onClick={() => setDifficulty(diff.value)}
                  >
                    {diff.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.actionRow}>
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleStart}>
                Find Match
              </Button>
            </div>
          </div>
        )}

        {/* ── SEARCHING: Magnifying Glass Animation ── */}
        {isSearching && (
          <>
            <div className={styles.searchVisual}>
              <div className={styles.glassContainer}>
                <MagnifyingGlassIcon className={styles.glass} />
                <div className={styles.glassRing} />
              </div>
              <span className={styles.searchingText}>Finding opponent…</span>
              <span className={styles.elapsedText}>{formatElapsed(elapsed)}</span>
              {queueInfo && (
                <div className={styles.queueMeta}>
                  <span className={styles.pill}>{queueInfo.language}</span>
                  <span className={styles.pill}>{queueInfo.difficulty}</span>
                  <span className={styles.pill}>Rating: {queueInfo.skillRating}</span>
                </div>
              )}
            </div>
            <div className={styles.cancelRow}>
              <Button variant="ghost-danger" onClick={handleCancel}>
                Cancel Search
              </Button>
            </div>
          </>
        )}

        {/* ── MATCH FOUND ── */}
        {phase === 'match_found' && match && (
          <div className={styles.matchResult}>
            <SwordsIcon className={styles.matchIcon} />
            <h3 className={styles.matchTitle}>Match Found!</h3>
            <div className={styles.matchDetails}>
              <span className={styles.matchDetail}>
                Opponent: <span className={styles.matchDetailValue}>{match.opponentUsername}</span>
              </span>
            </div>
            <span className={styles.elapsedText}>Redirecting to duel arena…</span>
          </div>
        )}

        {/* ── EXPIRED ── */}
        {phase === 'expired' && (
          <div className={styles.errorBlock}>
            <HourglassIcon className={styles.expiredIcon} />
            <h3 className={styles.expiredTitle}>Search Timed Out</h3>
            <p className={styles.errorMessage}>
              No opponents found. Try a different difficulty or language.
            </p>
            <div className={styles.actionRow}>
              <Button variant="ghost" onClick={handleClose}>
                Close
              </Button>
              <Button variant="primary" onClick={handleRetry}>
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* ── ERROR ── */}
        {phase === 'error' && (
          <div className={styles.errorBlock}>
            <AlertCircleIcon className={styles.errorIcon} />
            <h3 className={styles.errorTitle}>Connection Error</h3>
            <p className={styles.errorMessage}>{error ?? 'An unexpected error occurred.'}</p>
            <div className={styles.actionRow}>
              <Button variant="ghost" onClick={handleClose}>
                Close
              </Button>
              <Button variant="primary" onClick={handleRetry}>
                Retry
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
