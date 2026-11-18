import React, { useState, useId } from 'react';
import { Link } from 'react-router-dom';
import {
  validateEmail,
  validatePassword,
  validateLoginForm,
} from '../utils/validation';
import { getRememberedEmail } from '../services/authService';
import {
  ShieldLockIcon,
  MailIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  LoginArrowIcon,
  AlertIcon,
} from './Icons';

export default function LoginForm({
  onSubmit,
  onForgotPassword,
  needsManagerSetup = false,
}) {
  const savedEmail = getRememberedEmail();

  const [email, setEmail] = useState(savedEmail);
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState({ email: false, password: false });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailId = useId();
  const passwordId = useId();
  const rememberId = useId();
  const emailErrorId = useId();
  const passwordErrorId = useId();

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (formError) setFormError('');
    if (touched.email) {
      setFieldErrors((prev) => ({ ...prev, email: validateEmail(value) }));
    }
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    if (formError) setFormError('');
    if (touched.password) {
      setFieldErrors((prev) => ({ ...prev, password: validatePassword(value) }));
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'email') {
      setFieldErrors((prev) => ({ ...prev, email: validateEmail(email) }));
    } else if (field === 'password') {
      setFieldErrors((prev) => ({ ...prev, password: validatePassword(password) }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const { isValid, errors } = validateLoginForm({ email, password });
    setTouched({ email: true, password: true });
    setFieldErrors(errors);

    if (!isValid) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        email: email.trim(),
        password,
        rememberMe,
      });
    } catch (error) {
      setFormError(
        error?.message || 'Unable to sign in. Please verify your credentials and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      className="bclc-login-card"
      aria-labelledby="bclc-login-heading"
    >
      {/* Clean Reference Secure Access Header (Auto-routes Admin, Manager & Employee) */}
      <div className="bclc-card-header">
        <div className="bclc-shield-divider" aria-hidden="true">
          <span className="bclc-header-rule" />
          <ShieldLockIcon size={34} />
          <span className="bclc-header-rule" />
        </div>

        <span className="bclc-secure-label">Secure Access</span>

        <h1 id="bclc-login-heading" className="bclc-login-title">
          <span className="bclc-title-admin">Portal</span>{' '}
          <span className="bclc-title-login">Login</span>
        </h1>

        <p className="bclc-login-subtitle">
          Admin &bull; Manager &bull; Employee
        </p>
      </div>

      {needsManagerSetup && (
        <div className="bclc-setup-banner" role="status">
          <div>
            <strong>Initial Setup Required:</strong> Create the central Admin account first.
          </div>
          <Link to="/setup" className="bclc-setup-banner-btn">
            Setup Admin &rsaquo;
          </Link>
        </div>
      )}

      {formError && (
        <div className="bclc-alert bclc-alert-error" role="alert" aria-live="assertive">
          <AlertIcon size={18} className="bclc-alert-icon" />
          <span>{formError}</span>
        </div>
      )}

      <form className="bclc-login-form" onSubmit={handleSubmit} noValidate>
        {/* Email Address */}
        <div className="bclc-field-group">
          <label htmlFor={emailId} className="bclc-sr-only">
            Email Address
          </label>
          <div
            className={`bclc-input-wrapper ${
              fieldErrors.email ? 'bclc-input-error' : ''
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
              onBlur={() => handleBlur('email')}
              disabled={isSubmitting}
              aria-label="Email Address"
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? emailErrorId : undefined}
              className="bclc-input"
              required
            />
          </div>
          {fieldErrors.email && (
            <p id={emailErrorId} className="bclc-field-error" role="alert">
              {fieldErrors.email}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="bclc-field-group">
          <label htmlFor={passwordId} className="bclc-sr-only">
            Password
          </label>
          <div
            className={`bclc-input-wrapper ${
              fieldErrors.password ? 'bclc-input-error' : ''
            }`}
          >
            <span className="bclc-input-icon-left">
              <LockIcon size={19} />
            </span>
            <input
              id={passwordId}
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={handlePasswordChange}
              onBlur={() => handleBlur('password')}
              disabled={isSubmitting}
              aria-label="Password"
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? passwordErrorId : undefined}
              className="bclc-input bclc-input-with-toggle"
              required
            />
            <button
              type="button"
              className="bclc-password-toggle"
              onClick={() => setShowPassword((prev) => !prev)}
              disabled={isSubmitting}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeIcon size={19} /> : <EyeOffIcon size={19} />}
            </button>
          </div>
          {fieldErrors.password && (
            <p id={passwordErrorId} className="bclc-field-error" role="alert">
              {fieldErrors.password}
            </p>
          )}
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="bclc-form-options">
          <label htmlFor={rememberId} className="bclc-checkbox-label">
            <input
              id={rememberId}
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isSubmitting}
              className="bclc-checkbox-input"
            />
            <span className="bclc-checkbox-box" aria-hidden="true" />
            <span className="bclc-checkbox-text">Keep me signed in</span>
          </label>

          {onForgotPassword ? (
            <button
              type="button"
              onClick={onForgotPassword}
              className="bclc-forgot-link"
              disabled={isSubmitting}
            >
              Forgot Password? <span aria-hidden="true">&rsaquo;</span>
            </button>
          ) : (
            <Link to="/forgot-password" className="bclc-forgot-link">
              Forgot Password? <span aria-hidden="true">&rsaquo;</span>
            </Link>
          )}
        </div>

        {/* Full-Width Crimson Gradient Login Button */}
        <button
          type="submit"
          className={`bclc-login-button ${isSubmitting ? 'is-loading' : ''}`}
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="bclc-spinner" aria-hidden="true" />
              <span>Signing In...</span>
            </>
          ) : (
            <>
              <LoginArrowIcon size={21} className="bclc-login-btn-icon" />
              <span>Login</span>
            </>
          )}
        </button>
      </form>

      {/* Card Footer */}
      <footer className="bclc-card-footer">
        <span className="bclc-footer-rule" aria-hidden="true" />
        <p className="bclc-powered-by">Powered by Bio Cute Life Care</p>
        <span className="bclc-footer-rule" aria-hidden="true" />
      </footer>
    </section>
  );
}
