import { useEffect, useRef, useState } from 'react';
import styles from './DuelHeader.module.css';

interface DuelHeaderProps {
  elapsed: number;
  ownScore: number;
  opponentScore: number;
  ownPassed?: number;
  opponentPassed?: number;
  totalTestCases?: number;
  duelId: string;
  chatOpen: boolean;
  onToggleChat: () => void;
  drawerOpen?: boolean;
  onToggleDrawer?: () => void;
  reconnecting: boolean;
  reconnectAttempt: number;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function DuelHeader({
  elapsed,
  ownScore,
  opponentScore,
  ownPassed = 0,
  opponentPassed = 0,
  totalTestCases = 5,
  duelId,
  chatOpen,
  onToggleChat,
  drawerOpen,
  onToggleDrawer,
  reconnecting,
  reconnectAttempt,
}: DuelHeaderProps) {
  const ownScoreRef = useRef(ownScore);
  const oppScoreRef = useRef(opponentScore);
  const ownBump = ownScore !== ownScoreRef.current;
  const oppBump = opponentScore !== oppScoreRef.current;
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    ownScoreRef.current = ownScore;
  }, [ownScore]);

  useEffect(() => {
    oppScoreRef.current = opponentScore;
  }, [opponentScore]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <>
      {reconnecting && (
        <div className={styles.reconnectBanner}>
          <span className={styles.reconnectDot} />
          Reconnecting to duel server… (attempt {reconnectAttempt}/5)
        </div>
      )}
      <header className={styles.header} id="duel-header">
        {/* Left: Brand Logo & Problem Drawer Toggle */}
        <div className={styles.leftSection}>
          <div className={styles.brandLogo}>
            <span className={styles.brandIcon}>⚔️</span>
            <span className={styles.brandName}>CodeMate</span>
            <span className={styles.badge1v1}>1v1</span>
          </div>

          {onToggleDrawer && (
            <button
              className={`${styles.drawerToggleBtn} ${drawerOpen ? styles.drawerToggleActive : ''}`}
              onClick={onToggleDrawer}
              type="button"
              aria-label="Toggle problem drawer"
              title="Toggle Problem Drawer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
              <span>Problem</span>
            </button>
          )}
        </div>

        {/* Center: Match HUD (Player 1 Pill | Timer | VS | Player 2 Pill) */}
        <div className={styles.hudCenter}>
          {/* Player 1 Pill (You) */}
          <div className={styles.playerPillBlue}>
            <div className={styles.avatarBlue}>YOU</div>
            <div className={styles.playerMeta}>
              <span className={styles.playerName}>You</span>
              <span className={styles.passedText}>
                {ownPassed}/{totalTestCases} Passed
              </span>
            </div>
            <span className={`${styles.scorePill} ${ownBump ? styles.scoreBump : ''}`}>
              {ownScore}
            </span>
          </div>

          {/* Glowing Match Timer */}
          <div className={styles.timerDisplay}>
            <span className={styles.timerText}>{formatTime(elapsed)}</span>
          </div>

          <div className={styles.vsBadge}>VS</div>

          {/* Player 2 Pill (Opponent) */}
          <div className={styles.playerPillRed}>
            <span className={`${styles.scorePillRed} ${oppBump ? styles.scoreBump : ''}`}>
              {opponentScore}
            </span>
            <div className={styles.playerMetaRight}>
              <span className={styles.playerName}>Opponent</span>
              <span className={styles.passedTextRed}>
                {opponentPassed}/{totalTestCases} Passed
              </span>
            </div>
            <div className={styles.avatarRed}>OPP</div>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className={styles.rightSection}>
          <span className={styles.roomPill} title={`Room ID: ${duelId}`}>
            #{duelId.slice(0, 6)}
          </span>

          <button
            className={styles.actionIconBtn}
            onClick={toggleFullscreen}
            type="button"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Mode'}
          >
            {isFullscreen ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            )}
          </button>

          <button
            className={`${styles.actionIconBtn} ${chatOpen ? styles.actionIconActive : ''}`}
            onClick={onToggleChat}
            type="button"
            aria-label="Toggle chat"
            title="Toggle Battle Chat"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>

          <button
            className={styles.exitBtn}
            onClick={() => {
              if (window.confirm('Are you sure you want to leave the battlefield? This may forfeit your match.')) {
                window.location.href = '/dashboard';
              }
            }}
            type="button"
            title="Leave Match"
          >
            Forfeit
          </button>
        </div>
      </header>
    </>
  );
}
