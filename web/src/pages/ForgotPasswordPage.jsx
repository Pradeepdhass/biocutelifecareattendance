import React, { useState, useId } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { validateForgotPasswordForm, validateEmail } from '../utils/validation';
import { requestPasswordReset } from '../services/authService';
import {
  ShieldLockIcon,
  MailIcon,
  AlertIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
} from '../components/Icons';
import '../styles/login.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [previewResetUrl, setPreviewResetUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailId = useId();
  const emailErrorId = useId();

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    if (submitError) setSubmitError('');
    if (touched) {
      setEmailError(validateEmail(val));
    }
  };

  const handleBlur = () => {
    setTouched(true);
    setEmailError(validateEmail(email));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSuccessMessage('');

    const { isValid, errors } = validateForgotPasswordForm(email);
    setTouched(true);
    setEmailError(errors.email);

    if (!isValid) return;

    setIsSubmitting(true);
    try {
      const response = await requestPasswordReset(email.trim());
      setSuccessMessage(response.message);
      setPreviewResetUrl(response.previewResetUrl || '');
    } catch (error) {
      setSubmitError(
        error?.message || 'Unable to process password reset request. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout ariaLabel="Bio Cute Life Care Password Recovery">
      <section className="bclc-login-card" aria-labelledby="bclc-forgot-heading">
        <div className="bclc-card-header">
          <div className="bclc-shield-divider" aria-hidden="true">
            <span className="bclc-header-rule" />
            <ShieldLockIcon size={34} />
            <span className="bclc-header-rule" />
          </div>

          <span className="bclc-secure-label">Account Recovery</span>

          <h1 id="bclc-forgot-heading" className="bclc-login-title">
            <span className="bclc-title-admin">Reset</span>{' '}
            <span className="bclc-title-login">Password</span>
          </h1>

          <p className="bclc-login-subtitle">
            Enter your registered admin email to receive reset instructions
          </p>
        </div>

        {submitError && (
          <div className="bclc-alert bclc-alert-error" role="alert" aria-live="assertive">
            <AlertIcon size={18} className="bclc-alert-icon" />
            <span>{submitError}</span>
          </div>
        )}

        {successMessage ? (
          <div className="bclc-recovery-success">
            <div className="bclc-alert bclc-alert-success" role="status" aria-live="polite">
              <CheckCircleIcon size={20} className="bclc-alert-icon" />
              <span>{successMessage}</span>
            </div>
            {previewResetUrl && (
              <div className="bclc-setup-banner">
                <span>Dev preview link:</span>
                <a href={previewResetUrl} className="bclc-setup-banner-btn">
                  Open Reset Link &rsaquo;
                </a>
              </div>
            )}
            <Link to="/login" className="bclc-login-button">
              <ArrowLeftIcon size={18} />
              <span>Back to Login</span>
            </Link>
          </div>
        ) : (
          <form className="bclc-login-form" onSubmit={handleSubmit} noValidate>
            <div className="bclc-field-group">
              <label htmlFor={emailId} className="bclc-sr-only">
                Email Address
              </label>
              <div
                className={`bclc-input-wrapper ${
                  emailError ? 'bclc-input-error' : ''
                }`}
              >
                <span className="bclc-input-icon-left">
                  <MailIcon size={19} />
                </span>
                <input
                  id={emailId}
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={handleBlur}
                  disabled={isSubmitting}
                  aria-label="Email Address"
                  aria-invalid={Boolean(emailError)}
                  aria-describedby={emailError ? emailErrorId : undefined}
                  className="bclc-input"
                  required
                />
              </div>
              {emailError && (
                <p id={emailErrorId} className="bclc-field-error" role="alert">
                  {emailError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className={`bclc-login-button ${isSubmitting ? 'is-loading' : ''}`}
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="bclc-spinner" aria-hidden="true" />
                  <span>Sending Reset Link...</span>
                </>
              ) : (
                <span>Send Recovery Link</span>
              )}
            </button>

            <div className="bclc-back-row">
              <Link to="/login" className="bclc-back-link">
                <ArrowLeftIcon size={16} />
                <span>Return to Admin Login</span>
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
