/**
 * Validation Utilities for Bio Cute Life Care Mobile Login System
 * Mirrors shared/validation.js for standalone Metro bundler compatibility.
 */

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const PASSWORD_MIN_LENGTH = 6;

export function validateEmail(email) {
  const trimmed = (email || '').trim();
  if (!trimmed) {
    return 'Email address is required.';
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return 'Please enter a valid email address.';
  }
  return '';
}

export function validatePassword(password) {
  if (!password) {
    return 'Password is required.';
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  return '';
}

export function validateLoginForm({ email, password }) {
  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);

  return {
    isValid: !emailError && !passwordError,
    errors: {
      email: emailError,
      password: passwordError,
    },
  };
}

export function validateForgotPasswordForm(email) {
  const emailError = validateEmail(email);
  return {
    isValid: !emailError,
    errors: {
      email: emailError,
    },
  };
}
