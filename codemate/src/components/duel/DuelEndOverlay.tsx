import { useNavigate } from 'react-router-dom';
import type { DuelEndPayload } from '../../lib/duel';
import { Button } from '../ui/Button';
import styles from './DuelEndOverlay.module.css';

interface DuelEndOverlayProps {
  payload: DuelEndPayload;
  ownUserId: string | null;
}

function TrophyIcon() {
  return (
    <svg className={styles.trophyIcon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 15.5a4.5 4.5 0 0 0 4.5-4.5V4h2a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1h-3V0H9v1H6a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h2v7a4.5 4.5 0 0 0 4.5 4.5H12zM7 4V3h2v8a3 3 0 0 0 6 0V3h2v1h-1.5v6.5a4 4 0 0 1-8 0V4H7zm5 14a1.5 1.5 0 0 0-1.5 1.5h-2a1 1 0 0 0-1 1V22h9v-1.5a1 1 0 0 0-1-1h-2A1.5 1.5 0 0 0 12 18z" />
    </svg>
  );
}

function SkullIcon() {
  return (
    <svg className={styles.skullIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="10" r="8" />
      <circle cx="9" cy="9" r="1.5" fill="currentColor" />
      <circle cx="15" cy="9" r="1.5" fill="currentColor" />
      <path d="M8 15h8" />
      <line x1="10" y1="15" x2="10" y2="18" />
      <line x1="14" y1="15" x2="14" y2="18" />
    </svg>
  );
}

function ConfettiParticles() {
  return (
    <div className={styles.confetti}>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className={styles.confettiPiece} />
      ))}
    </div>
  );
}

export function DuelEndOverlay({ payload, ownUserId }: DuelEndOverlayProps) {
  const navigate = useNavigate();
  const isWinner = payload.winnerId === ownUserId;

  return (
    <div className={styles.overlay} id="duel-end-overlay">
      <div className={styles.card}>
        {isWinner && <ConfettiParticles />}

        {isWinner ? <TrophyIcon /> : <SkullIcon />}

        <h2 className={`${styles.resultTitle} ${isWinner ? styles.titleWin : styles.titleLose}`}>
          {isWinner ? 'Victory!' : 'Defeated'}
        </h2>

        <p className={styles.resultMessage}>{payload.message}</p>

        {/* Final scores */}
        <div className={styles.scoresRow}>
          {Object.entries(payload.finalScores).map(([userId, score]) => (
            <div key={userId} className={styles.scoreBlock}>
              <span className={styles.scoreBlockLabel}>
                {userId === ownUserId ? 'You' : userId}
              </span>
              <span className={styles.scoreBlockValue}>{score}</span>
            </div>
          ))}
        </div>

        <Button
          variant="primary"
          className={styles.backBtn}
          onClick={() => navigate('/dashboard', { replace: true })}
        >
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
