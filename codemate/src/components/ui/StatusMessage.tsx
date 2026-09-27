import { Spinner } from './Spinner';

interface StatusMessageProps {
  type: 'ok' | 'err' | 'loading';
  message: string;
}

export function StatusMessage({ type, message }: StatusMessageProps) {
  if (!message) return null;

  const color =
    type === 'ok'
      ? 'var(--cm-accent)'
      : type === 'err'
        ? 'var(--cm-danger)'
        : 'var(--cm-muted)';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 12,
        fontFamily: 'var(--cm-font-mono)',
        color,
        marginTop: 12,
      }}
      role={type === 'err' ? 'alert' : 'status'}
    >
      {type === 'loading' && <Spinner size="sm" />}
      <span>{message}</span>
    </div>
  );
}
