import { Navigate, Link } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { AuthCard } from '../components/auth/AuthCard';
import { SignupForm } from '../components/auth/SignupForm';
import { Spinner } from '../components/ui/Spinner';

export function SignupPage() {
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
      <AuthCard title="CodeMate" subtitle="Create a new account">
        <SignupForm />
        <p className="cm-footer-link">
          Already have an account?{' '}
          <Link to="/login" className="cm-link">
            Log in
          </Link>
        </p>
      </AuthCard>
    </div>
  );
}
