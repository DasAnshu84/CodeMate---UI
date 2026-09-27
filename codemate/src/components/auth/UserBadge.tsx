import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { logout } from '../../lib/auth';
import { Button } from '../ui/Button';
import styles from './UserBadge.module.css';

interface UserBadgeProps {
  session: Session;
}

export function UserBadge({ session }: UserBadgeProps) {
  const [loggingOut, setLoggingOut] = useState(false);
  const user = session.user;
  const meta = user.user_metadata as Record<string, unknown>;
  const avatarUrl = typeof meta.avatar_url === 'string' ? meta.avatar_url : null;
  const fullName = typeof meta.full_name === 'string' ? meta.full_name : null;
  const email = user.email ?? '';
  const displayName = fullName ?? email.split('@')[0];
  const initial = (fullName ?? email).charAt(0).toUpperCase();

  async function handleSignOut() {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      // Auth state listener will handle navigation
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className={styles.badge}>
      {avatarUrl ? (
        <img
          className={styles.avatarImg}
          src={avatarUrl}
          alt={`${displayName} avatar`}
        />
      ) : (
        <div className={styles.avatarInitials}>{initial}</div>
      )}

      <div className={styles.info}>
        <div className={styles.name}>{displayName}</div>
        <div className={styles.email}>{email}</div>
      </div>

      <Button
        variant="ghost-danger"
        className={styles.signOutBtn}
        loading={loggingOut}
        onClick={handleSignOut}
      >
        Sign Out
      </Button>
    </div>
  );
}
