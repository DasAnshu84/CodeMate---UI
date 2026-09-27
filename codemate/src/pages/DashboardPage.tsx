import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { AuthCard } from '../components/auth/AuthCard';
import { UserBadge } from '../components/auth/UserBadge';
import { TokenDisplay } from '../components/auth/TokenDisplay';
import { Spinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { MatchmakingModal } from '../components/matchmaking/MatchmakingModal';

export function DashboardPage() {
  const { session, loading } = useSession();
  const [showMatchmaking, setShowMatchmaking] = useState(false);

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

  return (
    <div className="cm-page-center">
      <AuthCard title="CodeMate" subtitle="Your session is active">
        <UserBadge session={session} />
        <TokenDisplay token={session.access_token} />

        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
          <Button variant="primary" onClick={() => setShowMatchmaking(true)}>
            ⚔ Find Match
          </Button>
        </div>
      </AuthCard>

      {showMatchmaking && (
        <MatchmakingModal
          session={session}
          onClose={() => setShowMatchmaking(false)}
        />
      )}
    </div>
  );
}
