import { Navigate, Outlet } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { Spinner } from '../components/ui/Spinner';

export function ProtectedRoute() {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <div className="cm-page-center">
        <Spinner size="md" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
