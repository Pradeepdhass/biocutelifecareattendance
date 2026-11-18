import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
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
import { getManagerDashboard } from '../services/attendanceService';

const BRANCH_OPTIONS = [
  { value: 'ALL', label: 'All Branches' },
  { value: 'Coimbatore', label: 'Coimbatore' },
  { value: 'Chennai', label: 'Chennai' },
];

export default function ManagerDashboardScreen() {
  const { user, logout } = useAuth();
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setError('');
    try {
      const data = await getManagerDashboard({ branch: branchFilter });
      setDashboard(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchFilter]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const stats = dashboard?.stats || {
    totalEmployees: 0,
    coimbatoreEmployees: 0,
    chennaiEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    currentlyCheckedIn: 0,
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="light" backgroundColor={COLORS.primaryNavy} />

      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>CENTRAL MANAGER</Text>
          <Text style={styles.title}>Coimbatore &amp; Chennai</Text>
          <Text style={styles.subEmail}>{user?.email}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Feather name="log-out" size={15} color={COLORS.white} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Branch Filter Pills */}
      <View style={styles.filterBar}>
        {BRANCH_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => setBranchFilter(opt.value)}
            style={[
              styles.filterPill,
              branchFilter === opt.value && styles.filterPillActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                branchFilter === opt.value && styles.filterTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
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
                loadDashboard();
              }}
            />
          }
        >
          {Boolean(error) && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* 6 KPI Stat Cards */}
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Total Employees</Text>
              <Text style={styles.kpiVal}>{stats.totalEmployees}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Coimbatore</Text>
              <Text style={styles.kpiVal}>{stats.coimbatoreEmployees}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Chennai</Text>
              <Text style={styles.kpiVal}>{stats.chennaiEmployees}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Present Today</Text>
              <Text style={[styles.kpiVal, { color: COLORS.success }]}>
                {stats.presentToday}
              </Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Absent Today</Text>
              <Text style={[styles.kpiVal, { color: COLORS.primaryRed }]}>
                {stats.absentToday}
              </Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Checked In</Text>
              <Text style={[styles.kpiVal, { color: COLORS.secondaryBlue }]}>
                {stats.currentlyCheckedIn}
              </Text>
            </View>
          </View>

          {/* Branch Summaries */}
          {(dashboard?.branchSummaries || []).map((summary) => (
            <View key={summary.branch} style={styles.card}>
              <Text style={styles.cardKicker}>{summary.branch.toUpperCase()} SUMMARY</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryMetric}>Total: {summary.totalEmployees}</Text>
                <Text style={styles.summaryMetric}>Present: {summary.presentToday}</Text>
                <Text style={styles.summaryMetric}>Absent: {summary.absentToday}</Text>
                <Text style={styles.summaryMetric}>Active: {summary.currentlyCheckedIn}</Text>
              </View>
            </View>
          ))}

          {/* Attendance List */}
          <View style={styles.card}>
            <Text style={styles.cardKicker}>
              ATTENDANCE ({branchFilter === 'ALL' ? 'ALL BRANCHES' : branchFilter.toUpperCase()})
            </Text>
            {(dashboard?.attendanceRecords || []).length === 0 ? (
              <Text style={styles.emptyText}>No active employees for this filter.</Text>
            ) : (
              dashboard.attendanceRecords.map((rec) => (
                <View key={rec.id} style={styles.attRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.attName}>{rec.employeeName}</Text>
                    <Text style={styles.attMeta}>
                      {rec.employeeEmail} • {rec.branch}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.attStatus}>{rec.status.replace('_', ' ')}</Text>
                    <Text style={styles.attHours}>
                      {(Number(rec.workingHours) || 0).toFixed(2)} hrs
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
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
  subEmail: { fontSize: 11.5, color: '#BDD6EE', marginTop: 1 },
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
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightBorder,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#EEF5FC',
    alignItems: 'center',
  },
  filterPillActive: { backgroundColor: COLORS.secondaryBlue },
  filterText: { fontSize: 12.5, fontWeight: '700', color: COLORS.primaryNavy },
  filterTextActive: { color: COLORS.white },
  scroll: { padding: 14, gap: 12 },
  errorBox: {
    backgroundColor: COLORS.errorBackground,
    borderColor: COLORS.errorBorder,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  errorText: { color: COLORS.error, fontSize: 13, fontWeight: '600' },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    width: '31%',
    flexGrow: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADII.input,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
    padding: 12,
  },
  kpiLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  kpiVal: { fontSize: 22, fontWeight: '800', color: COLORS.primaryNavy, marginTop: 4 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADII.input + 2,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
    padding: 16,
  },
  cardKicker: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.secondaryBlue,
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  summaryMetric: { fontSize: 13, fontWeight: '700', color: COLORS.primaryNavy },
  emptyText: { fontSize: 13, color: COLORS.textMuted },
  attRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#EAF1F8',
  },
  attName: { fontSize: 14, fontWeight: '700', color: COLORS.primaryNavy },
  attMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  attStatus: { fontSize: 12, fontWeight: '700', color: COLORS.secondaryBlue },
  attHours: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
});
