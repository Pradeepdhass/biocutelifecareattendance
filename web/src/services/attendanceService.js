import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import { ref, set as rtdbSet, remove as rtdbRemove } from 'firebase/database';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { auth, db, rtdb, getSecondaryAuth } from '../config/firebase';
import { normalizeFirebaseError } from './authService';
import { BRANCHES, LEAVE_TYPES, MANAGER_BRANCH_OPTIONS } from '@shared/constants';
import {
  DEFAULT_ATTENDANCE_SETTINGS,
  normalizeAttendanceSettings,
  validateAttendanceSettings,
  evaluateTimeWindow,
  formatTime12h,
} from '@shared/attendanceRules';
import { validateEmail } from '../utils/validation';

function createError(message, code = 'VALIDATION_ERROR') {
  const err = new Error(message);
  err.code = code;
  err.isCustomAuthError = true;
  return err;
}

/**
 * Waits for Firebase Auth to finish restoring any persisted mobile/WebView session
 * before checking `auth.currentUser`, avoiding false "Please sign in first." errors
 * on cold APK restarts.
 */
async function requireCurrentUser() {
  if (!auth) throw createError('Please sign in first.', 'UNAUTHENTICATED');
  if (auth.currentUser) return auth.currentUser;
  if (typeof auth.authStateReady === 'function') {
    await auth.authStateReady();
  }
  if (!auth.currentUser) {
    throw createError('Please sign in first.', 'UNAUTHENTICATED');
  }
  return auth.currentUser;
}

