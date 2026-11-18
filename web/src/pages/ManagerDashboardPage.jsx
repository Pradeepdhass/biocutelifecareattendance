import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import biocuteLogo from '../assets/biocute_logo.png';
import ToastNotification from '../components/ToastNotification';
import {
  getManagerDashboard,
  getEmployees,
  createEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  resendEmployeeInvite,
  deleteEmployee,
  getManagers,
  createManagerAccount,
  updateManagerAccount,
  toggleManagerStatus,
  resendManagerInvite,
  deleteManagerAccount,
  getAttendanceSettings,
  saveAttendanceSettings,
  getAllLeaveRequests,
  reviewLeaveRequest,
  getReportData,
  downloadReportExport,
} from '../services/attendanceService';
import {
  BRANCHES,
  BRANCH_FILTER_OPTIONS,
  MANAGER_BRANCH_OPTIONS,
  REPORT_TYPES,
} from '@shared/constants';
import {
  DEFAULT_ATTENDANCE_SETTINGS,
  formatTime12h,
  calculateShiftHours,
} from '@shared/attendanceRules';
import '../styles/dashboard.css';

function formatEmpId(id, code) {
  if (code) return code;
  if (typeof id === 'number' || /^\d+$/.test(String(id))) {
    return `EMP-${String(id).padStart(4, '0')}`;
  }
  return `EMP-${String(id || '').slice(0, 6).toUpperCase()}`;
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

function getTodayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getCurrentMonthIso() {
  return getTodayIso().slice(0, 7);
}

function StatusBadge({ status }) {
  const map = {
    CHECKED_IN: { label: 'Checked In', cls: 'bclc-badge-blue' },
    PRESENT: { label: 'Present', cls: 'bclc-badge-green' },
    ABSENT: { label: 'Absent', cls: 'bclc-badge-red' },
    ON_LEAVE: { label: 'On Leave', cls: 'bclc-badge-amber' },
  };
  const info = map[status] || { label: status || '—', cls: 'bclc-badge-neutral' };
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

export default function ManagerDashboardPage({ portalRole = 'ADMIN' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isAdminPortal = portalRole === 'ADMIN' || user?.role === 'ADMIN';
  const assignedManagerBranch =
    !isAdminPortal && user?.manager?.branch && user.manager.branch !== 'All Branches'
      ? user.manager.branch
      : null;

  const [activeTab, setActiveTab] = useState('overview');
  const [branchFilter, setBranchFilter] = useState(assignedManagerBranch || 'ALL');
  const [selectedDate, setSelectedDate] = useState(getTodayIso());

  const [dashboard, setDashboard] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState({ type: '', text: '', link: '' });

  // Manager Account Modal state (Admin-only)
  const [mgrModalOpen, setMgrModalOpen] = useState(false);
  const [editingManager, setEditingManager] = useState(null);
  const [mgrForm, setMgrForm] = useState({
    managerName: '',
    email: '',
    branch: 'All Branches',
    password: '',
  });
  const [mgrSubmitting, setMgrSubmitting] = useState(false);
  const [mgrFormError, setMgrFormError] = useState('');
  const [deleteMgrTarget, setDeleteMgrTarget] = useState(null);
  const [deleteMgrBusy, setDeleteMgrBusy] = useState(false);

  // Add / Edit Employee Modal state (STRICTLY 3 profile fields: employeeName, email, branch)
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [empForm, setEmpForm] = useState({
    employeeName: '',
    email: '',
    branch: 'Coimbatore',
    password: '',
  });
  const [empSubmitting, setEmpSubmitting] = useState(false);
  const [empFormError, setEmpFormError] = useState('');

  // Permanent Delete Confirmation Modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Shift Working Hours & Check-in/Check-out Time Limit Settings state
  const [timeSettings, setTimeSettings] = useState({ ...DEFAULT_ATTENDANCE_SETTINGS });
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Leave Management state
  const [leaves, setLeaves] = useState([]);
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('ALL');
  const [reviewingLeave, setReviewingLeave] = useState(null);
  const [reviewAction, setReviewAction] = useState('APPROVED');
  const [reviewNote, setReviewNote] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);

  // Reports state
  const [reportType, setReportType] = useState('all');
  const [reportBranch, setReportBranch] = useState('ALL');
  const [reportDate, setReportDate] = useState(getTodayIso());
  const [reportMonth, setReportMonth] = useState(getCurrentMonthIso());
  const [reportEmployeeId, setReportEmployeeId] = useState('');
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [exportingFormat, setExportingFormat] = useState('');

  const effectiveBranchFilter = assignedManagerBranch || branchFilter;

  const loadDashboard = useCallback(async () => {
    try {
      const data = await getManagerDashboard({
        branch: effectiveBranchFilter,
        date: selectedDate,
      });
      setDashboard(data);
    } catch (err) {
      setBanner({ type: 'error', text: err.message, link: '' });
    }
  }, [effectiveBranchFilter, selectedDate]);

  const loadEmployees = useCallback(async () => {
    try {
      const list = await getEmployees({ branch: assignedManagerBranch || 'ALL' });
      setEmployees(list);
      if (!reportEmployeeId && list.length > 0) {
        setReportEmployeeId(String(list[0].id));
      }
    } catch (err) {
      setBanner({ type: 'error', text: err.message, link: '' });
    }
  }, [reportEmployeeId, assignedManagerBranch]);

  const loadManagers = useCallback(async () => {
    if (!isAdminPortal) return;
    try {
      const list = await getManagers();
      setManagers(list);
    } catch {
      // Non-blocking if managers collection is empty
    }
  }, [isAdminPortal]);

  const loadSettings = useCallback(async () => {
    try {
      const s = await getAttendanceSettings();
      setTimeSettings(s);
    } catch {
      // Keep default 9:00 AM - 6:30 PM settings
    }
  }, []);

  const loadLeaves = useCallback(async () => {
    try {
      const list = await getAllLeaveRequests({
        branch: assignedManagerBranch || 'ALL',
        status: 'ALL',
      });
      setLeaves(list);
    } catch {
      // Non-blocking if leaves collection has no records yet
    }
  }, [assignedManagerBranch]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      loadDashboard(),
      loadEmployees(),
      loadManagers(),
      loadSettings(),
      loadLeaves(),
    ]).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [loadDashboard, loadEmployees, loadManagers, loadSettings, loadLeaves]);

  const buildReportParams = useCallback(() => {
    const params = { type: reportType };
    if (reportType === 'daily') {
      params.date = reportDate;
      params.branch = reportBranch;
    } else if (reportType === 'monthly') {
      params.month = reportMonth;
      params.branch = reportBranch;
    } else if (reportType === 'employee') {
      params.employeeId = reportEmployeeId;
    }
    return params;
  }, [reportType, reportDate, reportMonth, reportBranch, reportEmployeeId]);

  const fetchReportPreview = useCallback(async () => {
    if (reportType === 'employee' && !reportEmployeeId) {
      setReportData(null);
      return;
    }
    setReportLoading(true);
    try {
      const data = await getReportData(buildReportParams());
      setReportData(data);
    } catch (err) {
      setBanner({ type: 'error', text: err.message, link: '' });
    } finally {
      setReportLoading(false);
    }
  }, [buildReportParams, reportType, reportEmployeeId]);

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReportPreview();
    }
  }, [activeTab, fetchReportPreview]);

  const handleExport = async (format) => {
    setExportingFormat(format);
    setBanner({ type: '', text: '', link: '' });
    try {
      const filename = await downloadReportExport({
        format,
        ...buildReportParams(),
      });
      setBanner({
        type: 'success',
        text: `Downloaded ${filename} successfully.`,
        link: '',
      });
    } catch (err) {
      setBanner({ type: 'error', text: err.message, link: '' });
    } finally {
      setExportingFormat('');
    }
  };

  const openAddModal = () => {
    setEditingEmployee(null);
    setEmpForm({
      employeeName: '',
      email: '',
      branch: assignedManagerBranch || (branchFilter === 'Chennai' ? 'Chennai' : 'Coimbatore'),
      password: '',
    });
    setEmpFormError('');
    setEmpModalOpen(true);
  };

  const openEditModal = (emp) => {
    setEditingEmployee(emp);
    setEmpForm({
      employeeName: emp.employeeName,
      email: emp.email,
      branch: emp.branch,
      password: '',
    });
    setEmpFormError('');
    setEmpModalOpen(true);
  };

  const handleEmployeeSubmit = async (e) => {
    e.preventDefault();
    setEmpFormError('');

    if (!empForm.employeeName.trim()) {
      setEmpFormError('Employee Name is required.');
      return;
    }
    if (!empForm.email.trim()) {
      setEmpFormError('Email Address is required.');
      return;
    }

    setEmpSubmitting(true);
    try {
      if (editingEmployee) {
        const res = await updateEmployee(editingEmployee.id, {
          employeeName: empForm.employeeName.trim(),
          email: empForm.email.trim(),
          branch: empForm.branch,
        });
        setBanner({ type: 'success', text: res.message, link: '' });
      } else {
        const res = await createEmployee({
          employeeName: empForm.employeeName.trim(),
          email: empForm.email.trim(),
          branch: empForm.branch,
          password: empForm.password.trim(),
        });
        setBanner({
          type: 'success',
          text: res.message,
          link: res.invitation?.activationUrl || '',
        });
      }

      setEmpModalOpen(false);
      await Promise.all([loadDashboard(), loadEmployees()]);
    } catch (err) {
      setEmpFormError(err.message);
    } finally {
      setEmpSubmitting(false);
    }
  };

  const handleToggleStatus = async (emp) => {
    setBanner({ type: '', text: '', link: '' });
    try {
      const res = await toggleEmployeeStatus(emp.id, !emp.isActive);
      setBanner({ type: 'success', text: res.message, link: '' });
      await Promise.all([loadDashboard(), loadEmployees()]);
    } catch (err) {
      setBanner({ type: 'error', text: err.message, link: '' });
    }
  };

  const handleResendInvite = async (emp) => {
    setBanner({ type: '', text: '', link: '' });
    try {
      const res = await resendEmployeeInvite(emp.id);
      setBanner({
        type: 'success',
        text: res.message,
        link: res.invitation?.activationUrl || '',
      });
    } catch (err) {
      setBanner({ type: 'error', text: err.message, link: '' });
    }
  };

  const openDeleteModal = (emp) => {
    setDeleteTarget(emp);
    setDeleteConfirmed(false);
    setDeleteError('');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !deleteConfirmed || deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError('');
    try {
      const res = await deleteEmployee(deleteTarget);
      setDeleteTarget(null);
      setDeleteConfirmed(false);
      setBanner({ type: 'success', text: res.message, link: '' });
      if (String(reportEmployeeId) === String(deleteTarget.id)) {
        setReportEmployeeId('');
      }
      await Promise.all([loadDashboard(), loadEmployees()]);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleSaveTimeSettings = async (e) => {
    e.preventDefault();
    setSettingsSaving(true);
    setBanner({ type: '', text: '', link: '' });
    try {
      const res = await saveAttendanceSettings(timeSettings);
      setTimeSettings(res.settings);
      setBanner({ type: 'success', text: res.message, link: '' });
    } catch (err) {
      setBanner({ type: 'error', text: err.message, link: '' });
    } finally {
      setSettingsSaving(false);
    }
  };

  const openLeaveReviewModal = (leave, action) => {
    setReviewingLeave(leave);
    setReviewAction(action);
    setReviewNote(leave.managerNote || '');
  };

  const handleConfirmLeaveReview = async () => {
    if (!reviewingLeave || reviewBusy) return;
    setReviewBusy(true);
    setBanner({ type: '', text: '', link: '' });
    try {
      const res = await reviewLeaveRequest(reviewingLeave.id, {
        status: reviewAction,
        managerNote: reviewNote,
      });
      setReviewingLeave(null);
      setReviewNote('');
      setBanner({ type: 'success', text: res.message, link: '' });
      await Promise.all([loadLeaves(), loadDashboard()]);
    } catch (err) {
      setBanner({ type: 'error', text: err.message, link: '' });
    } finally {
      setReviewBusy(false);
    }
  };

  const openAddManagerModal = () => {
    setEditingManager(null);
    setMgrForm({
      managerName: '',
      email: '',
      branch: 'All Branches',
      password: '',
    });
    setMgrFormError('');
    setMgrModalOpen(true);
  };

  const openEditManagerModal = (mgr) => {
    setEditingManager(mgr);
    setMgrForm({
      managerName: mgr.managerName,
      email: mgr.email,
      branch: mgr.branch || 'All Branches',
      password: '',
    });
    setMgrFormError('');
    setMgrModalOpen(true);
  };

  const handleManagerSubmit = async (e) => {
    e.preventDefault();
    setMgrFormError('');
    if (!mgrForm.managerName.trim()) {
      setMgrFormError('Manager Name is required.');
      return;
    }
    if (!mgrForm.email.trim()) {
      setMgrFormError('Email Address is required.');
      return;
    }
    setMgrSubmitting(true);
    try {
      if (editingManager) {
        const res = await updateManagerAccount(editingManager.id, {
          managerName: mgrForm.managerName.trim(),
          email: mgrForm.email.trim(),
          branch: mgrForm.branch,
        });
        setBanner({ type: 'success', text: res.message, link: '' });
      } else {
        const res = await createManagerAccount({
          managerName: mgrForm.managerName.trim(),
          email: mgrForm.email.trim(),
          branch: mgrForm.branch,
          password: mgrForm.password.trim(),
        });
        setBanner({ type: 'success', text: res.message, link: '' });
      }
      setMgrModalOpen(false);
      await loadManagers();
    } catch (err) {
      setMgrFormError(err.message);
    } finally {
      setMgrSubmitting(false);
    }
  };

  const handleToggleManagerStatus = async (mgr) => {
    setBanner({ type: '', text: '', link: '' });
    try {
      const res = await toggleManagerStatus(mgr.id, !mgr.isActive);
      setBanner({ type: 'success', text: res.message, link: '' });
      await loadManagers();
    } catch (err) {
      setBanner({ type: 'error', text: err.message, link: '' });
    }
  };

  const handleResendManagerInvite = async (mgr) => {
    setBanner({ type: '', text: '', link: '' });
    try {
      const res = await resendManagerInvite(mgr.id);
      setBanner({ type: 'success', text: res.message, link: '' });
    } catch (err) {
      setBanner({ type: 'error', text: err.message, link: '' });
    }
  };

  const handleConfirmDeleteManager = async () => {
    if (!deleteMgrTarget || deleteMgrBusy) return;
    setDeleteMgrBusy(true);
    setBanner({ type: '', text: '', link: '' });
    try {
      const res = await deleteManagerAccount(deleteMgrTarget);
      setDeleteMgrTarget(null);
      setBanner({ type: 'success', text: res.message, link: '' });
      await loadManagers();
    } catch (err) {
      setBanner({ type: 'error', text: err.message, link: '' });
    } finally {
      setDeleteMgrBusy(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const filteredEmployees =
    branchFilter === 'ALL'
      ? employees
      : employees.filter((e) => e.branch === branchFilter);

  const pendingLeaveCount = leaves.filter((l) => l.status === 'PENDING').length;
  const filteredLeaves = leaves.filter((l) => {
    const branchOk = branchFilter === 'ALL' || l.branch === branchFilter;
    const statusOk = leaveStatusFilter === 'ALL' || l.status === leaveStatusFilter;
    return branchOk && statusOk;
  });

  const stats = dashboard?.stats || {
    totalEmployees: 0,
    coimbatoreEmployees: 0,
    chennaiEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    currentlyCheckedIn: 0,
  };

  return (
    <div className="bclc-portal">
      {/* Top Brand Navigation Bar */}
      <header className="bclc-topbar">
        <div className="bclc-topbar-left">
          <div className="bclc-topbar-logo-pill">
            <img src={biocuteLogo} alt="Bio Cute Life Care" className="bclc-topbar-logo" />
          </div>
          <div>
            <span className="bclc-topbar-role">
              {isAdminPortal
                ? 'Central Admin Portal'
                : `Manager Portal${assignedManagerBranch ? ` • ${assignedManagerBranch}` : ''}`}
            </span>
            <h1 className="bclc-topbar-title">Attendance Management System</h1>
          </div>
        </div>

        <div className="bclc-topbar-right">
          <div className="bclc-topbar-user">
            <span className="bclc-topbar-user-name">
              {isAdminPortal ? 'Central Admin' : user?.name || 'Manager'}
            </span>
            <span className="bclc-topbar-user-email">{user?.email}</span>
          </div>
          <button type="button" className="bclc-btn-danger" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </header>

      {/* Navigation Tabs + Global Branch Filter */}
      <div className="bclc-subbar">
        <nav className="bclc-tabs" aria-label="Portal Navigation">
          <button
            type="button"
            className={`bclc-tab ${activeTab === 'overview' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Dashboard &amp; Attendance
          </button>
          {isAdminPortal && (
            <button
              type="button"
              className={`bclc-tab ${activeTab === 'managers' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('managers')}
            >
              Managers ({managers.length})
            </button>
          )}
          <button
            type="button"
            className={`bclc-tab ${activeTab === 'employees' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('employees')}
          >
            Employees ({employees.length})
          </button>
          <button
            type="button"
            className={`bclc-tab ${activeTab === 'leaves' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('leaves')}
          >
            Leave Requests{pendingLeaveCount > 0 ? ` (${pendingLeaveCount})` : ''}
          </button>
          {isAdminPortal && (
            <button
              type="button"
              className={`bclc-tab ${activeTab === 'reports' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              Reports &amp; Exports
            </button>
          )}
          {isAdminPortal && (
            <button
              type="button"
              className={`bclc-tab ${activeTab === 'settings' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              Shift &amp; Time Limits
            </button>
          )}
        </nav>

        {!assignedManagerBranch &&
          (activeTab === 'overview' || activeTab === 'employees' || activeTab === 'leaves') && (
            <div className="bclc-branch-pills" role="group" aria-label="Branch Filter">
              {BRANCH_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`bclc-branch-pill ${branchFilter === opt.value ? 'is-active' : ''}`}
                  onClick={() => setBranchFilter(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
      </div>

      <ToastNotification
        toast={banner}
        onDismiss={() => setBanner({ type: '', text: '', link: '' })}
      />

      <main className="bclc-portal-main">
        {/* ==================== TAB 1: OVERVIEW & ATTENDANCE ==================== */}
        {activeTab === 'overview' && (
          <>
            {/* Required 6 KPI Cards */}
            <section className="bclc-kpi-grid" aria-label="Attendance Statistics">
              <article className="bclc-kpi-card">
                <span className="bclc-kpi-label">Total Employees</span>
                <strong className="bclc-kpi-value">{stats.totalEmployees}</strong>
                <span className="bclc-kpi-sub">Active across both branches</span>
              </article>
              <article className="bclc-kpi-card bclc-kpi-accent-blue">
                <span className="bclc-kpi-label">Coimbatore Employees</span>
                <strong className="bclc-kpi-value">{stats.coimbatoreEmployees}</strong>
                <span className="bclc-kpi-sub">Coimbatore Branch</span>
              </article>
              <article className="bclc-kpi-card bclc-kpi-accent-navy">
                <span className="bclc-kpi-label">Chennai Employees</span>
                <strong className="bclc-kpi-value">{stats.chennaiEmployees}</strong>
                <span className="bclc-kpi-sub">Chennai Branch</span>
              </article>
              <article className="bclc-kpi-card bclc-kpi-accent-green">
                <span className="bclc-kpi-label">Present Today</span>
                <strong className="bclc-kpi-value">{stats.presentToday}</strong>
                <span className="bclc-kpi-sub">Date: {selectedDate}</span>
              </article>
              <article className="bclc-kpi-card bclc-kpi-accent-red">
                <span className="bclc-kpi-label">Absent Today</span>
                <strong className="bclc-kpi-value">{stats.absentToday}</strong>
                <span className="bclc-kpi-sub">Not checked in</span>
              </article>
              <article className="bclc-kpi-card bclc-kpi-accent-blue">
                <span className="bclc-kpi-label">Currently Checked In</span>
                <strong className="bclc-kpi-value">{stats.currentlyCheckedIn}</strong>
                <span className="bclc-kpi-sub">Active shift in progress</span>
              </article>
            </section>

            {/* Branch-wise Attendance Summaries */}
            <section className="bclc-branch-summary-grid" aria-label="Branch-wise Attendance Summaries">
              {(dashboard?.branchSummaries || []).map((summary) => {
                const rate =
                  summary.totalEmployees > 0
                    ? Math.round((summary.presentToday / summary.totalEmployees) * 100)
                    : 0;
                return (
                  <article key={summary.branch} className="bclc-panel bclc-branch-card">
                    <div className="bclc-branch-card-head">
                      <div>
                        <span className="bclc-branch-kicker">Branch Summary</span>
                        <h3>{summary.branch}</h3>
                      </div>
                      <span className="bclc-rate-pill">{rate}% Present</span>
                    </div>

                    <div className="bclc-progress-track">
                      <div className="bclc-progress-fill" style={{ width: `${rate}%` }} />
                    </div>

                    <div className="bclc-branch-metrics">
                      <div>
                        <span>Total</span>
                        <strong>{summary.totalEmployees}</strong>
                      </div>
                      <div>
                        <span>Present</span>
                        <strong className="text-green">{summary.presentToday}</strong>
                      </div>
                      <div>
                        <span>Absent</span>
                        <strong className="text-red">{summary.absentToday}</strong>
                      </div>
                      <div>
                        <span>Checked In</span>
                        <strong className="text-blue">{summary.currentlyCheckedIn}</strong>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>

            {/* Attendance Records Table */}
            <section className="bclc-panel">
              <div className="bclc-panel-head">
                <div>
                  <h2>
                    Attendance Records —{' '}
                    {branchFilter === 'ALL' ? 'All Branches' : `${branchFilter} Branch`}
                  </h2>
                  <p>Live daily attendance across Coimbatore and Chennai</p>
                </div>
                <div className="bclc-panel-actions">
                  <label className="bclc-date-label">
                    <span>Date:</span>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bclc-control-input"
                    />
                  </label>
                  {isAdminPortal && (
                    <button type="button" className="bclc-btn-primary" onClick={openAddModal}>
                      + Add Employee
                    </button>
                  )}
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
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="bclc-empty-cell">
                          Loading attendance records...
                        </td>
                      </tr>
                    ) : (dashboard?.attendanceRecords || []).length === 0 ? (
                      <tr>
                        <td colSpan={9} className="bclc-empty-cell">
                          No active employees found for this filter. Add employees to begin tracking
                          attendance.
                        </td>
                      </tr>
                    ) : (
                      dashboard.attendanceRecords.map((rec) => (
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
        )}

        {/* ==================== ADMIN-ONLY TAB: MANAGER MANAGEMENT ==================== */}
        {isAdminPortal && activeTab === 'managers' && (
          <section className="bclc-panel">
            <div className="bclc-panel-head">
              <div>
                <h2>Manager Management</h2>
                <p>
                  Create and manage Manager login accounts for Coimbatore, Chennai, or All Branches
                </p>
              </div>
              <button type="button" className="bclc-btn-primary" onClick={openAddManagerModal}>
                + Add Manager
              </button>
            </div>

            <div className="bclc-table-wrap">
              <table className="bclc-table">
                <thead>
                  <tr>
                    <th>Manager ID</th>
                    <th>Manager Name</th>
                    <th>Email Address</th>
                    <th>Assigned Branch</th>
                    <th>Account Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {managers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="bclc-empty-cell">
                        No Manager accounts created yet. Click &ldquo;+ Add Manager&rdquo; to add a
                        branch or operations Manager.
                      </td>
                    </tr>
                  ) : (
                    managers.map((mgr) => (
                      <tr key={mgr.id}>
                        <td data-label="Manager ID" className="mono">
                          {mgr.managerCode}
                        </td>
                        <td data-label="Manager Name" className="strong">
                          {mgr.managerName}
                        </td>
                        <td data-label="Email">{mgr.email}</td>
                        <td data-label="Branch">
                          <span
                            className={`bclc-branch-tag ${
                              mgr.branch === 'Coimbatore' ? 'is-cbe' : 'is-chn'
                            }`}
                          >
                            {mgr.branch}
                          </span>
                        </td>
                        <td data-label="Status">
                          <span
                            className={`bclc-badge ${
                              mgr.isActive ? 'bclc-badge-green' : 'bclc-badge-neutral'
                            }`}
                          >
                            {mgr.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td data-label="Actions" className="bclc-cell-actions">
                          <div className="bclc-row-actions">
                            <button
                              type="button"
                              className="bclc-btn-outline-sm"
                              onClick={() => openEditManagerModal(mgr)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="bclc-btn-outline-sm"
                              onClick={() => handleToggleManagerStatus(mgr)}
                            >
                              {mgr.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              className="bclc-btn-outline-sm"
                              onClick={() => handleResendManagerInvite(mgr)}
                            >
                              Send Invite
                            </button>
                            <button
                              type="button"
                              className="bclc-btn-danger-outline-sm"
                              onClick={() => setDeleteMgrTarget(mgr)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ==================== TAB 2: EMPLOYEE MANAGEMENT ==================== */}
        {activeTab === 'employees' && (
          <section className="bclc-panel">
            <div className="bclc-panel-head">
              <div>
                <h2>{isAdminPortal ? 'Employee Management' : 'Branch Employees'}</h2>
                <p>
                  {isAdminPortal
                    ? 'Manage employees across Coimbatore & Chennai (Name, Email & Branch only)'
                    : 'Read-only employee directory — only Admin can add, edit, or delete employees'}
                </p>
              </div>
              {isAdminPortal && (
                <button type="button" className="bclc-btn-primary" onClick={openAddModal}>
                  + Add Employee
                </button>
              )}
            </div>

            <div className="bclc-table-wrap">
              <table className="bclc-table">
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Employee Name</th>
                    <th>Email Address</th>
                    <th>Branch</th>
                    <th>Account Status</th>
                    {isAdminPortal && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={isAdminPortal ? 6 : 5} className="bclc-empty-cell">
                        {isAdminPortal
                          ? 'No employees added yet. Click "+ Add Employee" to create an employee login account.'
                          : 'No employees assigned to this branch yet.'}
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <tr key={emp.id}>
                        <td data-label="Employee ID" className="mono">
                          {formatEmpId(emp.id, emp.employeeCode)}
                        </td>
                        <td data-label="Employee Name" className="strong">
                          {emp.employeeName}
                        </td>
                        <td data-label="Email">{emp.email}</td>
                        <td data-label="Branch">
                          <span
                            className={`bclc-branch-tag ${
                              emp.branch === 'Coimbatore' ? 'is-cbe' : 'is-chn'
                            }`}
                          >
                            {emp.branch}
                          </span>
                        </td>
                        <td data-label="Status">
                          <span
                            className={`bclc-badge ${
                              emp.isActive ? 'bclc-badge-green' : 'bclc-badge-neutral'
                            }`}
                          >
                            {emp.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        {isAdminPortal && (
                          <td data-label="Actions" className="bclc-cell-actions">
                            <div className="bclc-row-actions">
                              <button
                                type="button"
                                className="bclc-btn-outline-sm"
                                onClick={() => openEditModal(emp)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="bclc-btn-outline-sm"
                                onClick={() => handleToggleStatus(emp)}
                              >
                                {emp.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                type="button"
                                className="bclc-btn-outline-sm"
                                onClick={() => handleResendInvite(emp)}
                              >
                                Send Invite
                              </button>
                              <button
                                type="button"
                                className="bclc-btn-danger-outline-sm"
                                onClick={() => openDeleteModal(emp)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ==================== TAB 3: LEAVE REQUESTS ==================== */}
        {activeTab === 'leaves' && (
          <section className="bclc-panel">
            <div className="bclc-panel-head">
              <div>
                <h2>
                  Employee Leave Requests —{' '}
                  {branchFilter === 'ALL' ? 'All Branches' : `${branchFilter} Branch`}
                </h2>
                <p>Review, approve, or reject leave requests from Coimbatore &amp; Chennai</p>
              </div>

              <div className="bclc-branch-pills" role="group" aria-label="Leave Status Filter">
                {[
                  { value: 'ALL', label: 'All' },
                  { value: 'PENDING', label: `Pending (${pendingLeaveCount})` },
                  { value: 'APPROVED', label: 'Approved' },
                  { value: 'REJECTED', label: 'Rejected' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`bclc-branch-pill ${
                      leaveStatusFilter === opt.value ? 'is-active' : ''
                    }`}
                    onClick={() => setLeaveStatusFilter(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bclc-table-wrap">
              <table className="bclc-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Branch</th>
                    <th>Leave Type</th>
                    <th>Dates</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaves.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="bclc-empty-cell">
                        No leave requests found for the selected branch and status filter.
                      </td>
                    </tr>
                  ) : (
                    filteredLeaves.map((lv) => (
                      <tr key={lv.id}>
                        <td data-label="Employee">
                          <div className="strong">{lv.employeeName}</div>
                          <div className="bclc-table-sub">{lv.employeeEmail}</div>
                        </td>
                        <td data-label="Branch">
                          <span
                            className={`bclc-branch-tag ${
                              lv.branch === 'Coimbatore' ? 'is-cbe' : 'is-chn'
                            }`}
                          >
                            {lv.branch}
                          </span>
                        </td>
                        <td data-label="Leave Type" className="strong">
                          {lv.leaveType}
                        </td>
                        <td data-label="Dates" className="mono">
                          {lv.startDate} → {lv.endDate}
                        </td>
                        <td data-label="Days" className="mono">
                          {lv.totalDays}
                        </td>
                        <td data-label="Reason">
                          <div>{lv.reason}</div>
                          {lv.managerNote && (
                            <div className="bclc-table-sub">Note: {lv.managerNote}</div>
                          )}
                        </td>
                        <td data-label="Status">
                          <LeaveStatusBadge status={lv.status} />
                        </td>
                        <td data-label="Actions" className="bclc-cell-actions">
                          <div className="bclc-row-actions">
                            {lv.status !== 'APPROVED' && (
                              <button
                                type="button"
                                className="bclc-btn-approve-sm"
                                onClick={() => openLeaveReviewModal(lv, 'APPROVED')}
                              >
                                Approve
                              </button>
                            )}
                            {lv.status !== 'REJECTED' && (
                              <button
                                type="button"
                                className="bclc-btn-danger-outline-sm"
                                onClick={() => openLeaveReviewModal(lv, 'REJECTED')}
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ==================== TAB 4: REPORTS & EXPORTS (ADMIN ONLY) ==================== */}
        {isAdminPortal && activeTab === 'reports' && (
          <section className="bclc-panel">
            <div className="bclc-panel-head">
              <div>
                <h2>Attendance Reports &amp; Exports</h2>
                <p>Generate combined, branch-wise, employee-wise, daily, and monthly reports</p>
              </div>
              <div className="bclc-export-group">
                <button
                  type="button"
                  className="bclc-btn-export is-excel"
                  disabled={Boolean(exportingFormat)}
                  onClick={() => handleExport('xlsx')}
                >
                  {exportingFormat === 'xlsx' ? 'Exporting...' : 'Export Excel (.xlsx)'}
                </button>
                <button
                  type="button"
                  className="bclc-btn-export is-pdf"
                  disabled={Boolean(exportingFormat)}
                  onClick={() => handleExport('pdf')}
                >
                  {exportingFormat === 'pdf' ? 'Exporting...' : 'Export PDF (.pdf)'}
                </button>
                <button
                  type="button"
                  className="bclc-btn-export is-csv"
                  disabled={Boolean(exportingFormat)}
                  onClick={() => handleExport('csv')}
                >
                  {exportingFormat === 'csv' ? 'Exporting...' : 'Export CSV (.csv)'}
                </button>
              </div>
            </div>

            <div className="bclc-report-controls">
              <label className="bclc-control-field">
                <span>Report Type</span>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="bclc-control-input"
                >
                  {REPORT_TYPES.map((rt) => (
                    <option key={rt.value} value={rt.value}>
                      {rt.label}
                    </option>
                  ))}
                </select>
              </label>

              {(reportType === 'daily' || reportType === 'monthly') && (
                <label className="bclc-control-field">
                  <span>Branch</span>
                  <select
                    value={reportBranch}
                    onChange={(e) => setReportBranch(e.target.value)}
                    className="bclc-control-input"
                  >
                    {BRANCH_FILTER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {reportType === 'daily' && (
                <label className="bclc-control-field">
                  <span>Attendance Date</span>
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="bclc-control-input"
                  />
                </label>
              )}

              {reportType === 'monthly' && (
                <label className="bclc-control-field">
                  <span>Month</span>
                  <input
                    type="month"
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                    className="bclc-control-input"
                  />
                </label>
              )}

              {reportType === 'employee' && (
                <label className="bclc-control-field">
                  <span>Select Employee</span>
                  <select
                    value={reportEmployeeId}
                    onChange={(e) => setReportEmployeeId(e.target.value)}
                    className="bclc-control-input"
                  >
                    {employees.length === 0 ? (
                      <option value="">No employees available</option>
                    ) : (
                      employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.employeeName} ({emp.branch})
                        </option>
                      ))
                    )}
                  </select>
                </label>
              )}
            </div>

            {reportData && (
              <div className="bclc-report-summary-strip">
                <div>
                  <strong>{reportData.title}</strong>
                  <span> — {reportData.subtitle}</span>
                </div>
                <div className="bclc-report-totals">
                  <span>Records: <strong>{reportData.totalRecords}</strong></span>
                  <span>
                    Total Hours: <strong>{formatHours(reportData.totalWorkingHours)}</strong>
                  </span>
                </div>
              </div>
            )}

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
                  {reportLoading ? (
                    <tr>
                      <td colSpan={9} className="bclc-empty-cell">
                        Generating report...
                      </td>
                    </tr>
                  ) : !reportData || reportData.records.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="bclc-empty-cell">
                        No attendance records match this report filter.
                      </td>
                    </tr>
                  ) : (
                    reportData.records.map((rec) => (
                      <tr key={`${rec.id}_${rec.attendanceDate}`}>
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
        )}

        {/* ==================== TAB 5: SHIFT & TIME LIMITS (ADMIN ONLY) ==================== */}
        {isAdminPortal && activeTab === 'settings' && (
          <section className="bclc-panel">
            <div className="bclc-panel-head">
              <div>
                <h2>Working Hours &amp; Check-in / Check-out Time Limits</h2>
                <p>
                  Configure standard working hours (default 9:00 AM – 6:30 PM) and allowed
                  check-in / check-out windows for both Coimbatore and Chennai branches
                </p>
              </div>
              <button
                type="button"
                className="bclc-btn-outline"
                onClick={() => setTimeSettings({ ...DEFAULT_ATTENDANCE_SETTINGS })}
              >
                Reset to 9:00 AM – 6:30 PM
              </button>
            </div>

            <div className="bclc-schedule-summary-bar">
              <div>
                <span>Standard Working Hours</span>
                <strong>
                  {formatTime12h(timeSettings.workStart)} – {formatTime12h(timeSettings.workEnd)} (
                  {calculateShiftHours(timeSettings.workStart, timeSettings.workEnd).toFixed(2)}{' '}
                  hrs)
                </strong>
              </div>
              <div>
                <span>Check-in Window</span>
                <strong className="text-green">
                  {formatTime12h(timeSettings.checkInStart)} –{' '}
                  {formatTime12h(timeSettings.checkInEnd)}
                </strong>
              </div>
              <div>
                <span>Check-out Window</span>
                <strong className="text-red">
                  {formatTime12h(timeSettings.checkOutStart)} –{' '}
                  {formatTime12h(timeSettings.checkOutEnd)}
                </strong>
              </div>
            </div>

            <form onSubmit={handleSaveTimeSettings} className="bclc-settings-form">
              <div className="bclc-settings-grid">
                {/* Working Hours */}
                <div className="bclc-settings-card">
                  <h3>Working Hours</h3>
                  <p>Official office shift schedule (default morning 9:00 AM to evening 6:30 PM)</p>
                  <div className="bclc-time-pair">
                    <label className="bclc-control-field">
                      <span>Shift Start Time</span>
                      <input
                        type="time"
                        value={timeSettings.workStart}
                        onChange={(e) =>
                          setTimeSettings((prev) => ({ ...prev, workStart: e.target.value }))
                        }
                        className="bclc-control-input"
                        required
                      />
                    </label>
                    <label className="bclc-control-field">
                      <span>Shift End Time</span>
                      <input
                        type="time"
                        value={timeSettings.workEnd}
                        onChange={(e) =>
                          setTimeSettings((prev) => ({ ...prev, workEnd: e.target.value }))
                        }
                        className="bclc-control-input"
                        required
                      />
                    </label>
                  </div>
                </div>

                {/* Check-in Time Limit */}
                <div className="bclc-settings-card">
                  <h3>Check-in Time Limit</h3>
                  <p>Employees can check in only within this morning window when enforced</p>
                  <div className="bclc-time-pair">
                    <label className="bclc-control-field">
                      <span>Earliest Check-in</span>
                      <input
                        type="time"
                        value={timeSettings.checkInStart}
                        onChange={(e) =>
                          setTimeSettings((prev) => ({ ...prev, checkInStart: e.target.value }))
                        }
                        className="bclc-control-input"
                        required
                      />
                    </label>
                    <label className="bclc-control-field">
                      <span>Check-in Cutoff Limit</span>
                      <input
                        type="time"
                        value={timeSettings.checkInEnd}
                        onChange={(e) =>
                          setTimeSettings((prev) => ({ ...prev, checkInEnd: e.target.value }))
                        }
                        className="bclc-control-input"
                        required
                      />
                    </label>
                  </div>
                </div>

                {/* Check-out Time Limit */}
                <div className="bclc-settings-card">
                  <h3>Check-out Time Limit</h3>
                  <p>Employees can check out only within this evening window when enforced</p>
                  <div className="bclc-time-pair">
                    <label className="bclc-control-field">
                      <span>Earliest Check-out</span>
                      <input
                        type="time"
                        value={timeSettings.checkOutStart}
                        onChange={(e) =>
                          setTimeSettings((prev) => ({ ...prev, checkOutStart: e.target.value }))
                        }
                        className="bclc-control-input"
                        required
                      />
                    </label>
                    <label className="bclc-control-field">
                      <span>Check-out Cutoff Limit</span>
                      <input
                        type="time"
                        value={timeSettings.checkOutEnd}
                        onChange={(e) =>
                          setTimeSettings((prev) => ({ ...prev, checkOutEnd: e.target.value }))
                        }
                        className="bclc-control-input"
                        required
                      />
                    </label>
                  </div>
                </div>
              </div>

              <label className="bclc-enforce-toggle">
                <input
                  type="checkbox"
                  checked={timeSettings.enforceLimits}
                  onChange={(e) =>
                    setTimeSettings((prev) => ({ ...prev, enforceLimits: e.target.checked }))
                  }
                />
                <span>
                  <strong>Enforce strict Check-in &amp; Check-out time limits</strong> — Block
                  employee check-in or check-out outside the configured windows above
                </span>
              </label>

              <div className="bclc-settings-actions">
                <button
                  type="submit"
                  className="bclc-btn-primary"
                  disabled={settingsSaving}
                >
                  {settingsSaving ? 'Saving Settings...' : 'Save Time Limits'}
                </button>
              </div>
            </form>
          </section>
        )}
      </main>

      {/* Add / Edit Employee Modal (STRICTLY ONLY Name, Email & Branch + optional Password) */}
      {empModalOpen && (
        <div
          className="bclc-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bclc-emp-modal-title"
        >
          <div className="bclc-modal">
            <div className="bclc-modal-head">
              <h2 id="bclc-emp-modal-title">
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </h2>
              <button
                type="button"
                className="bclc-alert-close"
                onClick={() => setEmpModalOpen(false)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            {empFormError && (
              <div className="bclc-portal-alert is-error" role="alert">
                <span>{empFormError}</span>
              </div>
            )}

            <form onSubmit={handleEmployeeSubmit} className="bclc-modal-form">
              <label className="bclc-control-field">
                <span>Employee Name *</span>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={empForm.employeeName}
                  onChange={(e) =>
                    setEmpForm((prev) => ({ ...prev, employeeName: e.target.value }))
                  }
                  className="bclc-control-input"
                  required
                />
              </label>

              <label className="bclc-control-field">
                <span>Email Address *</span>
                <input
                  type="email"
                  placeholder="employee@biocutelifecare.com"
                  value={empForm.email}
                  onChange={(e) =>
                    setEmpForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="bclc-control-input"
                  required
                />
              </label>

              <label className="bclc-control-field">
                <span>Branch *</span>
                <select
                  value={assignedManagerBranch || empForm.branch}
                  onChange={(e) =>
                    setEmpForm((prev) => ({ ...prev, branch: e.target.value }))
                  }
                  disabled={Boolean(assignedManagerBranch)}
                  className="bclc-control-input"
                  required
                >
                  {(assignedManagerBranch ? [assignedManagerBranch] : BRANCHES).map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>

              {!editingEmployee && (
                <label className="bclc-control-field">
                  <span>Initial Password (Optional — leave blank for email activation link)</span>
                  <input
                    type="password"
                    placeholder="Optional temporary password (min 6 chars)"
                    value={empForm.password}
                    onChange={(e) =>
                      setEmpForm((prev) => ({ ...prev, password: e.target.value }))
                    }
                    className="bclc-control-input"
                  />
                </label>
              )}

              <div className="bclc-modal-actions">
                <button
                  type="button"
                  className="bclc-btn-outline"
                  onClick={() => setEmpModalOpen(false)}
                  disabled={empSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bclc-btn-primary"
                  disabled={empSubmitting}
                >
                  {empSubmitting
                    ? 'Saving...'
                    : editingEmployee
                    ? 'Save Changes'
                    : 'Create & Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin-Only: Add / Edit Manager Modal */}
      {isAdminPortal && mgrModalOpen && (
        <div
          className="bclc-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bclc-mgr-modal-title"
        >
          <div className="bclc-modal">
            <div className="bclc-modal-head">
              <h2 id="bclc-mgr-modal-title">
                {editingManager ? 'Edit Manager' : 'Add New Manager'}
              </h2>
              <button
                type="button"
                className="bclc-alert-close"
                onClick={() => setMgrModalOpen(false)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            {mgrFormError && (
              <div className="bclc-portal-alert is-error" role="alert">
                <span>{mgrFormError}</span>
              </div>
            )}

            <form onSubmit={handleManagerSubmit} className="bclc-modal-form">
              <label className="bclc-control-field">
                <span>Manager Name *</span>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={mgrForm.managerName}
                  onChange={(e) =>
                    setMgrForm((prev) => ({ ...prev, managerName: e.target.value }))
                  }
                  className="bclc-control-input"
                  required
                />
              </label>

              <label className="bclc-control-field">
                <span>Email Address *</span>
                <input
                  type="email"
                  placeholder="manager@biocutelifecare.com"
                  value={mgrForm.email}
                  onChange={(e) =>
                    setMgrForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="bclc-control-input"
                  required
                />
              </label>

              <label className="bclc-control-field">
                <span>Assigned Branch *</span>
                <select
                  value={mgrForm.branch}
                  onChange={(e) =>
                    setMgrForm((prev) => ({ ...prev, branch: e.target.value }))
                  }
                  className="bclc-control-input"
                  required
                >
                  {MANAGER_BRANCH_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>

              {!editingManager && (
                <label className="bclc-control-field">
                  <span>Initial Password (Optional — leave blank for email invite)</span>
                  <input
                    type="password"
                    placeholder="Optional temporary password (min 6 chars)"
                    value={mgrForm.password}
                    onChange={(e) =>
                      setMgrForm((prev) => ({ ...prev, password: e.target.value }))
                    }
                    className="bclc-control-input"
                  />
                </label>
              )}

              <div className="bclc-modal-actions">
                <button
                  type="button"
                  className="bclc-btn-outline"
                  onClick={() => setMgrModalOpen(false)}
                  disabled={mgrSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="bclc-btn-primary" disabled={mgrSubmitting}>
                  {mgrSubmitting
                    ? 'Saving...'
                    : editingManager
                    ? 'Save Changes'
                    : 'Create Manager'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin-Only: Delete Manager Confirmation Modal */}
      {isAdminPortal && deleteMgrTarget && (
        <div
          className="bclc-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bclc-delete-mgr-title"
        >
          <div className="bclc-modal bclc-modal-danger">
            <div className="bclc-modal-head">
              <h2 id="bclc-delete-mgr-title" className="text-red">
                Delete Manager Account?
              </h2>
              <button
                type="button"
                className="bclc-alert-close"
                onClick={() => !deleteMgrBusy && setDeleteMgrTarget(null)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <div className="bclc-delete-warning-box" role="alert">
              <strong>Warning:</strong> Deleting{' '}
              <strong>{deleteMgrTarget.managerName}</strong> ({deleteMgrTarget.email}) will
              permanently remove their Manager account from the server and revoke portal access.
            </div>

            <div className="bclc-modal-actions">
              <button
                type="button"
                className="bclc-btn-outline"
                onClick={() => setDeleteMgrTarget(null)}
                disabled={deleteMgrBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bclc-btn-delete-confirm"
                onClick={handleConfirmDeleteManager}
                disabled={deleteMgrBusy}
              >
                {deleteMgrBusy ? 'Deleting...' : 'Delete Manager'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Review Confirmation Modal */}
      {reviewingLeave && (
        <div
          className="bclc-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bclc-leave-review-title"
        >
          <div className="bclc-modal">
            <div className="bclc-modal-head">
              <h2 id="bclc-leave-review-title">
                {reviewAction === 'APPROVED' ? 'Approve Leave Request' : 'Reject Leave Request'}
              </h2>
              <button
                type="button"
                className="bclc-alert-close"
                onClick={() => !reviewBusy && setReviewingLeave(null)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <div className="bclc-delete-target-card" style={{ marginBottom: 14 }}>
              <div>
                <span className="bclc-meta-label">Employee</span>
                <strong>
                  {reviewingLeave.employeeName} ({reviewingLeave.branch})
                </strong>
              </div>
              <div>
                <span className="bclc-meta-label">Leave</span>
                <span>
                  {reviewingLeave.leaveType} — {reviewingLeave.totalDays} day(s)
                </span>
              </div>
              <div>
                <span className="bclc-meta-label">Dates</span>
                <span className="mono">
                  {reviewingLeave.startDate} to {reviewingLeave.endDate}
                </span>
              </div>
              <div>
                <span className="bclc-meta-label">Reason</span>
                <span>{reviewingLeave.reason}</span>
              </div>
            </div>

            <label className="bclc-control-field">
              <span>Manager Remark (Optional)</span>
              <textarea
                rows={2}
                placeholder="Add an optional note for the employee..."
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                className="bclc-control-textarea"
                disabled={reviewBusy}
              />
            </label>

            <div className="bclc-modal-actions">
              <button
                type="button"
                className="bclc-btn-outline"
                onClick={() => setReviewingLeave(null)}
                disabled={reviewBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                className={
                  reviewAction === 'APPROVED' ? 'bclc-btn-approve' : 'bclc-btn-delete-confirm'
                }
                onClick={handleConfirmLeaveReview}
                disabled={reviewBusy}
              >
                {reviewBusy
                  ? 'Saving...'
                  : reviewAction === 'APPROVED'
                  ? 'Confirm Approval'
                  : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Warning Confirmation Modal */}
      {deleteTarget && (
        <div
          className="bclc-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bclc-delete-modal-title"
        >
          <div className="bclc-modal bclc-modal-danger">
            <div className="bclc-modal-head">
              <h2 id="bclc-delete-modal-title" className="text-red">
                Permanently Delete Employee?
              </h2>
              <button
                type="button"
                className="bclc-alert-close"
                onClick={() => !deleteBusy && setDeleteTarget(null)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <div className="bclc-delete-warning-box" role="alert">
              <strong>Warning — Permanent Server Deletion:</strong> Deleting this employee will
              permanently erase their employee profile, user access record, and{' '}
              <strong>all attendance history records</strong> from the server. This action cannot
              be undone.
            </div>

            <div className="bclc-delete-target-card">
              <div>
                <span className="bclc-meta-label">Employee</span>
                <strong>{deleteTarget.employeeName}</strong>
              </div>
              <div>
                <span className="bclc-meta-label">Email</span>
                <span>{deleteTarget.email}</span>
              </div>
              <div>
                <span className="bclc-meta-label">Branch</span>
                <span
                  className={`bclc-branch-tag ${
                    deleteTarget.branch === 'Coimbatore' ? 'is-cbe' : 'is-chn'
                  }`}
                >
                  {deleteTarget.branch}
                </span>
              </div>
            </div>

            {deleteError && (
              <div className="bclc-portal-alert is-error" role="alert" style={{ marginTop: 12 }}>
                <span>{deleteError}</span>
              </div>
            )}

            <label className="bclc-delete-confirm-check">
              <input
                type="checkbox"
                checked={deleteConfirmed}
                onChange={(e) => setDeleteConfirmed(e.target.checked)}
                disabled={deleteBusy}
              />
              <span>
                I understand that all profile and attendance records for{' '}
                <strong>{deleteTarget.employeeName}</strong> will be permanently deleted from the
                server.
              </span>
            </label>

            <div className="bclc-modal-actions">
              <button
                type="button"
                className="bclc-btn-outline"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bclc-btn-delete-confirm"
                onClick={handleConfirmDelete}
                disabled={!deleteConfirmed || deleteBusy}
              >
                {deleteBusy ? 'Deleting Records...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
