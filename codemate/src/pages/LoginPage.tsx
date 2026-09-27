import { Navigate, Link } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { AuthCard } from '../components/auth/AuthCard';
import { LoginForm } from '../components/auth/LoginForm';
import { Spinner } from '../components/ui/Spinner';

export function LoginPage() {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <div className="cm-page-center">
        <Spinner size="md" />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="cm-page-center">
      <AuthCard title="CodeMate" subtitle="Sign in to your account">
        <LoginForm />
        <p className="cm-footer-link">
          No account?{' '}
          <Link to="/signup" className="cm-link">
            Sign up
          </Link>
        </p>
      </AuthCard>
    </div>
  );
}