function getLocalDateIso(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getLocalMonthIso(date = new Date()) {
  return getLocalDateIso(date).slice(0, 7);
}

function timestampToIso(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

function calculateWorkingHours(checkInIso, checkOutIso) {
  if (!checkInIso || !checkOutIso) return 0;
  const start = new Date(checkInIso).getTime();
  const end = new Date(checkOutIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return Math.round(((end - start) / (1000 * 60 * 60)) * 100) / 100;
}

function generateRandomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
  const bytes = new Uint8Array(18);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

function formatEmpCode(uid, existingCode) {
  if (existingCode) return existingCode;
  return `EMP-${String(uid || '').slice(0, 6).toUpperCase()}`;
}

/**
 * Mirrors live check-in/out presence to Firebase Realtime Database (best-effort non-blocking).
 */
async function syncRealtimePresence({ uid, branch, employeeName, status }) {
  try {
    await rtdbSet(ref(rtdb, `presence/${branch}/${uid}`), {
      employeeName,
      branch,
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // Realtime Database sync is optional if RTDB instance isn't provisioned yet
  }
}

/* ==========================================================================
   SHIFT WORKING HOURS & CHECK-IN / CHECK-OUT TIME LIMIT SETTINGS
   ========================================================================== */

export async function getAttendanceSettings() {
  try {
    const snap = await getDoc(doc(db, 'system', 'attendance_settings'));
    if (!snap.exists()) {
      return { ...DEFAULT_ATTENDANCE_SETTINGS };
    }
    return normalizeAttendanceSettings(snap.data());
  } catch (error) {
    // Fallback cleanly to defaults if document hasn't been created yet
    if (error?.code === 'permission-denied') {
      return { ...DEFAULT_ATTENDANCE_SETTINGS };
    }
    throw normalizeFirebaseError(error, 'Failed to load shift & time limit settings.');
  }
}

export async function saveAttendanceSettings(rawSettings) {
  const normalized = normalizeAttendanceSettings(rawSettings);
  const validationError = validateAttendanceSettings(normalized);
  if (validationError) {
    throw createError(validationError);
  }

  try {
    await setDoc(
      doc(db, 'system', 'attendance_settings'),
      {
        ...normalized,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return {
      settings: normalized,
      message: `Saved shift hours (${formatTime12h(normalized.workStart)} – ${formatTime12h(
        normalized.workEnd
      )}), check-in window (${formatTime12h(normalized.checkInStart)} – ${formatTime12h(
        normalized.checkInEnd
      )}), and check-out window (${formatTime12h(normalized.checkOutStart)} – ${formatTime12h(
        normalized.checkOutEnd
      )}).`,
    };
  } catch (error) {
    throw normalizeFirebaseError(
      error,
      'Failed to save time settings. Make sure the latest firestore.rules are published.'
    );
  }
}

/* ==========================================================================
   MANAGER SERVICES (Central Manager — Coimbatore & Chennai)
   ========================================================================== */

export async function getEmployees({ branch = 'ALL' } = {}) {
  try {
    const [empSnap, userSnap] = await Promise.all([
      getDocs(collection(db, 'employees')),
      getDocs(collection(db, 'users')),
    ]);

    const activeByUid = new Map();
    userSnap.forEach((d) => {
      const data = d.data();
      activeByUid.set(d.id, data.is_active !== false);
    });

    let list = empSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.user_id || d.id,
        employeeCode: formatEmpCode(d.id, data.employee_code),
        employeeName: data.employee_name,
        email: data.email,
        branch: data.branch,
        isActive: activeByUid.get(d.id) ?? true,
      };
    });

    if (branch && branch !== 'ALL') {
      list = list.filter((e) => e.branch === branch);
    }

    list.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
    return list;
  } catch (error) {
    throw normalizeFirebaseError(error, 'Failed to load employees from Firestore.');
  }
}

export async function getManagerDashboard({ branch = 'ALL', date = '' } = {}) {
  try {
    const targetDate = date || getLocalDateIso();
    const [allEmployees, attSnap, approvedLeavesSnap] = await Promise.all([
      getEmployees({ branch: 'ALL' }),
      getDocs(
        query(collection(db, 'attendance'), where('attendance_date', '==', targetDate))
      ),
      getDocs(query(collection(db, 'leaves'), where('status', '==', 'APPROVED'))).catch(
        () => ({ docs: [] })
      ),
    ]);

    const onLeaveEmpIds = new Set();
    (approvedLeavesSnap.docs || []).forEach((d) => {
      const lv = d.data();
      if (lv.start_date <= targetDate && targetDate <= lv.end_date) {
        onLeaveEmpIds.add(lv.employee_id);
      }
    });

    const attByEmp = new Map();
    attSnap.forEach((d) => {
      const row = d.data();
      attByEmp.set(row.employee_id, { docId: d.id, ...row });
    });

    const activeEmployees = allEmployees.filter((e) => e.isActive);

    const dailyRecords = activeEmployees.map((emp) => {
      const att = attByEmp.get(emp.id);
      const fallbackStatus = onLeaveEmpIds.has(emp.id) ? 'ON_LEAVE' : 'ABSENT';
      return {
        id: att?.docId || `${fallbackStatus.toLowerCase()}_${emp.id}_${targetDate}`,
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        employeeName: emp.employeeName,
        employeeEmail: emp.email,
        branch: att?.branch || emp.branch,
        attendanceDate: att?.attendance_date || targetDate,
        checkIn: timestampToIso(att?.check_in),
        checkOut: timestampToIso(att?.check_out),
        workingHours: Number(att?.working_hours) || 0,
        status: att?.status || fallbackStatus,
      };
    });

    const summarize = (rows) => {
      const currentlyCheckedIn = rows.filter((r) => r.status === 'CHECKED_IN').length;
      const presentToday = rows.filter(
        (r) => r.status === 'PRESENT' || r.status === 'CHECKED_IN'
      ).length;
      const absentToday = rows.filter(
        (r) => r.status === 'ABSENT' || r.status === 'ON_LEAVE'
      ).length;
      return {
        totalEmployees: rows.length,
        presentToday,
        absentToday,
        currentlyCheckedIn,
      };
    };

    const overall = summarize(dailyRecords);
    const cbeSummary = summarize(dailyRecords.filter((r) => r.branch === 'Coimbatore'));
    const chnSummary = summarize(dailyRecords.filter((r) => r.branch === 'Chennai'));

    const filteredRecords =
      branch === 'ALL'
        ? dailyRecords
        : dailyRecords.filter((r) => r.branch === branch);

    return {
      date: targetDate,
      branchFilter: branch,
      stats: {
        totalEmployees: overall.totalEmployees,
        coimbatoreEmployees: cbeSummary.totalEmployees,
        chennaiEmployees: chnSummary.totalEmployees,
        presentToday: overall.presentToday,
        absentToday: overall.absentToday,
        currentlyCheckedIn: overall.currentlyCheckedIn,
      },
      branchSummaries: [
        { branch: 'Coimbatore', ...cbeSummary },
        { branch: 'Chennai', ...chnSummary },
      ],
      attendanceRecords: filteredRecords,
    };
  } catch (error) {
    throw normalizeFirebaseError(error, 'Failed to load Manager dashboard from Firestore.');
  }
}

/**
 * Sends Firebase password-setup / activation email.
 * Never attaches localhost continueUrl when running inside Capacitor Android or local dev.
 */
async function triggerFirebaseInviteEmail(authInstance, email) {
  const isBrowser = typeof window !== 'undefined';
  const hostname = isBrowser ? window.location.hostname : '';
  const isPublicWebOrigin =
    isBrowser &&
    window.location.protocol === 'https:' &&
    hostname &&
    !/^(localhost|127\.0\.0\.1)$/i.test(hostname);

  try {
    if (isPublicWebOrigin) {
      await sendPasswordResetEmail(authInstance, email, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      });
    } else {
      await sendPasswordResetEmail(authInstance, email);
    }
    return { sent: true, warning: '' };
  } catch (err) {
    if (err?.code === 'auth/unauthorized-continue-uri' || err?.code === 'auth/invalid-continue-uri') {
      await sendPasswordResetEmail(authInstance, email);
      return { sent: true, warning: '' };
    }
    throw err;
  }
}

/**
 * Adds a new Employee using ONLY the 3 required profile fields:
 * employeeName, email, branch ('Coimbatore' | 'Chennai').
 * Creates their Firebase Auth account via secondary Auth app (Manager stays signed in!)
 * and sends a real Firebase activation / password-setup email.
 */
export async function createEmployee({ employeeName, email, branch, password }) {
  const cleanedName = String(employeeName || '').trim();
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (cleanedName.length < 2) {
    throw createError('Employee Name must be at least 2 characters.');
  }
  const emailErr = validateEmail(normalizedEmail);
  if (emailErr) throw createError(emailErr);
  if (!BRANCHES.includes(branch)) {
    throw createError('Branch must be either Coimbatore or Chennai.');
  }
  if (password && password.length < 6) {
    throw createError('Initial password must be at least 6 characters.');
  }

  try {
    // Enforce unique email across both branches in Firestore
    const [existingEmp, existingUser] = await Promise.all([
      getDocs(query(collection(db, 'employees'), where('email', '==', normalizedEmail))),
      getDocs(query(collection(db, 'users'), where('email', '==', normalizedEmail))),
    ]);

    if (!existingEmp.empty || !existingUser.empty) {
      throw createError(
        'An employee with this email address already exists across the branches.',
        'EMAIL_EXISTS'
      );
    }

    // Create Firebase Auth account on secondary app so the Manager stays logged in
    const secondaryAuth = getSecondaryAuth();
    const initialSecret = password || generateRandomPassword();
    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      normalizedEmail,
      initialSecret
    );
    const uid = credential.user.uid;
    await signOut(secondaryAuth).catch(() => {});

    const employeeCode = `EMP-${uid.slice(0, 6).toUpperCase()}`;

    // Store in Firestore Core Collection 1: users
    await setDoc(doc(db, 'users', uid), {
      id: uid,
      email: normalizedEmail,
      role: 'EMPLOYEE',
      is_active: true,
    });

    // Store in Firestore Core Collection 2: employees (strictly Name, Email, Branch)
    await setDoc(doc(db, 'employees', uid), {
      id: uid,
      user_id: uid,
      employee_code: employeeCode,
      employee_name: cleanedName,
      email: normalizedEmail,
      branch,
    });

    // Send real Firebase activation / set-password email (using primary auth)
    let emailNotice = `Firebase activation email sent to ${normalizedEmail} (check Inbox or Spam/Junk from noreply@biocutelifecareadmin-139ad.firebaseapp.com).`;
    try {
      await triggerFirebaseInviteEmail(auth, normalizedEmail);
    } catch (mailErr) {
      emailNotice = `Employee created, but Firebase email could not be sent (${mailErr?.code || mailErr?.message}).`;
    }

    return {
      message: `${cleanedName} (${branch}) added. ${emailNotice}`,
      employee: {
        id: uid,
        userId: uid,
        employeeCode,
        employeeName: cleanedName,
        email: normalizedEmail,
        branch,
        isActive: true,
      },
      invitation: {
        deliveredVia: 'firebase-email',
        email: normalizedEmail,
        employeeName: cleanedName,
        branch,
        initialPassword: password ? '(as entered by Manager)' : '',
      },
    };
  } catch (error) {
    throw normalizeFirebaseError(error, 'Failed to create employee account.');
  }
}

export async function updateEmployee(id, { employeeName, email, branch }) {
  const cleanedName = String(employeeName || '').trim();
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (cleanedName.length < 2) {
    throw createError('Employee Name must be at least 2 characters.');
  }
  const emailErr = validateEmail(normalizedEmail);
  if (emailErr) throw createError(emailErr);
  if (!BRANCHES.includes(branch)) {
    throw createError('Branch must be either Coimbatore or Chennai.');
  }

  try {
    const conflictSnap = await getDocs(
      query(collection(db, 'employees'), where('email', '==', normalizedEmail))
    );
    const hasOther = conflictSnap.docs.some((d) => d.id !== id);
    if (hasOther) {
      throw createError('Another employee is already using this email address.');
    }

    await Promise.all([
      updateDoc(doc(db, 'employees', id), {
        employee_name: cleanedName,
        email: normalizedEmail,
        branch,
      }),
      updateDoc(doc(db, 'users', id), {
        email: normalizedEmail,
      }),
    ]);

    return {
      message: `Updated ${cleanedName}'s details successfully.`,
    };
  } catch (error) {
    throw normalizeFirebaseError(error, 'Failed to update employee.');
  }
}

export async function toggleEmployeeStatus(id, isActive) {
  try {
    await updateDoc(doc(db, 'users', id), { is_active: Boolean(isActive) });
    return {
      message: isActive
        ? 'Employee account activated successfully.'
        : 'Employee account deactivated successfully.',
    };
  } catch (error) {
    throw normalizeFirebaseError(error, 'Failed to update employee account status.');
  }
}

export async function resendEmployeeInvite(id) {
  try {
    const empSnap = await getDoc(doc(db, 'employees', id));
    if (!empSnap.exists()) {
      throw createError('Employee not found.');
    }
    const emp = empSnap.data();
    await triggerFirebaseInviteEmail(auth, emp.email);
    return {
      message: `Firebase password-setup email sent to ${emp.email}. Please check Inbox and Spam/Junk folder (sender: noreply@biocutelifecareadmin-139ad.firebaseapp.com).`,
      invitation: {
        deliveredVia: 'firebase-email',
        email: emp.email,
        employeeName: emp.employee_name,
        branch: emp.branch,
      },
    };
  } catch (error) {
    throw normalizeFirebaseError(error, 'Failed to send Firebase activation email.');
  }
}

/**
 * Permanently deletes an employee's profile, user record, Realtime Database presence,
 * and ALL associated attendance records from Cloud Firestore.
 */
export async function deleteEmployee(employee) {
  if (!employee?.id) {
    throw createError('Invalid employee selected for deletion.');
  }

  try {
    // 1. Delete all attendance & leave records for this employee in Firestore (batched up to 450/batch)
    const [attSnap, leaveSnap] = await Promise.all([
      getDocs(query(collection(db, 'attendance'), where('employee_id', '==', employee.id))),
      getDocs(query(collection(db, 'leaves'), where('employee_id', '==', employee.id))).catch(
        () => ({ docs: [] })
      ),
    ]);

    const allChildDocs = [...attSnap.docs, ...(leaveSnap.docs || [])];
    const deletedAttendanceCount = attSnap.docs.length;
    const CHUNK_SIZE = 450;

    for (let i = 0; i < allChildDocs.length; i += CHUNK_SIZE) {
      const batch = writeBatch(db);
      allChildDocs.slice(i, i + CHUNK_SIZE).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    // 2. Delete employee profile and user role document from Firestore
    await Promise.all([
      deleteDoc(doc(db, 'employees', employee.id)),
      deleteDoc(doc(db, 'users', employee.id)),
    ]);

    // 3. Clean up live presence node in Realtime Database (best-effort)
    try {
      if (employee.branch) {
        await rtdbRemove(ref(rtdb, `presence/${employee.branch}/${employee.id}`));
      }
    } catch {
      // Optional RTDB cleanup
    }

    return {
      deletedAttendanceCount,
      message: `Permanently deleted ${employee.employeeName} (${employee.email}) and ${deletedAttendanceCount} attendance record(s) from the server.`,
    };
  } catch (error) {
    throw normalizeFirebaseError(
      error,
      'Failed to delete employee. Make sure the latest firestore.rules are published in Firebase Console.'
    );
  }
}

/* ==========================================================================
   MANAGER REPORTS & EXPORTS (All 6 Report Types + Excel, PDF & CSV)
   ========================================================================== */

export async function getReportData({
  type = 'all',
  branch = 'ALL',
  date = '',
  month = '',
  employeeId = '',
} = {}) {
  try {
    if (type === 'daily') {
      const targetDate = date || getLocalDateIso();
      const dash = await getManagerDashboard({ branch, date: targetDate });
      const totalWorkingHours = dash.attendanceRecords.reduce(
        (sum, r) => sum + (Number(r.workingHours) || 0),
        0
      );
      return {
        title: 'Daily Attendance Report',
        subtitle: `Date: ${targetDate} | Branch: ${branch === 'ALL' ? 'All Branches' : branch}`,
        filenameBase: `daily_attendance_${targetDate}_${branch.toLowerCase()}`,
        totalRecords: dash.attendanceRecords.length,
        totalWorkingHours: Math.round(totalWorkingHours * 100) / 100,
        records: dash.attendanceRecords,
      };
    }

    const [allEmployees, attSnap] = await Promise.all([
      getEmployees({ branch: 'ALL' }),
      getDocs(collection(db, 'attendance')),
    ]);

    const empMap = new Map(allEmployees.map((e) => [e.id, e]));
    let records = attSnap.docs.map((d) => {
      const row = d.data();
      const emp = empMap.get(row.employee_id);
      return {
        id: d.id,
        employeeId: row.employee_id,
        employeeCode: emp?.employeeCode || formatEmpCode(row.employee_id),
        employeeName: row.employee_name || emp?.employeeName || 'Employee',
        employeeEmail: row.employee_email || emp?.email || '—',
        branch: row.branch,
        attendanceDate: row.attendance_date,
        checkIn: timestampToIso(row.check_in),
        checkOut: timestampToIso(row.check_out),
        workingHours: Number(row.working_hours) || 0,
        status: row.status,
      };
    });

    let title = 'All Branches Attendance Report';
    let subtitle = 'Branches: Coimbatore & Chennai';
    let filenameBase = 'all_branches_attendance_report';

    if (type === 'coimbatore') {
      records = records.filter((r) => r.branch === 'Coimbatore');
      title = 'Coimbatore Attendance Report';
      subtitle = 'Branch: Coimbatore';
      filenameBase = 'coimbatore_attendance_report';
    } else if (type === 'chennai') {
      records = records.filter((r) => r.branch === 'Chennai');
      title = 'Chennai Attendance Report';
      subtitle = 'Branch: Chennai';
      filenameBase = 'chennai_attendance_report';
    } else if (type === 'employee') {
      const emp = empMap.get(employeeId);
      records = records.filter((r) => r.employeeId === employeeId);
      title = 'Employee-wise Attendance Report';
      subtitle = emp ? `${emp.employeeName} (${emp.email}) — ${emp.branch}` : 'Selected Employee';
      filenameBase = `employee_${emp?.employeeCode || employeeId}_attendance_report`;
    } else if (type === 'monthly') {
      const targetMonth = month || getLocalMonthIso();
      records = records.filter((r) => String(r.attendanceDate || '').startsWith(targetMonth));
      if (branch && branch !== 'ALL') {
        records = records.filter((r) => r.branch === branch);
      }
      title = 'Monthly Attendance Report';
      subtitle = `Month: ${targetMonth} | Branch: ${branch === 'ALL' ? 'All Branches' : branch}`;
      filenameBase = `monthly_attendance_${targetMonth}`;
    }

    records.sort((a, b) =>
      `${b.attendanceDate}_${a.branch}_${a.employeeName}`.localeCompare(
        `${a.attendanceDate}_${b.branch}_${b.employeeName}`
      )
    );

    const totalWorkingHours = records.reduce(
      (sum, r) => sum + (Number(r.workingHours) || 0),
      0
    );

    return {
      title,
      subtitle,
      filenameBase,
      totalRecords: records.length,
      totalWorkingHours: Math.round(totalWorkingHours * 100) / 100,
      records,
    };
  } catch (error) {
    throw normalizeFirebaseError(error, 'Failed to generate attendance report.');
  }
}

function formatTimeCell(iso) {
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

function formatStatusCell(status) {
  if (status === 'CHECKED_IN') return 'Checked In';
  if (status === 'PRESENT') return 'Present';
  if (status === 'ABSENT') return 'Absent';
  return status || '—';
}

export async function downloadReportExport({ format, ...params }) {
  const report = await getReportData(params);
  const headers = [
    'Employee ID',
    'Employee Name',
    'Employee Email',
    'Branch',
    'Attendance Date',
    'Check-in Time',
    'Check-out Time',
    'Total Working Hours',
    'Attendance Status',
  ];

  const rows = report.records.map((r) => [
    r.employeeCode || formatEmpCode(r.employeeId),
    r.employeeName,
    r.employeeEmail,
    r.branch,
    r.attendanceDate,
    formatTimeCell(r.checkIn),
    formatTimeCell(r.checkOut),
    `${(Number(r.workingHours) || 0).toFixed(2)} hrs`,
    formatStatusCell(r.status),
  ]);

  const filename = `${report.filenameBase}.${format}`;

  if (format === 'csv') {
    const escape = (v) => {
      const s = String(v ?? '');
      return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      escape(`Bio Cute Life Care - ${report.title}`),
      escape(report.subtitle),
      '',
      headers.map(escape).join(','),
      ...rows.map((row) => row.map(escape).join(',')),
    ];
    const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], {
      type: 'text/csv;charset=utf-8;',
    });
    await saveOrShareReportBlob(blob, filename, 'text/csv');
    return filename;
  }

  if (format === 'xlsx') {
    const sheetRows = [
      [`Bio Cute Life Care — ${report.title}`],
      [`${report.subtitle} | Total Records: ${report.totalRecords} | Total Hours: ${report.totalWorkingHours.toFixed(2)} hrs`],
      [],
      headers,
      ...rows,
    ];
    const ws = XLSX.utils.aoa_to_sheet(sheetRows);
    ws['!cols'] = [
      { wch: 14 },
      { wch: 24 },
      { wch: 28 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 16 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');
    const xlsxOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const blob = new Blob([xlsxOut], { type: mime });
    await saveOrShareReportBlob(blob, filename, mime);
    return filename;
  }

  // PDF export via jsPDF + autoTable
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();

  pdf.setFillColor(8, 45, 82);
  pdf.rect(28, 24, pageWidth - 56, 48, 'F');
  pdf.setFillColor(214, 0, 42);
  pdf.rect(28, 72, pageWidth - 56, 3, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);
  pdf.text(`Bio Cute Life Care — ${report.title}`, 40, 46);
  pdf.setFontSize(9.5);
  pdf.setTextColor(203, 228, 250);
  pdf.text(
    `${report.subtitle}  |  Records: ${report.totalRecords}  |  Total Hours: ${report.totalWorkingHours.toFixed(2)} hrs`,
    40,
    63
  );

  autoTable(pdf, {
    startY: 88,
    margin: { left: 28, right: 28 },
    head: [headers],
    body: rows.length > 0 ? rows : [['—', 'No attendance records found', '', '', '', '', '', '', '']],
    headStyles: { fillColor: [22, 134, 217], textColor: [255, 255, 255], fontSize: 8.5 },
    bodyStyles: { textColor: [8, 45, 82], fontSize: 8.2 },
    alternateRowStyles: { fillColor: [244, 249, 254] },
  });

  const pdfBlob = pdf.output('blob');
  await saveOrShareReportBlob(pdfBlob, filename, 'application/pdf');
  return filename;
}

async function saveOrShareReportBlob(blob, filename, mimeType) {
  // On Android Capacitor WebView, Web Share API allows saving/sharing Excel, PDF & CSV natively
  try {
    const file = new File([blob], filename, { type: mimeType });
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] }) &&
      /Android/i.test(navigator.userAgent || '')
    ) {
      await navigator.share({
        title: filename,
        files: [file],
      });
      return;
    }
  } catch (shareErr) {
    if (shareErr?.name === 'AbortError') return;
    // Fallback to browser download below
  }

  triggerBrowserDownload(blob, filename);
}

function triggerBrowserDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/* ==========================================================================
   EMPLOYEE SELF-SERVICE (Own Profile & Own Attendance Only)
   ========================================================================== */

export async function getEmployeeDashboard() {
  const currentUser = await requireCurrentUser();

  try {
    const [empSnap, settings] = await Promise.all([
      getDoc(doc(db, 'employees', currentUser.uid)),
      getAttendanceSettings(),
    ]);
    if (!empSnap.exists()) {
      throw createError('Employee profile not found.');
    }

    const empData = empSnap.data();
    const employee = {
      id: currentUser.uid,
      employeeCode: formatEmpCode(currentUser.uid, empData.employee_code),
      employeeName: empData.employee_name,
      email: empData.email,
      branch: empData.branch,
    };

    const todayDate = getLocalDateIso();
    const attSnap = await getDocs(
      query(collection(db, 'attendance'), where('employee_id', '==', currentUser.uid))
    );

    const history = attSnap.docs
      .map((d) => {
        const row = d.data();
        return {
          id: d.id,
          employeeId: currentUser.uid,
          employeeCode: employee.employeeCode,
          employeeName: employee.employeeName,
          employeeEmail: employee.email,
          branch: row.branch,
          attendanceDate: row.attendance_date,
          checkIn: timestampToIso(row.check_in),
          checkOut: timestampToIso(row.check_out),
          workingHours: Number(row.working_hours) || 0,
          status: row.status,
        };
      })
      .sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate));

    const todayAttendance =
      history.find((h) => h.attendanceDate === todayDate) || null;

    return {
      employee,
      settings,
      todayAttendance,
      history,
    };
  } catch (error) {
    throw normalizeFirebaseError(error, 'Failed to load your attendance dashboard.');
  }
}

