import { useClipboard } from '../../hooks/useClipboard';
import styles from './TokenDisplay.module.css';

interface TokenDisplayProps {
  token: string;
}

function ClipboardIcon() {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function TokenDisplay({ token }: TokenDisplayProps) {
  const { copy, copied } = useClipboard();
  const bearerValue = `Bearer ${token}`;

  return (
    <div className={styles.container}>
      <input
        className={styles.input}
        type="text"
        readOnly
        value={bearerValue}
        id="token-display"
      />
      <button
        className={styles.copyBtn}
        type="button"
        onClick={() => copy(bearerValue)}
        id="copy-token-btn"
      >
        {copied ? <CheckIcon /> : <ClipboardIcon />}
        {copied ? '✓ Copied!' : 'Copy'}
      </button>
    </div>
  );
}
