import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function getHomePathForRole(role) {
  if (role === 'ADMIN') return '/admin';
  if (role === 'MANAGER') return '/manager';
  if (role === 'EMPLOYEE') return '/employee';
  return '/login';
}

export function ProtectedRoute({ children, allowedRole }) {
  const { isAuthenticated, isVerifying, user } = useAuth();
  const location = useLocation();

  if (isVerifying) {
    return (
      <div className="bclc-fullscreen-loader" role="status" aria-live="polite">
        <span className="bclc-loader-ring" />
        <p>Verifying secure session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRole && user?.role !== allowedRole) {
    return <Navigate to={getHomePathForRole(user?.role)} replace />;
  }

  return children;
}

export function PublicOnlyRoute({ children }) {
  const { isAuthenticated, isVerifying, user } = useAuth();

  if (isVerifying) {
    return (
      <div className="bclc-fullscreen-loader" role="status" aria-live="polite">
        <span className="bclc-loader-ring" />
        <p>Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={getHomePathForRole(user?.role)} replace />;
  }

  return children;
}