export async function employeeCheckIn() {
  const currentUser = await requireCurrentUser();

  try {
    const [empSnap, settings] = await Promise.all([
      getDoc(doc(db, 'employees', currentUser.uid)),
      getAttendanceSettings(),
    ]);
    if (!empSnap.exists()) throw createError('Employee profile not found.');

    const emp = empSnap.data();
    if (!BRANCHES.includes(emp.branch)) {
      throw createError('Invalid assigned branch on employee profile.');
    }

    // Enforce Admin-configured Check-in Time Limit
    if (settings.enforceLimits) {
      const check = evaluateTimeWindow(
        new Date(),
        settings.checkInStart,
        settings.checkInEnd,
        'Check-in'
      );
      if (!check.allowed) {
        throw createError(check.reason, 'OUTSIDE_CHECKIN_WINDOW');
      }
    }

    const todayDate = getLocalDateIso();
    const recordId = `${currentUser.uid}_${todayDate}`;
    const recordRef = doc(db, 'attendance', recordId);

    const existing = await getDoc(recordRef);
    if (existing.exists()) {
      throw createError('You have already checked in today. Duplicate check-in is not allowed.');
    }

    await setDoc(recordRef, {
      id: recordId,
      employee_id: currentUser.uid,
      employee_name: emp.employee_name,
      employee_email: emp.email,
      branch: emp.branch,
      attendance_date: todayDate,
      check_in: serverTimestamp(),
      check_out: null,
      working_hours: 0,
      status: 'CHECKED_IN',
    });

    await syncRealtimePresence({
      uid: currentUser.uid,
      branch: emp.branch,
      employeeName: emp.employee_name,
      status: 'CHECKED_IN',
    });

    return {
      message: `Checked in successfully at ${emp.branch} branch.`,
    };
  } catch (error) {
    throw normalizeFirebaseError(error, 'Unable to record check-in.');
  }
}

