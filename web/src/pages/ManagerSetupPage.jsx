import React, { useState, useEffect, useId } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { getSetupStatus } from '../services/authService';
import { validateEmail } from '../utils/validation';
import {
  ShieldLockIcon,
  MailIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  AlertIcon,
  ArrowLeftIcon,
} from '../components/Icons';
import '../styles/login.css';

export default function ManagerSetupPage() {
  const { completeManagerSetup } = useAuth();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [alreadyConfigured, setAlreadyConfigured] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailId = useId();
  const passwordId = useId();
  const confirmId = useId();

  useEffect(() => {
    let active = true;
    getSetupStatus()
      .then((res) => {
        if (active && res?.managerExists) {
          setAlreadyConfigured(true);
        }
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const emailErr = validateEmail(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }
    if (password.length < 8) {
      setError('Admin password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await completeManagerSetup({ email, password });
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err?.message || 'Unable to create central Admin account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout ariaLabel="Initial Central Admin Setup">
      <section className="bclc-login-card" aria-labelledby="bclc-setup-heading">
        <div className="bclc-card-header">
          <div className="bclc-shield-divider" aria-hidden="true">
            <span className="bclc-header-rule" />
            <ShieldLockIcon size={34} />
            <span className="bclc-header-rule" />
          </div>

          <span className="bclc-secure-label">One-Time Secure Setup</span>

          <h1 id="bclc-setup-heading" className="bclc-login-title">
            <span className="bclc-title-admin">Central</span>{' '}
            <span className="bclc-title-login">Admin</span>
          </h1>

          <p className="bclc-login-subtitle">
            Create the primary Admin account to manage Coimbatore &amp; Chennai
          </p>
        </div>

        {checking ? (
          <p className="bclc-login-subtitle" style={{ textAlign: 'center', padding: '16px 0' }}>
            Checking setup status...
          </p>
        ) : alreadyConfigured ? (
          <div className="bclc-recovery-success">
            <div className="bclc-alert bclc-alert-error" role="alert">
              <AlertIcon size={18} className="bclc-alert-icon" />
              <span>
                The central Admin account has already been created. Only one Admin account is
                permitted.
              </span>
            </div>
            <Link to="/login" className="bclc-login-button">
              <ArrowLeftIcon size={18} />
              <span>Go to Login</span>
            </Link>
          </div>
        ) : (
          <form className="bclc-login-form" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="bclc-alert bclc-alert-error" role="alert">
                <AlertIcon size={18} className="bclc-alert-icon" />
                <span>{error}</span>
              </div>
            )}

            <div className="bclc-field-group">
              <label htmlFor={emailId} className="bclc-sr-only">
                Admin Email Address
              </label>
              <div className="bclc-input-wrapper">
                <span className="bclc-input-icon-left">
                  <MailIcon size={19} />
                </span>
                <input
                  id={emailId}
                  type="email"
                  placeholder="Admin Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  className="bclc-input"
                  required
                />
              </div>
            </div>

            <div className="bclc-field-group">
              <label htmlFor={passwordId} className="bclc-sr-only">
                Password (minimum 8 characters)
              </label>
              <div className="bclc-input-wrapper">
                <span className="bclc-input-icon-left">
                  <LockIcon size={19} />
                </span>
                <input
                  id={passwordId}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create Password (min 8 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  className="bclc-input bclc-input-with-toggle"
                  required
                />
                <button
                  type="button"
                  className="bclc-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeIcon size={19} /> : <EyeOffIcon size={19} />}
                </button>
              </div>
            </div>

            <div className="bclc-field-group">
              <label htmlFor={confirmId} className="bclc-sr-only">
                Confirm Password
              </label>
              <div className="bclc-input-wrapper">
                <span className="bclc-input-icon-left">
                  <LockIcon size={19} />
                </span>
                <input
                  id={confirmId}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                  className="bclc-input"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className={`bclc-login-button ${isSubmitting ? 'is-loading' : ''}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="bclc-spinner" aria-hidden="true" />
                  <span>Creating Admin...</span>
                </>
              ) : (
                <span>Create Admin Account</span>
              )}
            </button>

            <div className="bclc-back-row">
              <Link to="/login" className="bclc-back-link">
                <ArrowLeftIcon size={16} />
                <span>Back to Login</span>
              </Link>
            </div>
          </form>
        )}

        <footer className="bclc-card-footer">
          <span className="bclc-footer-rule" aria-hidden="true" />
          <p className="bclc-powered-by">Powered by Bio Cute Life Care</p>
          <span className="bclc-footer-rule" aria-hidden="true" />
        </footer>
      </section>
    </AuthLayout>
  );
}
