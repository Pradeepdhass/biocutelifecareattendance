import React from 'react';

/**
 * Dark navy shield with centered lock cutout — matches the reference Secure Access emblem.
 */
export function ShieldLockIcon({ size = 34, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 40"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M18 1.5L33 7.8V18.8C33 28.4 26.6 35.4 18 38.5C9.4 35.4 3 28.4 3 18.8V7.8L18 1.5Z"
        fill="#082D52"
      />
      <rect x="12.2" y="17.8" width="11.6" height="9.2" rx="2" fill="#FFFFFF" />
      <path
        d="M14.5 17.8V14.8C14.5 12.87 16.07 11.3 18 11.3C19.93 11.3 21.5 12.87 21.5 14.8V17.8"
        stroke="#FFFFFF"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      <circle cx="18" cy="21.9" r="1.4" fill="#082D52" />
      <path d="M18 22.8V24.9" stroke="#082D52" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Solid dark navy envelope icon for Email input.
 */
export function MailIcon({ size = 19, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="4.5" width="20" height="15" rx="2.5" fill="currentColor" />
      <path
        d="M3.5 6.2L12 12.4L20.5 6.2"
        stroke="#FFFFFF"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Solid dark navy padlock icon for Password input.
 */
export function LockIcon({ size = 19, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M7.5 10.5V7.5C7.5 5.01 9.51 3 12 3C14.49 3 16.5 5.01 16.5 7.5V10.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <rect x="4.5" y="10" width="15" height="11" rx="2.5" fill="currentColor" />
      <circle cx="12" cy="15.2" r="1.4" fill="#FFFFFF" />
      <path d="M12 16.2V18.2" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function EyeIcon({ size = 19, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2.2 12s3.5-6.5 9.8-6.5S21.8 12 21.8 12s-3.5 6.5-9.8 6.5S2.2 12 2.2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon({ size = 19, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9.9 5.3A10.7 10.7 0 0 1 12 5.5c6.3 0 9.8 6.5 9.8 6.5a17.6 17.6 0 0 1-3.1 4" />
      <path d="M6.6 6.6A17.8 17.8 0 0 0 2.2 12s3.5 6.5 9.8 6.5a10.4 10.4 0 0 0 4.6-1" />
      <path d="M14.1 14.1a3 3 0 0 1-4.2-4.2" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

export function LoginArrowIcon({ size = 21, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M13 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" />
      <polyline points="10 16.5 14.5 12 10 7.5" />
      <line x1="14.5" y1="12" x2="3.5" y2="12" />
    </svg>
  );
}

export function AlertIcon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.5" />
      <line x1="12" y1="8" x2="12" y2="12.5" />
      <circle cx="12" cy="16" r="0.8" fill="currentColor" />
    </svg>
  );
}

export function ArrowLeftIcon({ size = 17, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

export function CheckCircleIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.5" />
      <polyline points="8.5 12.5 11 15 16 9.5" />
    </svg>
  );
}

/* Healthcare Feature Hub Icons */
export function MedicalShieldPlusIcon({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 52" fill="none" aria-hidden="true">
      <path
        d="M24 2L44 10.5V25C44 37.5 35.5 46.8 24 50.5C12.5 46.8 4 37.5 4 25V10.5L24 2Z"
        fill="rgba(255,255,255,0.18)"
        stroke="#FFFFFF"
        strokeWidth="2.8"
      />
      <path
        d="M24 16V34M15 25H33"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function UsersIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="3.5" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a3.5 3.5 0 0 1 0 6.75" />
    </svg>
  );
}

export function CalendarCheckIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
      <line x1="16" y1="2.5" x2="16" y2="6.5" />
      <line x1="8" y1="2.5" x2="8" y2="6.5" />
      <line x1="3" y1="9.5" x2="21" y2="9.5" />
      <polyline points="9 15 11.2 17.2 15.5 13" />
    </svg>
  );
}

export function ClockIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15.5 14" />
    </svg>
  );
}

export function BarChartIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="4" y1="20" x2="20" y2="20" />
      <rect x="6" y="13" width="3" height="7" rx="0.8" />
      <rect x="11" y="9" width="3" height="11" rx="0.8" />
      <rect x="16" y="5" width="3" height="15" rx="0.8" />
    </svg>
  );
}

/* Footer Icons */
export function HeartbeatIcon({ size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="1 11 7 11 10 3 14 17 17.5 8.5 20 11 27 11" />
    </svg>
  );
}

export function ShieldCheckSolidIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 22" fill="none" aria-hidden="true">
      <path
        d="M10 1L18.5 4.5V10.5C18.5 15.8 14.9 19.7 10 21.5C5.1 19.7 1.5 15.8 1.5 10.5V4.5L10 1Z"
        fill="currentColor"
      />
      <polyline
        points="6.5 11.2 9 13.7 13.8 8.5"
        stroke="#082D52"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HeartOutlineIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20.5S3.5 15 3.5 8.8A4.8 4.8 0 0 1 12 5.9a4.8 4.8 0 0 1 8.5 2.9C20.5 15 12 20.5 12 20.5Z" />
    </svg>
  );
}

export function FooterPulseGraphic() {
  return (
    <svg
      width="112"
      height="32"
      viewBox="0 0 112 32"
      fill="none"
      aria-hidden="true"
      className="bclc-footer-pulse-svg"
    >
      <path
        d="M2 18H44L50 18L54 7L59 25L63 14L66 18H78"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M93 26.5C93 26.5 80 18.8 80 10.8C80 7.1 82.9 4.5 86.3 4.5C89.1 4.5 91.5 6.2 93 8.5C94.5 6.2 96.9 4.5 99.7 4.5C103.1 4.5 106 7.1 106 10.8C106 18.8 93 26.5 93 26.5Z"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
