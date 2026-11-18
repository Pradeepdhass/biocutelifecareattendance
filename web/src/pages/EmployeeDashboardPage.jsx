import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import biocuteLogo from '../assets/biocute_logo.png';
import ToastNotification from '../components/ToastNotification';
import {
  getEmployeeDashboard,
  employeeCheckIn,
  employeeCheckOut,
  applyLeave,
  getMyLeaveRequests,
  cancelLeaveRequest,
} from '../services/attendanceService';
import { LEAVE_TYPES } from '@shared/constants';
import {
  DEFAULT_ATTENDANCE_SETTINGS,
  formatTime12h,
  evaluateTimeWindow,
} from '@shared/attendanceRules';
import '../styles/dashboard.css';

function formatEmpId(id, code) {
  if (code) return code;
  if (typeof id === 'number' || /^\d+$/.test(String(id))) {
    return `EMP-${String(id).padStart(4, '0')}`;
  }
  return `EMP-${String(id || '').slice(0, 6).toUpperCase()}`;
}

function getTodayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function calculateDays(start, end) {
  if (!start || !end) return 0;
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return 0;
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function formatTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function formatHours(hours) {
  const n = Number(hours) || 0;
  return `${n.toFixed(2)} hrs`;
}

function StatusBadge({ status }) {
  const map = {
    CHECKED_IN: { label: 'Checked In', cls: 'bclc-badge-blue' },
    PRESENT: { label: 'Present', cls: 'bclc-badge-green' },
    ABSENT: { label: 'Absent', cls: 'bclc-badge-red' },
    ON_LEAVE: { label: 'On Approved Leave', cls: 'bclc-badge-amber' },
    NOT_CHECKED_IN: { label: 'Not Checked In', cls: 'bclc-badge-neutral' },
  };
  const info = map[status] || map.NOT_CHECKED_IN;
  return <span className={`bclc-badge ${info.cls}`}>{info.label}</span>;
}

function LeaveStatusBadge({ status }) {
  const map = {
    PENDING: { label: 'Pending', cls: 'bclc-badge-amber' },
    APPROVED: { label: 'Approved', cls: 'bclc-badge-green' },
    REJECTED: { label: 'Rejected', cls: 'bclc-badge-red' },
  };
  const info = map[status] || { label: status, cls: 'bclc-badge-neutral' };
  return <span className={`bclc-badge ${info.cls}`}>{info.label}</span>;
}

export default function EmployeeDashboardPage() {
  const { user, isAuthReady, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('attendance');
  const [data, setData] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState('');
  const [banner, setBanner] = useState({ type: '', text: '' });
  const [now, setNow] = useState(() => new Date());

  // Leave application form state
  const [leaveForm, setLeaveForm] = useState({
    leaveType: LEAVE_TYPES[0],
    startDate: getTodayIso(),
    endDate: getTodayIso(),
    reason: '',
  });
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);

  // Live ticking clock
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadSelfDashboard = useCallback(async () => {
    try {
      const [response, myLeaves] = await Promise.all([
        getEmployeeDashboard(),
        getMyLeaveRequests().catch(() => []),
      ]);
      setData(response);
      setLeaves(myLeaves);
    } catch (err) {
      setBanner({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;
    loadSelfDashboard();
  }, [isAuthReady, loadSelfDashboard]);

  const handleCheckIn = async () => {
    setActionBusy('in');
    setBanner({ type: '', text: '' });
    try {
      const res = await employeeCheckIn();
      setBanner({ type: 'success', text: res.message });
      await loadSelfDashboard();
    } catch (err) {
      setBanner({ type: 'error', text: err.message });
    } finally {
      setActionBusy('');
    }
  };

  const handleCheckOut = async () => {
    setActionBusy('out');
    setBanner({ type: '', text: '' });
    try {
      const res = await employeeCheckOut();
      setBanner({ type: 'success', text: res.message });
      await loadSelfDashboard();
    } catch (err) {
      setBanner({ type: 'error', text: err.message });
    } finally {
      setActionBusy('');
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    setBanner({ type: '', text: '' });
    setLeaveSubmitting(true);
    try {
      const res = await applyLeave(leaveForm);
      setBanner({ type: 'success', text: res.message });
      setLeaveForm((prev) => ({ ...prev, reason: '' }));
      await loadSelfDashboard();
    } catch (err) {
      setBanner({ type: 'error', text: err.message });
    } finally {
      setLeaveSubmitting(false);
    }
  };

  const handleCancelLeave = async (leaveId) => {
    setBanner({ type: '', text: '' });
    try {
      const res = await cancelLeaveRequest(leaveId);
      setBanner({ type: 'success', text: res.message });
      await loadSelfDashboard();
    } catch (err) {
      setBanner({ type: 'error', text: err.message });
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const employee = data?.employee || user?.employee || null;
  const settings = data?.settings || DEFAULT_ATTENDANCE_SETTINGS;
  const today = data?.todayAttendance;
  const todayIso = getTodayIso();
  const hasApprovedLeaveToday = leaves.some(
    (l) => l.status === 'APPROVED' && l.startDate <= todayIso && todayIso <= l.endDate
  );

  const hasCheckedIn = Boolean(today?.checkIn);
  const hasCheckedOut = Boolean(today?.checkOut);

  const checkInWindow = settings.enforceLimits
    ? evaluateTimeWindow(now, settings.checkInStart, settings.checkInEnd, 'Check-in')
    : { allowed: true, reason: '' };

  const checkOutWindow = settings.enforceLimits
    ? evaluateTimeWindow(now, settings.checkOutStart, settings.checkOutEnd, 'Check-out')
    : { allowed: true, reason: '' };

  const canCheckIn = !hasCheckedIn && checkInWindow.allowed && !actionBusy;
  const canCheckOut = hasCheckedIn && !hasCheckedOut && checkOutWindow.allowed && !actionBusy;

  // Live elapsed hours while currently checked in
  let displayWorkingHours = today?.workingHours || 0;
  if (hasCheckedIn && !hasCheckedOut) {
    const elapsedMs = Math.max(0, now.getTime() - new Date(today.checkIn).getTime());
    displayWorkingHours = Math.round((elapsedMs / (1000 * 60 * 60)) * 100) / 100;
  }

  const todayStatus = hasCheckedOut
    ? 'PRESENT'
    : hasCheckedIn
    ? 'CHECKED_IN'
    : hasApprovedLeaveToday
    ? 'ON_LEAVE'
    : 'NOT_CHECKED_IN';

  const currentDateText = now.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const currentTimeText = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const leavePreviewDays = calculateDays(leaveForm.startDate, leaveForm.endDate);
  const pendingLeavesCount = leaves.filter((l) => l.status === 'PENDING').length;
  const approvedLeavesCount = leaves.filter((l) => l.status === 'APPROVED').length;

  return (
    <div className="bclc-portal">
      {/* Top Brand Navigation Bar */}
      <header className="bclc-topbar">
        <div className="bclc-topbar-left">
          <div className="bclc-topbar-logo-pill">
            <img src={biocuteLogo} alt="Bio Cute Life Care" className="bclc-topbar-logo" />
          </div>
          <div>
            <span className="bclc-topbar-role">Employee Attendance Portal</span>
            <h1 className="bclc-topbar-title">Attendance Management System</h1>
          </div>
        </div>

        <div className="bclc-topbar-right">
          <div className="bclc-topbar-user">
            <span className="bclc-topbar-user-name">
              {employee?.employeeName || 'Employee'}
            </span>
            <span className="bclc-topbar-user-email">{employee?.email}</span>
          </div>
          <button type="button" className="bclc-btn-danger" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </header>

      {/* Subbar Tabs: Daily Attendance | Leave Management */}
      <div className="bclc-subbar">
        <nav className="bclc-tabs" aria-label="Employee Navigation">
          <button
            type="button"
            className={`bclc-tab ${activeTab === 'attendance' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            Daily Attendance
          </button>
          <button
            type="button"
            className={`bclc-tab ${activeTab === 'leave' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('leave')}
          >
            Leave Management ({leaves.length})
          </button>
        </nav>

        {employee?.branch && (
          <div className="bclc-emp-topbar-branch">
            <span>Assigned Branch:</span>
            <span
              className={`bclc-branch-tag ${
                employee.branch === 'Coimbatore' ? 'is-cbe' : 'is-chn'
              }`}
            >
              {employee.branch}
            </span>
          </div>
        )}
      </div>

      <ToastNotification
        toast={banner}
        onDismiss={() => setBanner({ type: '', text: '' })}
      />

      <main className="bclc-portal-main">
        {loading ? (
          <div className="bclc-panel bclc-empty-cell">Loading your attendance dashboard...</div>
        ) : activeTab === 'attendance' ? (
          <>
            {/* Employee Profile & Live Clock + Check-in / Check-out Panel */}
            <section className="bclc-emp-hero-grid">
              {/* Assigned Profile Card (Strictly Name, Email, Read-only Branch) */}
              <article className="bclc-panel bclc-emp-profile-card">
                <span className="bclc-branch-kicker">My Employee Profile</span>
                <h2 className="bclc-emp-name">{employee?.employeeName}</h2>
                <p className="bclc-emp-email">{employee?.email}</p>

                <div className="bclc-emp-meta-row">
                  <div>
                    <span className="bclc-meta-label">Employee ID</span>
                    <strong className="mono">
                      {formatEmpId(employee?.id, employee?.employeeCode)}
                    </strong>
                  </div>
                  <div>
                    <span className="bclc-meta-label">Assigned Branch</span>
                    <span
                      className={`bclc-branch-tag ${
                        employee?.branch === 'Coimbatore' ? 'is-cbe' : 'is-chn'
                      }`}
                    >
                      {employee?.branch}
                    </span>
                  </div>
                </div>
                <p className="bclc-branch-lock-note">
                  Branch assignment is managed centrally and automatically applied to your
                  attendance and leave records.
                </p>
              </article>

              {/* Live Date, Time & Check-In / Check-Out Action Card */}
              <article className="bclc-panel bclc-clock-card">
                <div className="bclc-clock-top">
                  <div>
                    <span className="bclc-branch-kicker">Current Date &amp; Time</span>
                    <p className="bclc-current-date">{currentDateText}</p>
                    <p className="bclc-current-time">{currentTimeText}</p>
                  </div>
                  <div className="bclc-today-status-box">
                    <span className="bclc-meta-label">Today&apos;s Status</span>
                    <StatusBadge status={todayStatus} />
                  </div>
                </div>

                <div className="bclc-today-metrics">
                  <div>
                    <span>Check-in Time</span>
                    <strong>{formatTime(today?.checkIn)}</strong>
                  </div>
                  <div>
                    <span>Check-out Time</span>
                    <strong>{formatTime(today?.checkOut)}</strong>
                  </div>
                  <div>
                    <span>Total Working Hours</span>
                    <strong className="text-blue">{formatHours(displayWorkingHours)}</strong>
                  </div>
                </div>

                {/* Admin-Configured Working Hours & Time Limits */}
                <div className="bclc-emp-schedule-strip">
                  <div>
                    <span>Working Hours</span>
                    <strong>
                      {formatTime12h(settings.workStart)} – {formatTime12h(settings.workEnd)}
                    </strong>
                  </div>
                  <div>
                    <span>Check-in Limit</span>
                    <strong>
                      {formatTime12h(settings.checkInStart)} – {formatTime12h(settings.checkInEnd)}
                    </strong>
                  </div>
                  <div>
                    <span>Check-out Limit</span>
                    <strong>
                      {formatTime12h(settings.checkOutStart)} –{' '}
                      {formatTime12h(settings.checkOutEnd)}
                    </strong>
                  </div>
                </div>

                {!hasCheckedIn && !checkInWindow.allowed && (
                  <p className="bclc-window-notice">{checkInWindow.reason}</p>
                )}
                {hasCheckedIn && !hasCheckedOut && !checkOutWindow.allowed && (
                  <p className="bclc-window-notice">{checkOutWindow.reason}</p>
                )}

                <div className="bclc-punch-actions">
                  <button
                    type="button"
                    className="bclc-btn-checkin"
                    onClick={handleCheckIn}
                    disabled={!canCheckIn}
                  >
                    {actionBusy === 'in'
                      ? 'Checking In...'
                      : hasCheckedIn
                      ? 'Checked In Today'
                      : 'Check In'}
                  </button>

                  <button
                    type="button"
                    className="bclc-btn-checkout"
                    onClick={handleCheckOut}
                    disabled={!canCheckOut}
                  >
                    {actionBusy === 'out'
                      ? 'Checking Out...'
                      : hasCheckedOut
                      ? 'Checked Out Today'
                      : 'Check Out'}
                  </button>
                </div>
              </article>
            </section>

            {/* Personal Attendance History Table */}
            <section className="bclc-panel">
              <div className="bclc-panel-head">
                <div>
                  <h2>My Attendance History</h2>
                  <p>Your personal daily check-in and check-out records</p>
                </div>
              </div>

              <div className="bclc-table-wrap">
                <table className="bclc-table">
                  <thead>
                    <tr>
                      <th>Employee ID</th>
                      <th>Employee Name</th>
                      <th>Employee Email</th>
                      <th>Branch</th>
                      <th>Attendance Date</th>
                      <th>Check-in Time</th>
                      <th>Check-out Time</th>
                      <th>Working Hours</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.history || []).length === 0 ? (
                      <tr>
                        <td colSpan={9} className="bclc-empty-cell">
                          No attendance records yet. Click &ldquo;Check In&rdquo; above to log
                          today&apos;s attendance.
                        </td>
                      </tr>
                    ) : (
                      data.history.map((rec) => (
                        <tr key={rec.id}>
                          <td data-label="Employee ID" className="mono">
                            {formatEmpId(rec.employeeId, rec.employeeCode)}
                          </td>
                          <td data-label="Employee Name" className="strong">
                            {rec.employeeName}
                          </td>
                          <td data-label="Email">{rec.employeeEmail}</td>
                          <td data-label="Branch">
                            <span
                              className={`bclc-branch-tag ${
                                rec.branch === 'Coimbatore' ? 'is-cbe' : 'is-chn'
                              }`}
                            >
                              {rec.branch}
                            </span>
                          </td>
                          <td data-label="Date">{rec.attendanceDate}</td>
                          <td data-label="Check-in">{formatTime(rec.checkIn)}</td>
                          <td data-label="Check-out">{formatTime(rec.checkOut)}</td>
                          <td data-label="Working Hours" className="mono">
                            {formatHours(rec.workingHours)}
                          </td>
                          <td data-label="Status">
                            <StatusBadge status={rec.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          /* ==================== EMPLOYEE LEAVE MANAGEMENT TAB ==================== */
          <>
            <section className="bclc-leave-summary-grid">
              <article className="bclc-kpi-card bclc-kpi-accent-navy">
                <span className="bclc-kpi-label">Total Requests</span>
                <strong className="bclc-kpi-value">{leaves.length}</strong>
                <span className="bclc-kpi-sub">Submitted by you</span>
              </article>
              <article className="bclc-kpi-card bclc-kpi-accent-amber">
                <span className="bclc-kpi-label">Pending Approval</span>
                <strong className="bclc-kpi-value">{pendingLeavesCount}</strong>
                <span className="bclc-kpi-sub">Awaiting central Manager</span>
              </article>
              <article className="bclc-kpi-card bclc-kpi-accent-green">
                <span className="bclc-kpi-label">Approved Leaves</span>
                <strong className="bclc-kpi-value">{approvedLeavesCount}</strong>
                <span className="bclc-kpi-sub">Approved by Manager</span>
              </article>
            </section>

            <section className="bclc-panel">
              <div className="bclc-panel-head">
                <div>
                  <h2>Apply for Leave</h2>
                  <p>
                    Submit a leave request for your assigned branch ({employee?.branch}) — reviewed
                    by the central Manager
                  </p>
                </div>
              </div>

              <form onSubmit={handleApplyLeave} className="bclc-leave-form">
                <div className="bclc-leave-form-grid">
                  <label className="bclc-control-field">
                    <span>Leave Type *</span>
                    <select
                      value={leaveForm.leaveType}
                      onChange={(e) =>
                        setLeaveForm((prev) => ({ ...prev, leaveType: e.target.value }))
                      }
                      className="bclc-control-input"
                      required
                    >
                      {LEAVE_TYPES.map((lt) => (
                        <option key={lt} value={lt}>
                          {lt}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="bclc-control-field">
                    <span>From Date *</span>
                    <input
                      type="date"
                      value={leaveForm.startDate}
                      onChange={(e) => {
                        const nextStart = e.target.value;
                        setLeaveForm((prev) => ({
                          ...prev,
                          startDate: nextStart,
                          endDate: prev.endDate < nextStart ? nextStart : prev.endDate,
                        }));
                      }}
                      className="bclc-control-input"
                      required
                    />
                  </label>

                  <label className="bclc-control-field">
                    <span>To Date *</span>
                    <input
                      type="date"
                      min={leaveForm.startDate}
                      value={leaveForm.endDate}
                      onChange={(e) =>
                        setLeaveForm((prev) => ({ ...prev, endDate: e.target.value }))
                      }
                      className="bclc-control-input"
                      required
                    />
                  </label>

                  <div className="bclc-control-field">
                    <span>Total Leave Days</span>
                    <div className="bclc-days-pill">
                      {leavePreviewDays > 0
                        ? `${leavePreviewDays} Day${leavePreviewDays > 1 ? 's' : ''}`
                        : 'Invalid range'}
                    </div>
                  </div>
                </div>

                <label className="bclc-control-field">
                  <span>Reason for Leave *</span>
                  <textarea
                    rows={3}
                    placeholder="Enter reason for leave request..."
                    value={leaveForm.reason}
                    onChange={(e) =>
                      setLeaveForm((prev) => ({ ...prev, reason: e.target.value }))
                    }
                    className="bclc-control-textarea"
                    required
                  />
                </label>

                <div className="bclc-settings-actions">
                  <button
                    type="submit"
                    className="bclc-btn-primary"
                    disabled={leaveSubmitting || leavePreviewDays <= 0}
                  >
                    {leaveSubmitting ? 'Submitting Request...' : 'Submit Leave Request'}
                  </button>
                </div>
              </form>
            </section>

            <section className="bclc-panel">
              <div className="bclc-panel-head">
                <div>
                  <h2>My Leave Requests</h2>
                  <p>Track approval status and Manager remarks</p>
                </div>
              </div>

              <div className="bclc-table-wrap">
                <table className="bclc-table">
                  <thead>
                    <tr>
                      <th>Leave Type</th>
                      <th>From Date</th>
                      <th>To Date</th>
                      <th>Days</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Manager Remark</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="bclc-empty-cell">
                          No leave requests submitted yet.
                        </td>
                      </tr>
                    ) : (
                      leaves.map((lv) => (
                        <tr key={lv.id}>
                          <td data-label="Leave Type" className="strong">
                            {lv.leaveType}
                          </td>
                          <td data-label="From Date">{lv.startDate}</td>
                          <td data-label="To Date">{lv.endDate}</td>
                          <td data-label="Days" className="mono">
                            {lv.totalDays}
                          </td>
                          <td data-label="Reason">{lv.reason}</td>
                          <td data-label="Status">
                            <LeaveStatusBadge status={lv.status} />
                          </td>
                          <td data-label="Manager Remark">{lv.managerNote || '—'}</td>
                          <td data-label="Action" className="bclc-cell-actions">
                            {lv.status === 'PENDING' ? (
                              <button
                                type="button"
                                className="bclc-btn-danger-outline-sm"
                                onClick={() => handleCancelLeave(lv.id)}
                              >
                                Cancel
                              </button>
                            ) : (
                              <span className="bclc-muted-dash">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
