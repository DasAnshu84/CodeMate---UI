import type { ReactNode } from 'react';
import styles from './AuthCard.module.css';

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.pulse} />
        <h1 className={styles.title}>{title}</h1>
      </div>
      <p className={styles.subtitle}>{subtitle}</p>
      {children}
    </div>
  );
}
