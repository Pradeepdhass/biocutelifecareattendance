import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { COLORS, RADII } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import {
  getEmployeeDashboard,
  employeeCheckIn,
  employeeCheckOut,
  applyLeave,
  getMyLeaveRequests,
  cancelLeaveRequest,
  LEAVE_TYPES,
  DEFAULT_ATTENDANCE_SETTINGS,
  formatTime12h,
  evaluateTimeWindow,
} from '../services/attendanceService';

function getTodayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function EmployeeDashboardScreen() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('attendance');
  const [data, setData] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyAction, setBusyAction] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [now, setNow] = useState(() => new Date());

  const [leaveType, setLeaveType] = useState(LEAVE_TYPES[0]);
  const [startDate, setStartDate] = useState(getTodayIso());
  const [endDate, setEndDate] = useState(getTodayIso());
  const [reason, setReason] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!message.text) return undefined;
    const t = setTimeout(() => setMessage({ type: '', text: '' }), 3500);
    return () => clearTimeout(t);
  }, [message]);

  const loadData = useCallback(async () => {
    try {
      const [res, myLeaves] = await Promise.all([
        getEmployeeDashboard(),
        getMyLeaveRequests().catch(() => []),
      ]);
      setData(res);
      setLeaves(myLeaves);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApplyLeave = async () => {
    setBusyAction('leave');
    setMessage({ type: '', text: '' });
    try {
      const res = await applyLeave({ leaveType, startDate, endDate, reason });
      setMessage({ type: 'success', text: res.message });
      setReason('');
      await loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBusyAction('');
    }
  };

  const handleCancelLeave = async (id) => {
    setMessage({ type: '', text: '' });
    try {
      const res = await cancelLeaveRequest(id);
      setMessage({ type: 'success', text: res.message });
      await loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleCheckIn = async () => {
    setBusyAction('in');
    setMessage({ type: '', text: '' });
    try {
      const res = await employeeCheckIn();
      setMessage({ type: 'success', text: res.message });
      await loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBusyAction('');
    }
  };

  const handleCheckOut = async () => {
    setBusyAction('out');
    setMessage({ type: '', text: '' });
    try {
      const res = await employeeCheckOut();
      setMessage({ type: 'success', text: res.message });
      await loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBusyAction('');
    }
  };

  const employee = data?.employee;
  const settings = data?.settings || DEFAULT_ATTENDANCE_SETTINGS;
  const today = data?.todayAttendance;
  const hasCheckedIn = Boolean(today?.checkIn);
  const hasCheckedOut = Boolean(today?.checkOut);

  const checkInWindow = settings.enforceLimits
    ? evaluateTimeWindow(now, settings.checkInStart, settings.checkInEnd, 'Check-in')
    : { allowed: true, reason: '' };
  const checkOutWindow = settings.enforceLimits
    ? evaluateTimeWindow(now, settings.checkOutStart, settings.checkOutEnd, 'Check-out')
    : { allowed: true, reason: '' };

  const canCheckIn = !hasCheckedIn && checkInWindow.allowed && !busyAction;
  const canCheckOut = hasCheckedIn && !hasCheckedOut && checkOutWindow.allowed && !busyAction;

  let workingHours = today?.workingHours || 0;
  if (hasCheckedIn && !hasCheckedOut) {
    const ms = Math.max(0, now.getTime() - new Date(today.checkIn).getTime());
    workingHours = Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
  }

  const statusText = hasCheckedOut
    ? 'Present'
    : hasCheckedIn
    ? 'Checked In'
    : 'Not Checked In';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="light" backgroundColor={COLORS.primaryNavy} />

      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>EMPLOYEE PORTAL</Text>
          <Text style={styles.title}>Bio Cute Life Care</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Feather name="log-out" size={15} color={COLORS.white} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Mobile Tabs: Daily Attendance | Leave */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          onPress={() => setActiveTab('attendance')}
          style={[styles.tabPill, activeTab === 'attendance' && styles.tabPillActive]}
        >
          <Text style={[styles.tabText, activeTab === 'attendance' && styles.tabTextActive]}>
            Attendance
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('leave')}
          style={[styles.tabPill, activeTab === 'leave' && styles.tabPillActive]}
        >
          <Text style={[styles.tabText, activeTab === 'leave' && styles.tabTextActive]}>
            Leave ({leaves.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primaryNavy} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
            />
          }
        >
          {Boolean(message.text) && (
            <View
              style={[
                styles.banner,
                message.type === 'error' ? styles.bannerError : styles.bannerSuccess,
              ]}
            >
              <Text
                style={
                  message.type === 'error' ? styles.bannerErrorText : styles.bannerSuccessText
                }
              >
                {message.text}
              </Text>
            </View>
          )}

          {activeTab === 'attendance' ? (
            <>
              {/* Profile Card (Strictly Name, Email, Assigned Branch — Read-only) */}
              <View style={styles.card}>
                <Text style={styles.cardKicker}>MY PROFILE</Text>
                <Text style={styles.empName}>{employee?.employeeName}</Text>
                <Text style={styles.empEmail}>{employee?.email}</Text>
                <View style={styles.branchRow}>
                  <Text style={styles.metaLabel}>Assigned Branch:</Text>
                  <View style={styles.branchBadge}>
                    <Text style={styles.branchBadgeText}>{employee?.branch}</Text>
                  </View>
                </View>
              </View>

              {/* Live Clock + Check-in / Check-out */}
              <View style={styles.card}>
                <Text style={styles.cardKicker}>TODAY&apos;S ATTENDANCE</Text>
                <Text style={styles.dateText}>
                  {now.toLocaleDateString('en-IN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
                <Text style={styles.timeText}>
                  {now.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                  })}
                </Text>

                <View style={styles.metricsRow}>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>Status</Text>
                    <Text style={styles.metricValue}>{statusText}</Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>Working Hours</Text>
                    <Text style={styles.metricValue}>{workingHours.toFixed(2)} hrs</Text>
                  </View>
                </View>

                <View style={styles.scheduleBox}>
                  <Text style={styles.scheduleText}>
                    Working Hours: {formatTime12h(settings.workStart)} –{' '}
                    {formatTime12h(settings.workEnd)}
                  </Text>
                  <Text style={styles.scheduleSubText}>
                    Check-in: {formatTime12h(settings.checkInStart)} –{' '}
                    {formatTime12h(settings.checkInEnd)} | Check-out:{' '}
                    {formatTime12h(settings.checkOutStart)} – {formatTime12h(settings.checkOutEnd)}
                  </Text>
                </View>

                {!hasCheckedIn && !checkInWindow.allowed && (
                  <Text style={styles.windowWarning}>{checkInWindow.reason}</Text>
                )}
                {hasCheckedIn && !hasCheckedOut && !checkOutWindow.allowed && (
                  <Text style={styles.windowWarning}>{checkOutWindow.reason}</Text>
                )}

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    onPress={handleCheckIn}
                    disabled={!canCheckIn}
                    style={[styles.checkInBtn, !canCheckIn && styles.btnDisabled]}
                  >
                    <Text style={styles.actionBtnText}>
                      {busyAction === 'in'
                        ? 'Checking In...'
                        : hasCheckedIn
                        ? 'Checked In'
                        : 'Check In'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleCheckOut}
                    disabled={!canCheckOut}
                    style={[styles.checkOutBtn, !canCheckOut && styles.btnDisabled]}
                  >
                    <Text style={styles.actionBtnText}>
                      {busyAction === 'out'
                        ? 'Checking Out...'
                        : hasCheckedOut
                        ? 'Checked Out'
                        : 'Check Out'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Attendance History */}
              <View style={styles.card}>
                <Text style={styles.cardKicker}>ATTENDANCE HISTORY</Text>
                {(data?.history || []).length === 0 ? (
                  <Text style={styles.emptyText}>No attendance records yet.</Text>
                ) : (
                  data.history.map((item) => (
                    <View key={item.id} style={styles.historyRow}>
                      <View>
                        <Text style={styles.historyDate}>{item.attendanceDate}</Text>
                        <Text style={styles.historyMeta}>
                          In: {formatTime(item.checkIn)} | Out: {formatTime(item.checkOut)}
                        </Text>
                      </View>
                      <View style={styles.historyRight}>
                        <Text style={styles.historyHours}>
                          {(Number(item.workingHours) || 0).toFixed(2)} hrs
                        </Text>
                        <Text style={styles.historyBranch}>{item.branch}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </>
          ) : (
            <>
              {/* Apply Leave Card */}
              <View style={styles.card}>
                <Text style={styles.cardKicker}>APPLY FOR LEAVE ({employee?.branch})</Text>

                <View style={styles.leaveTypeWrap}>
                  {LEAVE_TYPES.map((lt) => (
                    <TouchableOpacity
                      key={lt}
                      onPress={() => setLeaveType(lt)}
                      style={[styles.typeChip, leaveType === lt && styles.typeChipActive]}
                    >
                      <Text
                        style={[styles.typeChipText, leaveType === lt && styles.typeChipTextActive]}
                      >
                        {lt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>From Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.textInput}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                />

                <Text style={styles.inputLabel}>To Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.textInput}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                />

                <Text style={styles.inputLabel}>Reason</Text>
                <TextInput
                  style={[styles.textInput, { height: 74, textAlignVertical: 'top', paddingTop: 10 }]}
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Enter reason for leave..."
                  multiline
                />

                <TouchableOpacity
                  onPress={handleApplyLeave}
                  disabled={busyAction === 'leave'}
                  style={[styles.submitLeaveBtn, busyAction === 'leave' && styles.btnDisabled]}
                >
                  <Text style={styles.actionBtnText}>
                    {busyAction === 'leave' ? 'Submitting...' : 'Submit Leave Request'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* My Leave Requests */}
              <View style={styles.card}>
                <Text style={styles.cardKicker}>MY LEAVE REQUESTS</Text>
                {leaves.length === 0 ? (
                  <Text style={styles.emptyText}>No leave requests submitted yet.</Text>
                ) : (
                  leaves.map((lv) => (
                    <View key={lv.id} style={styles.historyRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.historyDate}>
                          {lv.leaveType} ({lv.totalDays}d)
                        </Text>
                        <Text style={styles.historyMeta}>
                          {lv.startDate} → {lv.endDate}
                        </Text>
                        <Text style={styles.historyMeta}>{lv.reason}</Text>
                        {Boolean(lv.managerNote) && (
                          <Text style={styles.historyMeta}>Note: {lv.managerNote}</Text>
                        )}
                      </View>
                      <View style={styles.historyRight}>
                        <Text style={styles.historyHours}>{lv.status}</Text>
                        {lv.status === 'PENDING' && (
                          <TouchableOpacity onPress={() => handleCancelLeave(lv.id)}>
                            <Text style={{ color: COLORS.primaryRed, fontSize: 12, fontWeight: '700', marginTop: 4 }}>
                              Cancel
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F7FC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: COLORS.primaryNavy,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.primaryRed,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kicker: { fontSize: 10.5, fontWeight: '700', color: '#8CCBFF', letterSpacing: 1 },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.white, marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primaryRed,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  logoutText: { color: COLORS.white, fontSize: 12.5, fontWeight: '700' },
  scroll: { padding: 16, gap: 14 },
  banner: { padding: 12, borderRadius: 10, borderWidth: 1 },
  bannerError: { backgroundColor: COLORS.errorBackground, borderColor: COLORS.errorBorder },
  bannerSuccess: { backgroundColor: COLORS.successBackground, borderColor: COLORS.successBorder },
  bannerErrorText: { color: COLORS.error, fontWeight: '600', fontSize: 13 },
  bannerSuccessText: { color: COLORS.success, fontWeight: '600', fontSize: 13 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADII.input + 4,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
    padding: 18,
  },
  cardKicker: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.secondaryBlue,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  empName: { fontSize: 21, fontWeight: '800', color: COLORS.primaryNavy },
  empEmail: { fontSize: 13.5, color: COLORS.textSecondary, marginTop: 2, marginBottom: 10 },
  branchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  branchBadge: {
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  branchBadgeText: { fontSize: 12.5, fontWeight: '700', color: COLORS.primaryNavy },
  dateText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  timeText: { fontSize: 28, fontWeight: '800', color: COLORS.primaryNavy, marginVertical: 4 },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 12,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#F6FAFF',
    borderWidth: 1,
    borderColor: '#DCE7F2',
    borderRadius: 10,
    padding: 12,
  },
  metricLabel: { fontSize: 11.5, color: COLORS.textMuted, fontWeight: '600' },
  metricValue: { fontSize: 16, fontWeight: '800', color: COLORS.primaryNavy, marginTop: 3 },
  scheduleBox: {
    backgroundColor: '#EEF6FD',
    borderWidth: 1,
    borderColor: '#D5E4F3',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  scheduleText: { fontSize: 12.5, fontWeight: '700', color: COLORS.primaryNavy },
  scheduleSubText: { fontSize: 11.5, color: COLORS.textSecondary, marginTop: 2 },
  windowWarning: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8A5300',
    backgroundColor: '#FFF6E6',
    borderWidth: 1,
    borderColor: '#F5D79C',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  actionRow: { flexDirection: 'row', gap: 10 },
  checkInBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOutBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    backgroundColor: COLORS.primaryRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { backgroundColor: '#CBD8E6' },
  actionBtnText: { color: COLORS.white, fontSize: 14.5, fontWeight: '700' },
  emptyText: { fontSize: 13.5, color: COLORS.textMuted, paddingVertical: 8 },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#EAF1F8',
  },
  historyDate: { fontSize: 14, fontWeight: '700', color: COLORS.primaryNavy },
  historyMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  historyRight: { alignItems: 'flex-end' },
  historyHours: { fontSize: 13.5, fontWeight: '700', color: COLORS.secondaryBlue },
  historyBranch: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 2 },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightBorder,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#EEF5FC',
    alignItems: 'center',
  },
  tabPillActive: { backgroundColor: COLORS.primaryNavy },
  tabText: { fontSize: 13, fontWeight: '700', color: COLORS.primaryNavy },
  tabTextActive: { color: COLORS.white },
  leaveTypeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
    backgroundColor: '#F6FAFF',
  },
  typeChipActive: { backgroundColor: COLORS.secondaryBlue, borderColor: COLORS.secondaryBlue },
  typeChipText: { fontSize: 12, fontWeight: '600', color: COLORS.primaryNavy },
  typeChipTextActive: { color: COLORS.white },
  inputLabel: { fontSize: 12, fontWeight: '700', color: COLORS.primaryNavy, marginTop: 8, marginBottom: 4 },
  textInput: {
    height: 44,
    borderWidth: 1.2,
    borderColor: COLORS.lightBorder,
    borderRadius: 9,
    paddingHorizontal: 12,
    fontSize: 14,
    color: COLORS.primaryNavy,
    backgroundColor: COLORS.white,
  },
  submitLeaveBtn: {
    height: 46,
    borderRadius: 10,
    backgroundColor: COLORS.primaryRed,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
});
