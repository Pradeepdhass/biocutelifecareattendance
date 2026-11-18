import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, set as rtdbSet } from 'firebase/database';
import { auth, db, rtdb } from '../config/firebase';
import { normalizeFirebaseError } from './authService';

const VALID_BRANCHES = ['Coimbatore', 'Chennai'];

export const DEFAULT_ATTENDANCE_SETTINGS = {
  workStart: '09:00',
  workEnd: '18:30',
  checkInStart: '09:00',
  checkInEnd: '09:30',
  checkOutStart: '18:30',
  checkOutEnd: '19:30',
  enforceLimits: true,
};

function timeToMinutes(hhmm) {
  const m = String(hhmm || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
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

export function evaluateTimeWindow(now, startHHMM, endHHMM, label) {
  const startMin = timeToMinutes(startHHMM);
  const endMin = timeToMinutes(endHHMM);
  if (startMin === null || endMin === null) return { allowed: true, reason: '' };
  const currentMin = now.getHours() * 60 + now.getMinutes();
  if (currentMin < startMin) {
    return {
      allowed: false,
      reason: `${label} opens at ${formatTime12h(startHHMM)} (${formatTime12h(startHHMM)} – ${formatTime12h(endHHMM)}).`,
    };
  }
  if (currentMin > endMin) {
    return {
      allowed: false,
      reason: `${label} closed at ${formatTime12h(endHHMM)} (${formatTime12h(startHHMM)} – ${formatTime12h(endHHMM)}).`,
    };
  }
  return { allowed: true, reason: '' };
}

export async function getAttendanceSettings() {
  try {
    const snap = await getDoc(doc(db, 'system', 'attendance_settings'));
    if (!snap.exists()) return { ...DEFAULT_ATTENDANCE_SETTINGS };
    const raw = snap.data();
    return {
      ...DEFAULT_ATTENDANCE_SETTINGS,
      ...raw,
    };
  } catch {
    return { ...DEFAULT_ATTENDANCE_SETTINGS };
  }
}

function getLocalDateIso(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function timestampToIso(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function calculateWorkingHours(checkInIso, checkOutIso) {
  if (!checkInIso || !checkOutIso) return 0;
  const start = new Date(checkInIso).getTime();
  const end = new Date(checkOutIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return Math.round(((end - start) / (1000 * 60 * 60)) * 100) / 100;
}

async function syncRealtimePresence({ uid, branch, employeeName, status }) {
  try {
    await rtdbSet(ref(rtdb, `presence/${branch}/${uid}`), {
      employeeName,
      branch,
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // Non-blocking optional RTDB presence mirror
  }
}

export async function getManagerDashboard({ branch = 'ALL', date = '' } = {}) {
  try {
    const targetDate = date || getLocalDateIso();
    const [empSnap, userSnap, attSnap] = await Promise.all([
      getDocs(collection(db, 'employees')),
      getDocs(collection(db, 'users')),
      getDocs(query(collection(db, 'attendance'), where('attendance_date', '==', targetDate))),
    ]);

    const activeByUid = new Map();
    userSnap.forEach((d) => activeByUid.set(d.id, d.data().is_active !== false));

    const attByEmp = new Map();
    attSnap.forEach((d) => attByEmp.set(d.data().employee_id, { docId: d.id, ...d.data() }));

    const activeEmployees = empSnap.docs
      .map((d) => ({ id: d.id, ...d.data(), isActive: activeByUid.get(d.id) ?? true }))
      .filter((e) => e.isActive);

    const dailyRecords = activeEmployees.map((emp) => {
      const att = attByEmp.get(emp.id);
      return {
        id: att?.docId || `absent_${emp.id}_${targetDate}`,
        employeeId: emp.id,
        employeeName: emp.employee_name,
        employeeEmail: emp.email,
        branch: att?.branch || emp.branch,
        attendanceDate: att?.attendance_date || targetDate,
        checkIn: timestampToIso(att?.check_in),
        checkOut: timestampToIso(att?.check_out),
        workingHours: Number(att?.working_hours) || 0,
        status: att?.status || 'ABSENT',
      };
    });

    const summarize = (rows) => ({
      totalEmployees: rows.length,
      presentToday: rows.filter((r) => r.status === 'PRESENT' || r.status === 'CHECKED_IN').length,
      absentToday: rows.filter((r) => r.status === 'ABSENT').length,
      currentlyCheckedIn: rows.filter((r) => r.status === 'CHECKED_IN').length,
    });

    const overall = summarize(dailyRecords);
    const cbe = summarize(dailyRecords.filter((r) => r.branch === 'Coimbatore'));
    const chn = summarize(dailyRecords.filter((r) => r.branch === 'Chennai'));

    return {
      date: targetDate,
      branchFilter: branch,
      stats: {
        totalEmployees: overall.totalEmployees,
        coimbatoreEmployees: cbe.totalEmployees,
        chennaiEmployees: chn.totalEmployees,
        presentToday: overall.presentToday,
        absentToday: overall.absentToday,
        currentlyCheckedIn: overall.currentlyCheckedIn,
      },
      branchSummaries: [
        { branch: 'Coimbatore', ...cbe },
        { branch: 'Chennai', ...chn },
      ],
      attendanceRecords:
        branch === 'ALL' ? dailyRecords : dailyRecords.filter((r) => r.branch === branch),
    };
  } catch (error) {
    throw normalizeFirebaseError(error, 'Failed to load manager dashboard.');
  }
}

async function requireCurrentUser() {
  if (!auth) throw new Error('Not signed in.');
  if (auth.currentUser) return auth.currentUser;
  if (typeof auth.authStateReady === 'function') {
    await auth.authStateReady();
  }
  if (!auth.currentUser) throw new Error('Not signed in.');
  return auth.currentUser;
}

export async function getEmployeeDashboard() {
  const currentUser = await requireCurrentUser();

  try {
    const [empSnap, settings] = await Promise.all([
      getDoc(doc(db, 'employees', currentUser.uid)),
      getAttendanceSettings(),
    ]);
    if (!empSnap.exists()) throw new Error('Employee profile not found.');

    const empData = empSnap.data();
    const employee = {
      id: currentUser.uid,
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

    return {
      employee,
      settings,
      todayAttendance: history.find((h) => h.attendanceDate === todayDate) || null,
      history,
    };
  } catch (error) {
    throw normalizeFirebaseError(error, 'Failed to load attendance data.');
  }
}

export async function employeeCheckIn() {
  const currentUser = await requireCurrentUser();

  try {
    const [empSnap, settings] = await Promise.all([
      getDoc(doc(db, 'employees', currentUser.uid)),
      getAttendanceSettings(),
    ]);
    if (!empSnap.exists()) throw new Error('Employee profile not found.');

    const emp = empSnap.data();
    if (!VALID_BRANCHES.includes(emp.branch)) {
      throw new Error('Invalid assigned branch.');
    }

    if (settings.enforceLimits) {
      const check = evaluateTimeWindow(
        new Date(),
        settings.checkInStart,
        settings.checkInEnd,
        'Check-in'
      );
      if (!check.allowed) throw new Error(check.reason);
    }

    const todayDate = getLocalDateIso();
    const recordId = `${currentUser.uid}_${todayDate}`;
    const recordRef = doc(db, 'attendance', recordId);

    const existing = await getDoc(recordRef);
    if (existing.exists()) {
      throw new Error('You have already checked in today.');
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

    return { message: `Checked in successfully at ${emp.branch} branch.` };
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
      throw new Error('You must check in before checking out.');
    }

    const row = snap.data();
    if (row.check_out) {
      throw new Error('You have already checked out today.');
    }

    if (settings.enforceLimits) {
      const check = evaluateTimeWindow(
        new Date(),
        settings.checkOutStart,
        settings.checkOutEnd,
        'Check-out'
      );
      if (!check.allowed) throw new Error(check.reason);
    }

    const workingHours = calculateWorkingHours(
      timestampToIso(row.check_in),
      new Date().toISOString()
    );

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

    return { message: 'Checked out successfully.' };
  } catch (error) {
    throw normalizeFirebaseError(error, 'Unable to record check-out.');
  }
}

export const LEAVE_TYPES = [
  'Casual Leave',
  'Sick Leave',
  'Earned Leave',
  'Emergency Leave',
];

function computeInclusiveDays(startDate, endDate) {
  const s = new Date(`${startDate}T00:00:00`);
  const e = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return 0;
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export async function applyLeave({ leaveType, startDate, endDate, reason }) {
  const currentUser = await requireCurrentUser();

  if (!LEAVE_TYPES.includes(leaveType)) throw new Error('Select a valid leave type.');
  const totalDays = computeInclusiveDays(startDate, endDate);
  if (totalDays <= 0) throw new Error('End date cannot be earlier than start date.');
  const trimmedReason = String(reason || '').trim();
  if (trimmedReason.length < 3) throw new Error('Please enter a reason for leave.');

  try {
    const empSnap = await getDoc(doc(db, 'employees', currentUser.uid));
    if (!empSnap.exists()) throw new Error('Employee profile not found.');
    const emp = empSnap.data();

    const existingSnap = await getDocs(
      query(collection(db, 'leaves'), where('employee_id', '==', currentUser.uid))
    );
    const hasOverlap = existingSnap.docs.some((d) => {
      const lv = d.data();
      if (lv.status === 'REJECTED') return false;
      return lv.start_date <= endDate && startDate <= lv.end_date;
    });
    if (hasOverlap) {
      throw new Error('You already have a pending or approved leave for these dates.');
    }

    await addDoc(collection(db, 'leaves'), {
      employee_id: currentUser.uid,
      employee_code: emp.employee_code || `EMP-${currentUser.uid.slice(0, 6).toUpperCase()}`,
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

    return { message: `Leave request submitted for ${totalDays} day(s).` };
  } catch (error) {
    throw normalizeFirebaseError(error, 'Failed to submit leave request.');
  }
}

export async function getMyLeaveRequests() {
  const currentUser = await requireCurrentUser();

  try {
    const snap = await getDocs(
      query(collection(db, 'leaves'), where('employee_id', '==', currentUser.uid))
    );
    return snap.docs
      .map((d) => {
        const row = d.data();
        return {
          id: d.id,
          leaveType: row.leave_type,
          startDate: row.start_date,
          endDate: row.end_date,
          totalDays: Number(row.total_days) || 1,
          reason: row.reason || '',
          status: row.status || 'PENDING',
          managerNote: row.manager_note || '',
        };
      })
      .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
  } catch (error) {
    throw normalizeFirebaseError(error, 'Failed to load leave requests.');
  }
}

export async function cancelLeaveRequest(leaveId) {
  try {
    await deleteDoc(doc(db, 'leaves', leaveId));
    return { message: 'Pending leave request cancelled.' };
  } catch (error) {
    throw normalizeFirebaseError(error, 'Unable to cancel leave request.');
  }
}
