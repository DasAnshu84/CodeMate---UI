import { type FormEvent, useState } from 'react';
import { loginWithEmail, loginWithGoogle, loginWithGitHub } from '../../lib/auth';
import { Button } from '../ui/Button';
import { StatusMessage } from '../ui/StatusMessage';
import { OAuthButton } from './OAuthButton';
import styles from './LoginForm.module.css';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: 'ok' | 'err' | 'loading';
    message: string;
  } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStatus({ type: 'loading', message: 'Signing in...' });

    const result = await loginWithEmail(email, password);
    if ('error' in result) {
      setStatus({ type: 'err', message: result.error });
    } else {
      setStatus({ type: 'ok', message: 'Signed in!' });
    }
    setSubmitting(false);
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    setStatus(null);
    const result = await loginWithGoogle();
    if ('error' in result && result.error) {
      setStatus({ type: 'err', message: result.error });
      setGoogleLoading(false);
    }
    // If no error, the page will redirect — keep loading state
  }

  async function handleGitHub() {
    setGithubLoading(true);
    setStatus(null);
    const result = await loginWithGitHub();
    if ('error' in result && result.error) {
      setStatus({ type: 'err', message: result.error });
      setGithubLoading(false);
    }
  }

  return (
    <div>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.inputGroup}>
          <label className={styles.label} htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            className={styles.input}
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label} htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            className={styles.input}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          loading={submitting}
          className={styles.submitBtn}
        >
          Sign In
        </Button>
      </form>

      <div className={styles.divider}>
        <span className={styles.dividerLine} />
        <span className={styles.dividerText}>or continue with</span>
        <span className={styles.dividerLine} />
      </div>

      <div className={styles.oauthRow}>
        <OAuthButton
          provider="google"
          loading={googleLoading}
          onClick={handleGoogle}
        />
        <OAuthButton
          provider="github"
          loading={githubLoading}
          onClick={handleGitHub}
        />
      </div>

      {status && <StatusMessage type={status.type} message={status.message} />}
    </div>
  );
}
