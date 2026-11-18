import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import LoginForm from '../components/LoginForm';
import { useAuth } from '../context/AuthContext';
import { getSetupStatus } from '../services/authService';
import { getHomePathForRole } from '../components/ProtectedRoute';
import '../styles/login.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [needsManagerSetup, setNeedsManagerSetup] = useState(false);

  useEffect(() => {
    let active = true;
    getSetupStatus()
      .then((status) => {
        if (active && status && status.managerExists === false) {
          setNeedsManagerSetup(true);
        }
      })
      .catch(() => {
        // Ignore if backend is offline; login will show a clear connection message
      });
    return () => {
      active = false;
    };
  }, []);

  const handleLogin = async (credentials) => {
    const result = await login(credentials);
    navigate(getHomePathForRole(result.user.role), { replace: true });
  };

  return (
    <AuthLayout ariaLabel="Bio Cute Life Care Attendance Login">
      <LoginForm
        onSubmit={handleLogin}
        needsManagerSetup={needsManagerSetup}
      />
    </AuthLayout>
  );
}
