import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { COLORS, RADII } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

export default function DashboardScreen() {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="light" backgroundColor={COLORS.primaryNavy} />

      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>BIO CUTE LIFE CARE</Text>
          <Text style={styles.title}>Attendance Management</Text>
        </View>
        <TouchableOpacity
          onPress={logout}
          style={styles.logoutButton}
          accessibilityRole="button"
          accessibilityLabel="Sign Out"
        >
          <Feather name="log-out" size={16} color={COLORS.white} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>
            Welcome, {user?.name || 'Administrator'}
          </Text>
          <Text style={styles.welcomeEmail}>{user?.email}</Text>
          <Text style={styles.welcomeBody}>
            You are securely authenticated into the Bio Cute Life Care Attendance Management
            System. Configure EXPO_PUBLIC_API_BASE_URL to connect your live backend API.
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Staff Checked In</Text>
            <Text style={styles.statValue}>—</Text>
            <Text style={styles.statNote}>Awaiting API sync</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>On Leave Today</Text>
            <Text style={styles.statValue}>—</Text>
            <Text style={styles.statNote}>Awaiting API sync</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F7FC' },
  header: {
    backgroundColor: COLORS.primaryNavy,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8CCBFF',
    letterSpacing: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primaryRed,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  logoutText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  content: { padding: 20, gap: 16 },
  welcomeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
    padding: 20,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primaryNavy,
  },
  welcomeEmail: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.secondaryBlue,
    marginTop: 2,
    marginBottom: 10,
  },
  welcomeBody: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADII.input,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
    padding: 16,
  },
  statLabel: { fontSize: 12.5, fontWeight: '600', color: COLORS.textSecondary },
  statValue: { fontSize: 26, fontWeight: '800', color: COLORS.primaryNavy, marginVertical: 6 },
  statNote: { fontSize: 11.5, color: COLORS.textMuted },
});
