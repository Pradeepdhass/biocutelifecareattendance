import React, { useState, useId } from 'react';
import { Link, useParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { resetPassword } from '../services/authService';
import {
  ShieldLockIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  AlertIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
} from '../components/Icons';
import '../styles/login.css';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordId = useId();
  const confirmId = useId();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await resetPassword({ token, password });
      setSuccessMessage(response.message);
    } catch (err) {
      setError(err?.message || 'Unable to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout ariaLabel="Set New Password">
      <section className="bclc-login-card" aria-labelledby="bclc-reset-heading">
        <div className="bclc-card-header">
          <div className="bclc-shield-divider" aria-hidden="true">
            <span className="bclc-header-rule" />
            <ShieldLockIcon size={34} />
            <span className="bclc-header-rule" />
          </div>

          <span className="bclc-secure-label">Password Recovery</span>

          <h1 id="bclc-reset-heading" className="bclc-login-title">
            <span className="bclc-title-admin">New</span>{' '}
            <span className="bclc-title-login">Password</span>
          </h1>

          <p className="bclc-login-subtitle">Choose a new password for your account</p>
        </div>

        {error && (
          <div className="bclc-alert bclc-alert-error" role="alert">
            <AlertIcon size={18} className="bclc-alert-icon" />
            <span>{error}</span>
          </div>
        )}

        {successMessage ? (
          <div className="bclc-recovery-success">
            <div className="bclc-alert bclc-alert-success" role="status">
              <CheckCircleIcon size={20} className="bclc-alert-icon" />
              <span>{successMessage}</span>
            </div>
            <Link to="/login" className="bclc-login-button">
              <ArrowLeftIcon size={18} />
              <span>Back to Login</span>
            </Link>
          </div>
        ) : (
          <form className="bclc-login-form" onSubmit={handleSubmit} noValidate>
            <div className="bclc-field-group">
              <label htmlFor={passwordId} className="bclc-sr-only">
                New Password
              </label>
              <div className="bclc-input-wrapper">
                <span className="bclc-input-icon-left">
                  <LockIcon size={19} />
                </span>
                <input
                  id={passwordId}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New Password (min 6 chars)"
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
                Confirm New Password
              </label>
              <div className="bclc-input-wrapper">
                <span className="bclc-input-icon-left">
                  <LockIcon size={19} />
                </span>
                <input
                  id={confirmId}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm New Password"
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
              {isSubmitting ? 'Updating Password...' : 'Update Password'}
            </button>

            <div className="bclc-back-row">
              <Link to="/login" className="bclc-back-link">
                <ArrowLeftIcon size={16} />
                <span>Return to Login</span>
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
