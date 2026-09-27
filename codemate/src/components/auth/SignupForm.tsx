import { type FormEvent, useState } from 'react';
import {
  signupWithEmail,
  loginWithGoogle,
  loginWithGitHub,
} from '../../lib/auth';
import { Button } from '../ui/Button';
import { StatusMessage } from '../ui/StatusMessage';
import { OAuthButton } from './OAuthButton';
import styles from './SignupForm.module.css';

export function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: 'ok' | 'err' | 'loading';
    message: string;
  } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      setStatus({ type: 'err', message: 'Passwords do not match.' });
      return;
    }

    setSubmitting(true);
    setStatus({ type: 'loading', message: 'Creating account...' });

    const result = await signupWithEmail(email, password);
    if ('error' in result) {
      if (result.error === '__confirm_email__') {
        setStatus({
          type: 'ok',
          message: 'Check your email to confirm your account.',
        });
      } else {
        setStatus({ type: 'err', message: result.error });
      }
    } else {
      setStatus({ type: 'ok', message: 'Account created!' });
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
          <label className={styles.label} htmlFor="signup-email">
            Email
          </label>
          <input
            id="signup-email"
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
          <label className={styles.label} htmlFor="signup-password">
            Password
          </label>
          <input
            id="signup-password"
            className={styles.input}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label} htmlFor="signup-confirm">
            Confirm Password
          </label>
          <input
            id="signup-confirm"
            className={styles.input}
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          loading={submitting}
          className={styles.submitBtn}
        >
          Create Account
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
