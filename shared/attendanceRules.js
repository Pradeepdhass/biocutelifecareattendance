/**
 * Shared Working Hours & Check-in / Check-out Time Limit Rules
 * Default Schedule: 9:00 AM to 6:30 PM (9.50 working hours/day)
 */

export const DEFAULT_ATTENDANCE_SETTINGS = Object.freeze({
  workStart: '09:00',       // 9:00 AM
  workEnd: '18:30',         // 6:30 PM
  checkInStart: '09:00',    // Earliest allowed check-in (9:00 AM)
  checkInEnd: '09:30',      // Latest allowed check-in limit (9:30 AM)
  checkOutStart: '18:30',   // Earliest allowed check-out (6:30 PM)
  checkOutEnd: '19:30',     // Latest allowed check-out limit (7:30 PM)
  enforceLimits: true,
});

const HHMM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidHHMM(value) {
  return HHMM_REGEX.test(String(value || '').trim());
}

export function timeToMinutes(hhmm) {
  const match = String(hhmm || '').trim().match(HHMM_REGEX);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function formatTime12h(hhmm) {
  const mins = timeToMinutes(hhmm);
  if (mins === null) return String(hhmm || '—');
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export function calculateShiftHours(workStart, workEnd) {
  const s = timeToMinutes(workStart);
  const e = timeToMinutes(workEnd);
  if (s === null || e === null || e <= s) return 0;
  return Math.round(((e - s) / 60) * 100) / 100;
}

export function normalizeAttendanceSettings(raw = {}) {
  return {
    workStart: isValidHHMM(raw.workStart)
      ? raw.workStart
      : DEFAULT_ATTENDANCE_SETTINGS.workStart,
    workEnd: isValidHHMM(raw.workEnd)
      ? raw.workEnd
      : DEFAULT_ATTENDANCE_SETTINGS.workEnd,
    checkInStart: isValidHHMM(raw.checkInStart)
      ? raw.checkInStart
      : DEFAULT_ATTENDANCE_SETTINGS.checkInStart,
    checkInEnd: isValidHHMM(raw.checkInEnd)
      ? raw.checkInEnd
      : DEFAULT_ATTENDANCE_SETTINGS.checkInEnd,
    checkOutStart: isValidHHMM(raw.checkOutStart)
      ? raw.checkOutStart
      : DEFAULT_ATTENDANCE_SETTINGS.checkOutStart,
    checkOutEnd: isValidHHMM(raw.checkOutEnd)
      ? raw.checkOutEnd
      : DEFAULT_ATTENDANCE_SETTINGS.checkOutEnd,
    enforceLimits:
      typeof raw.enforceLimits === 'boolean'
        ? raw.enforceLimits
        : DEFAULT_ATTENDANCE_SETTINGS.enforceLimits,
  };
}

export function validateAttendanceSettings(settings) {
  const fields = [
    ['workStart', 'Working Hours Start'],
    ['workEnd', 'Working Hours End'],
    ['checkInStart', 'Check-in Start Time'],
    ['checkInEnd', 'Check-in End Limit'],
    ['checkOutStart', 'Check-out Start Time'],
    ['checkOutEnd', 'Check-out End Limit'],
  ];

  for (const [key, label] of fields) {
    if (!isValidHHMM(settings[key])) {
      return `${label} must be a valid time (HH:MM).`;
    }
  }

  if (timeToMinutes(settings.workEnd) <= timeToMinutes(settings.workStart)) {
    return 'Working Hours End must be later than Working Hours Start.';
  }
  if (timeToMinutes(settings.checkInEnd) <= timeToMinutes(settings.checkInStart)) {
    return 'Check-in End Limit must be later than Check-in Start Time.';
  }
  if (timeToMinutes(settings.checkOutEnd) <= timeToMinutes(settings.checkOutStart)) {
    return 'Check-out End Limit must be later than Check-out Start Time.';
  }

  return '';
}

/**
 * Evaluates whether a given Date is inside an allowed [startHHMM, endHHMM] window.
 */
export function evaluateTimeWindow(now, startHHMM, endHHMM, label = 'Action') {
  const startMin = timeToMinutes(startHHMM);
  const endMin = timeToMinutes(endHHMM);
  if (startMin === null || endMin === null) {
    return { allowed: true, reason: '' };
  }

  const currentMin = now.getHours() * 60 + now.getMinutes();
  if (currentMin < startMin) {
    return {
      allowed: false,
      reason: `${label} opens at ${formatTime12h(startHHMM)} (allowed window: ${formatTime12h(startHHMM)} – ${formatTime12h(endHHMM)}).`,
    };
  }
  if (currentMin > endMin) {
    return {
      allowed: false,
      reason: `${label} time limit has closed at ${formatTime12h(endHHMM)} (allowed window: ${formatTime12h(startHHMM)} – ${formatTime12h(endHHMM)}).`,
    };
  }
  return { allowed: true, reason: '' };
}
