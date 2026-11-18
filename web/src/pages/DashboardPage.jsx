import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/login.css';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="bclc-dashboard-page">
      <header className="bclc-dashboard-header">
        <div>
          <span className="bclc-dashboard-kicker">Bio Cute Life Care</span>
          <h1 className="bclc-dashboard-title">Attendance Management System</h1>
        </div>

        <div className="bclc-dashboard-user">
          <div className="bclc-dashboard-user-info">
            <span className="bclc-dashboard-user-name">{user?.name || 'Administrator'}</span>
            <span className="bclc-dashboard-user-email">{user?.email}</span>
          </div>
          <button
            type="button"
            className="bclc-logout-button"
            onClick={handleLogout}
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="bclc-dashboard-main">
        <section className="bclc-dashboard-welcome-card">
          <h2>Welcome back, {user?.name || 'Administrator'}</h2>
          <p>
            You are securely authenticated into the Bio Cute Life Care Attendance Management
            System. Connect your production API via <code>VITE_API_BASE_URL</code> to load live
            attendance records.
          </p>
        </section>

        <section className="bclc-dashboard-stats" aria-label="Attendance Overview">
          <article className="bclc-stat-card">
            <span className="bclc-stat-label">Staff Checked In</span>
            <strong className="bclc-stat-value">—</strong>
            <span className="bclc-stat-note">Awaiting live API sync</span>
          </article>
          <article className="bclc-stat-card">
            <span className="bclc-stat-label">On Leave Today</span>
            <strong className="bclc-stat-value">—</strong>
            <span className="bclc-stat-note">Awaiting live API sync</span>
          </article>
          <article className="bclc-stat-card">
            <span className="bclc-stat-label">Shift Coverage</span>
            <strong className="bclc-stat-value">—</strong>
            <span className="bclc-stat-note">Awaiting live API sync</span>
          </article>
        </section>
      </main>
    </div>
  );
}