export async function employeeCheckOut() {
  const currentUser = await requireCurrentUser();

  try {
    const todayDate = getLocalDateIso();
    const recordId = `${currentUser.uid}_${todayDate}`;
    const recordRef = doc(db, 'attendance', recordId);

    const [snap, settings] = await Promise.all([
      getDoc(recordRef),
      getAttendanceSettings(),
    ]);
    if (!snap.exists() || !snap.data().check_in) {
      throw createError('You must check in before checking out.');
    }

    const row = snap.data();
    if (row.check_out) {
      throw createError('You have already checked out today. Duplicate check-out is not allowed.');
    }

    // Enforce Admin-configured Check-out Time Limit
    if (settings.enforceLimits) {
      const check = evaluateTimeWindow(
        new Date(),
        settings.checkOutStart,
        settings.checkOutEnd,
        'Check-out'
      );
      if (!check.allowed) {
        throw createError(check.reason, 'OUTSIDE_CHECKOUT_WINDOW');
      }
    }

    const checkInIso = timestampToIso(row.check_in);
    const workingHours = calculateWorkingHours(checkInIso, new Date().toISOString());

    await updateDoc(recordRef, {
      check_out: serverTimestamp(),
      working_hours: workingHours,
      status: 'PRESENT',
    });

    await syncRealtimePresence({
      uid: currentUser.uid,
      branch: row.branch,
      employeeName: row.employee_name,
      status: 'PRESENT',
    });

    return {
      message: 'Checked out successfully.',
    };
  } catch (error) {
    throw normalizeFirebaseError(error, 'Unable to record check-out.');
  }
}

