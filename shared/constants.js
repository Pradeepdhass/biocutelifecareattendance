/**
 * Shared Domain Constants — Bio Cute Life Care Two-Branch Attendance System
 * Strictly TWO branches (Coimbatore & Chennai) and THREE user roles (ADMIN, MANAGER, EMPLOYEE).
 */

export const BRANCHES = Object.freeze(['Coimbatore', 'Chennai']);

export const BRANCH_FILTER_OPTIONS = Object.freeze([
  { value: 'ALL', label: 'All Branches' },
  { value: 'Coimbatore', label: 'Coimbatore' },
  { value: 'Chennai', label: 'Chennai' },
]);

export const MANAGER_BRANCH_OPTIONS = Object.freeze([
  'All Branches',
  'Coimbatore',
  'Chennai',
]);

export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
});

export const LOGIN_ROLE_OPTIONS = Object.freeze([
  {
    value: 'ADMIN',
    label: 'Admin',
    subtitle: 'Sign in to manage branches, managers, employees & settings',
  },
  {
    value: 'MANAGER',
    label: 'Manager',
    subtitle: 'Sign in to manage attendance, staff & leave approvals',
  },
  {
    value: 'EMPLOYEE',
    label: 'Employee',
    subtitle: 'Sign in to mark daily attendance & apply for leave',
  },
]);

export const ATTENDANCE_STATUS = Object.freeze({
  CHECKED_IN: 'CHECKED_IN',
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  ON_LEAVE: 'ON_LEAVE',
});

export const LEAVE_TYPES = Object.freeze([
  'Casual Leave',
  'Sick Leave',
  'Earned Leave',
  'Emergency Leave',
]);

export const LEAVE_STATUS = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
});

export const REPORT_TYPES = Object.freeze([
  { value: 'all', label: 'All Branches Attendance Report' },
  { value: 'coimbatore', label: 'Coimbatore Attendance Report' },
  { value: 'chennai', label: 'Chennai Attendance Report' },
  { value: 'employee', label: 'Employee-wise Attendance Report' },
  { value: 'daily', label: 'Daily Attendance Report' },
  { value: 'monthly', label: 'Monthly Attendance Report' },
]);
