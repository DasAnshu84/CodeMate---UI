import type { CSSProperties } from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md';
}

const sizeMap: Record<string, number> = {
  sm: 10,
  md: 16,
};

export function Spinner({ size = 'md' }: SpinnerProps) {
  const px = sizeMap[size];
  const style: CSSProperties = {
    width: px,
    height: px,
    border: `2px solid var(--cm-border)`,
    borderTopColor: 'var(--cm-accent)',
    borderRadius: '50%',
    animation: 'cm-spin 0.6s linear infinite',
    display: 'inline-block',
    flexShrink: 0,
  };

  return <span style={style} role="status" aria-label="Loading" />;
}