/* ==========================================================================
   LEAVE MANAGEMENT SERVICES (Employee Apply/Cancel & Manager Approve/Reject)
   ========================================================================== */

function computeInclusiveDays(startDate, endDate) {
  const s = new Date(`${startDate}T00:00:00`);
  const e = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return 0;
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function mapLeaveDoc(d) {
  const row = d.data();
  return {
    id: d.id,
    employeeId: row.employee_id,
    employeeCode: row.employee_code || formatEmpCode(row.employee_id),
    employeeName: row.employee_name,
    employeeEmail: row.employee_email,
    branch: row.branch,
    leaveType: row.leave_type,
    startDate: row.start_date,
    endDate: row.end_date,
    totalDays: Number(row.total_days) || 1,
    reason: row.reason || '',
    status: row.status || 'PENDING',
    managerNote: row.manager_note || '',
    createdAt: timestampToIso(row.created_at),
    reviewedAt: timestampToIso(row.reviewed_at),
  };
}

/**
 * Employee submits a new leave request (branch is strictly taken from registered profile).
 */
export async function applyLeave({ leaveType, startDate, endDate, reason }) {
  const currentUser = await requireCurrentUser();

  if (!LEAVE_TYPES.includes(leaveType)) {
    throw createError('Please select a valid leave type.');
  }
  if (!startDate || !endDate) {
    throw createError('Start date and end date are required.');
  }
  const totalDays = computeInclusiveDays(startDate, endDate);
  if (totalDays <= 0) {
    throw createError('End date cannot be earlier than start date.');
  }
  const trimmedReason = String(reason || '').trim();
  if (trimmedReason.length < 3) {
    throw createError('Please enter a brief reason for your leave request.');
  }

  try {
    const empSnap = await getDoc(doc(db, 'employees', currentUser.uid));
    if (!empSnap.exists()) throw createError('Employee profile not found.');

    const emp = empSnap.data();
    if (!BRANCHES.includes(emp.branch)) {
      throw createError('Invalid assigned branch on employee profile.');
    }

    // Prevent overlapping pending/approved leave dates for the same employee
    const existingSnap = await getDocs(
      query(collection(db, 'leaves'), where('employee_id', '==', currentUser.uid))
    );
    const hasOverlap = existingSnap.docs.some((d) => {
      const lv = d.data();
      if (lv.status === 'REJECTED') return false;
      return lv.start_date <= endDate && startDate <= lv.end_date;
    });
    if (hasOverlap) {
      throw createError(
        'You already have a pending or approved leave request covering these dates.'
      );
    }

    const docRef = await addDoc(collection(db, 'leaves'), {
      employee_id: currentUser.uid,
      employee_code: formatEmpCode(currentUser.uid, emp.employee_code),
      employee_name: emp.employee_name,
      employee_email: emp.email,
      branch: emp.branch,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      total_days: totalDays,
      reason: trimmedReason,
      status: 'PENDING',
      manager_note: '',
      created_at: serverTimestamp(),
      reviewed_at: null,
    });

    return {
      id: docRef.id,
      message: `Leave request submitted for ${totalDays} day(s) (${startDate} to ${endDate}).`,
    };
  } catch (error) {
    throw normalizeFirebaseError(
      error,
      'Failed to submit leave request. Make sure the latest firestore.rules are published.'
    );
  }
}

/**
 * Employee fetches ONLY their own leave requests.
 */
export async function getMyLeaveRequests() {
  const currentUser = await requireCurrentUser();

  try {
    const snap = await getDocs(
      query(collection(db, 'leaves'), where('employee_id', '==', currentUser.uid))
    );
    return snap.docs
      .map(mapLeaveDoc)
      .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
  } catch (error) {
    throw normalizeFirebaseError(error, 'Failed to load your leave requests.');
  }
}

/**
 * Employee cancels their own PENDING leave request.
 */
export async function cancelLeaveRequest(leaveId) {
  try {
    await deleteDoc(doc(db, 'leaves', leaveId));
    return { message: 'Pending leave request cancelled.' };
  } catch (error) {
    throw normalizeFirebaseError(error, 'Unable to cancel leave request.');
  }
}

/**
 * Central Manager fetches all leave requests across Coimbatore & Chennai.
 */
export async function getAllLeaveRequests({ branch = 'ALL', status = 'ALL' } = {}) {
  try {
    const snap = await getDocs(collection(db, 'leaves'));
    let list = snap.docs.map(mapLeaveDoc);

    if (branch && branch !== 'ALL') {
      list = list.filter((l) => l.branch === branch);
    }
    if (status && status !== 'ALL') {
      list = list.filter((l) => l.status === status);
    }

    list.sort((a, b) => {
      if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
      if (b.status === 'PENDING' && a.status !== 'PENDING') return 1;
      return (b.startDate || '').localeCompare(a.startDate || '');
    });

    return list;
  } catch (error) {
    throw normalizeFirebaseError(error, 'Failed to load leave requests.');
  }
}

/**
 * Central Manager approves or rejects an employee's leave request.
 */
export async function reviewLeaveRequest(leaveId, { status, managerNote = '' }) {
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    throw createError('Review status must be APPROVED or REJECTED.');
  }

  try {
    await updateDoc(doc(db, 'leaves', leaveId), {
      status,
      manager_note: String(managerNote || '').trim(),
      reviewed_at: serverTimestamp(),
    });

    return {
      message:
        status === 'APPROVED'
          ? 'Leave request approved successfully.'
          : 'Leave request rejected.',
    };
  } catch (error) {
    throw normalizeFirebaseError(error, 'Unable to update leave request.');
  }
}

