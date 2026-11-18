import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  ProtectedRoute,
  PublicOnlyRoute,
  getHomePathForRole,
} from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import ManagerSetupPage from './pages/ManagerSetupPage';
import ActivateAccountPage from './pages/ActivateAccountPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ManagerDashboardPage from './pages/ManagerDashboardPage';
import EmployeeDashboardPage from './pages/EmployeeDashboardPage';

function RootRedirect() {
  const { isAuthenticated, isVerifying, user } = useAuth();
  if (isVerifying) {
    return (
      <div className="bclc-fullscreen-loader" role="status" aria-live="polite">
        <span className="bclc-loader-ring" />
        <p>Restoring session...</p>
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={getHomePathForRole(user?.role)} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/setup"
            element={
              <PublicOnlyRoute>
                <ManagerSetupPage />
              </PublicOnlyRoute>
            }
          />
          <Route path="/activate/:token" element={<ActivateAccountPage />} />
          <Route
            path="/forgot-password"
            element={
              <PublicOnlyRoute>
                <ForgotPasswordPage />
              </PublicOnlyRoute>
            }
          />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRole="ADMIN">
                <ManagerDashboardPage portalRole="ADMIN" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager"
            element={
              <ProtectedRoute allowedRole="MANAGER">
                <ManagerDashboardPage portalRole="MANAGER" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee"
            element={
              <ProtectedRoute allowedRole="EMPLOYEE">
                <EmployeeDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
