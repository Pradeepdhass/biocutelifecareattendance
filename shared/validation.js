/**
 * Shared Form Validation Utilities for Bio Cute Life Care Login System
 * Works identically in Web (React.js) and Mobile (React Native).
 */

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const PASSWORD_MIN_LENGTH = 6;

/**
 * Validates an email address string.
 * @param {string} email
 * @returns {string} Error message, or empty string if valid.
 */
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

/**
 * Validates a login password string.
 * @param {string} password
 * @returns {string} Error message, or empty string if valid.
 */
export function validatePassword(password) {
  if (!password) {
    return 'Password is required.';
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  return '';
}

/**
 * Validates both login form fields together.
 * @param {{ email: string, password: string }} values
 * @returns {{ isValid: boolean, errors: { email: string, password: string } }}
 */
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

/**
 * Validates the forgot password email input.
 * @param {string} email
 * @returns {{ isValid: boolean, errors: { email: string } }}
 */
export function validateForgotPasswordForm(email) {
  const emailError = validateEmail(email);
  return {
    isValid: !emailError,
    errors: {
      email: emailError,
    },
  };
}