/* ==========================================================================
   ADMIN-ONLY MANAGER ACCOUNT MANAGEMENT (Coimbatore, Chennai, All Branches)
   ========================================================================== */

function formatManagerCode(uid, existingCode) {
  if (existingCode) return existingCode;
  return `MGR-${String(uid || '').slice(0, 6).toUpperCase()}`;
}

export async function getManagers() {
  try {
    const [mgrSnap, userSnap] = await Promise.all([
      getDocs(collection(db, 'managers')),
      getDocs(collection(db, 'users')),
    ]);

    const activeByUid = new Map();
    userSnap.forEach((d) => {
      activeByUid.set(d.id, d.data().is_active !== false);
    });

    return mgrSnap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: data.user_id || d.id,
          managerCode: formatManagerCode(d.id, data.manager_code),
          managerName: data.manager_name,
          email: data.email,
          branch: data.branch || 'All Branches',
          isActive: activeByUid.get(d.id) ?? true,
        };
      })
      .sort((a, b) => a.managerName.localeCompare(b.managerName));
  } catch (error) {
    throw normalizeFirebaseError(error, 'Failed to load Manager accounts.');
  }
}

export async function createManagerAccount({ managerName, email, branch, password }) {
  const cleanedName = String(managerName || '').trim();
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (cleanedName.length < 2) {
    throw createError('Manager Name must be at least 2 characters.');
  }
  const emailErr = validateEmail(normalizedEmail);
  if (emailErr) throw createError(emailErr);
  if (!MANAGER_BRANCH_OPTIONS.includes(branch)) {
    throw createError('Manager branch must be All Branches, Coimbatore, or Chennai.');
  }
  if (password && password.length < 6) {
    throw createError('Initial password must be at least 6 characters.');
  }

  try {
    const existingUsers = await getDocs(
      query(collection(db, 'users'), where('email', '==', normalizedEmail))
    );
    if (!existingUsers.empty) {
      throw createError('An account with this email address already exists.');
    }

    const secondaryAuth = getSecondaryAuth();
    const initialSecret = password || generateRandomPassword();
    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      normalizedEmail,
      initialSecret
    );
    const uid = credential.user.uid;
    await signOut(secondaryAuth).catch(() => {});

    const managerCode = formatManagerCode(uid);

    await setDoc(doc(db, 'users', uid), {
      id: uid,
      email: normalizedEmail,
      role: 'MANAGER',
      is_active: true,
    });

    await setDoc(doc(db, 'managers', uid), {
      id: uid,
      user_id: uid,
      manager_code: managerCode,
      manager_name: cleanedName,
      email: normalizedEmail,
      branch,
    });

    let emailNote = `Invite email sent to ${normalizedEmail}.`;
    try {
      await triggerFirebaseInviteEmail(auth, normalizedEmail);
    } catch (mailErr) {
      emailNote = `Manager created, email notice: ${mailErr?.code || mailErr?.message}.`;
    }

    return {
      message: `Manager ${cleanedName} (${branch}) created. ${emailNote}`,
      manager: {
        id: uid,
        userId: uid,
        managerCode,
        managerName: cleanedName,
        email: normalizedEmail,
        branch,
        isActive: true,
      },
    };
  } catch (error) {
    throw normalizeFirebaseError(error, 'Failed to create Manager account.');
  }
}

