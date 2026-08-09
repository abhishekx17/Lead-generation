import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Wraps routes that require authentication.
 * While loading, shows a full-screen spinner.
 * When unauthenticated, redirects to /login with the current path saved.
 */
export default function AuthGuard({ children, requireSuperAdmin = false }) {
  const { session, user, isSuperAdmin, isPending } = useAuth();
  const location = useLocation();

  if (isPending) {
    return (
      <div className="auth-loading">
        <div className="auth-spinner" />
        <span>Loading session…</span>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