export async function updateManagerAccount(id, { managerName, email, branch }) {
  const cleanedName = String(managerName || '').trim();
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (cleanedName.length < 2) {
    throw createError('Manager Name must be at least 2 characters.');
  }
  const emailErr = validateEmail(normalizedEmail);
  if (emailErr) throw createError(emailErr);
  if (!MANAGER_BRANCH_OPTIONS.includes(branch)) {
    throw createError('Manager branch must be All Branches, Coimbatore, or Chennai.');
  }

  try {
    await Promise.all([
      updateDoc(doc(db, 'managers', id), {
        manager_name: cleanedName,
        email: normalizedEmail,
        branch,
      }),
      updateDoc(doc(db, 'users', id), {
        email: normalizedEmail,
      }),
    ]);

    return { message: `Updated Manager ${cleanedName} successfully.` };
  } catch (error) {
    throw normalizeFirebaseError(error, 'Failed to update Manager account.');
  }
}

export async function toggleManagerStatus(id, isActive) {
  try {
    await updateDoc(doc(db, 'users', id), { is_active: Boolean(isActive) });
    return {
      message: isActive
        ? 'Manager account activated successfully.'
        : 'Manager account deactivated successfully.',
    };
  } catch (error) {
    throw normalizeFirebaseError(error, 'Failed to update Manager account status.');
  }
}

export async function resendManagerInvite(id) {
  try {
    const snap = await getDoc(doc(db, 'managers', id));
    if (!snap.exists()) throw createError('Manager not found.');
    const email = snap.data().email;
    await triggerFirebaseInviteEmail(auth, email);
    return {
      message: `Password-setup email sent to ${email} (check Inbox & Spam/Junk).`,
    };
  } catch (error) {
    throw normalizeFirebaseError(error, 'Failed to send Manager invite email.');
  }
}

export async function deleteManagerAccount(manager) {
  if (!manager?.id) throw createError('Invalid Manager selected.');
  try {
    await Promise.all([
      deleteDoc(doc(db, 'managers', manager.id)),
      deleteDoc(doc(db, 'users', manager.id)),
    ]);
    return {
      message: `Permanently deleted Manager ${manager.managerName} (${manager.email}) from the server.`,
    };
  } catch (error) {
    throw normalizeFirebaseError(error, 'Failed to delete Manager account.');
  }
}
