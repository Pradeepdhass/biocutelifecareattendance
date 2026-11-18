import React from 'react';
import {
  Image,
  KeyboardAvoidingView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import LoginForm from '../components/LoginForm';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme/colors';

// Standalone Bio Cute Life Care company logo (transparent PNG, no background image)
const COMPANY_LOGO = require('../../assets/biocute_logo.png');

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { width, height } = useWindowDimensions();

  const isWideLandscape = width > height && width >= 768;
  const isCompactHeight = height < 720 && !isWideLandscape;

  const handleLogin = async (credentials) => {
    await login(credentials);
  };

  return (
    <LinearGradient
      colors={['#EEF6FD', '#F8FBFF', '#E4F1FC']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.root}
    >
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      {/* Decorative Soft Vector Glow Shapes (No Background Image) */}
      <View style={styles.decorCircleTopRight} pointerEvents="none" />
      <View style={styles.decorCircleBottomLeft} pointerEvents="none" />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 10}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              isCompactHeight && styles.scrollContentCompact,
              isWideLandscape && styles.scrollContentLandscape,
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Brand Header using ONLY the Company Logo + Responsive Typography */}
            <View
              style={[
                styles.brandHeader,
                isCompactHeight && styles.brandHeaderCompact,
                isWideLandscape && styles.brandHeaderLandscape,
              ]}
            >
              <Image
                source={COMPANY_LOGO}
                style={[
                  styles.companyLogo,
                  isCompactHeight && styles.companyLogoCompact,
                  isWideLandscape && styles.companyLogoLandscape,
                ]}
                resizeMode="contain"
                accessibilityLabel="Bio Cute Life Care Logo"
              />

              <Text
                style={[
                  styles.welcomeKicker,
                  isCompactHeight && styles.welcomeKickerCompact,
                ]}
              >
                Welcome to
              </Text>
             
              <Text
                style={[
                  styles.welcomeBrand,
                  isCompactHeight && styles.welcomeBrandCompact,
                ]}
              >
                Attendance Management System
              </Text>

              <View style={styles.taglineRow}>
                <Text style={styles.taglineText}>Care</Text>
                <Text style={styles.taglineDot}>•</Text>
                <Text style={styles.taglineText}>Wellness</Text>
                <Text style={styles.taglineDot}>•</Text>
                <Text style={styles.taglineText}>Better Living</Text>
              </View>
            </View>

            {/* Login Card */}
            <View
              style={[
                styles.cardContainer,
                isWideLandscape && styles.cardContainerLandscape,
              ]}
            >
              <LoginForm
                compact={isCompactHeight}
                onSubmit={handleLogin}
                onForgotPassword={() => navigation.navigate('ForgotPassword')}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Bottom Navy & Red Accent Brand Footer Strip */}
        <View style={styles.footerWrapper}>
          <View style={styles.footerRedAccent} />
          <View
            style={[
              styles.footerNavyBar,
              isCompactHeight && styles.footerNavyBarCompact,
            ]}
          >
            <View style={styles.footerItem}>
              <MaterialCommunityIcons
                name="heart-pulse"
                size={14}
                color={COLORS.white}
              />
              <Text style={styles.footerText}>Bio Cute Life Care</Text>
            </View>
            <View style={styles.footerDivider} />
            <View style={styles.footerItem}>
              <MaterialCommunityIcons
                name="shield-check"
                size={13}
                color={COLORS.white}
              />
              <Text style={styles.footerText}>Secure &amp; Reliable</Text>
            </View>
            {isWideLandscape && (
              <>
                <View style={styles.footerDivider} />
                <View style={styles.footerItem}>
                  <Feather name="heart" size={13} color={COLORS.white} />
                  <Text style={styles.footerText}>
                    Healthier People... A Happier Tomorrow...
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  decorCircleTopRight: {
    position: 'absolute',
    top: -110,
    right: -90,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(22, 134, 217, 0.08)',
  },
  decorCircleBottomLeft: {
    position: 'absolute',
    bottom: 40,
    left: -100,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(22, 134, 217, 0.07)',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
  },
  scrollContentCompact: {
    paddingTop: 10,
    paddingBottom: 10,
  },
  scrollContentLandscape: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'stretch',
    paddingHorizontal: 32,
    paddingTop: 20,
    gap: 24,
  },
  brandHeader: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 18,
    width: '100%',
  },
  brandHeaderCompact: {
    marginBottom: 12,
  },
  brandHeaderLandscape: {
    flex: 1,
    marginBottom: 0,
    maxWidth: 440,
    paddingTop: 8,
  },
  companyLogo: {
    width: 275,
    height: 78,
    marginBottom: 10,
  },
  companyLogoCompact: {
    width: 230,
    height: 66,
    marginBottom: 6,
  },
  companyLogoLandscape: {
    width: 340,
    height: 96,
    marginBottom: 16,
  },
  welcomeKicker: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.primaryNavy,
    marginBottom: 1,
  },
  welcomeKickerCompact: {
    fontSize: 13.5,
  },
  welcomeBrand: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.primaryNavy,
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: 6,
  },
  welcomeBrandCompact: {
    fontSize: 18.5,
    marginBottom: 4,
  },
  welcomeSystem: {
    fontSize: 13.5,
    fontWeight: '500',
    color: COLORS.primaryNavy,
    letterSpacing: 0.6,
    marginTop: 2,
    marginBottom: 5,
    textAlign: 'center',
  },
  welcomeSystemCompact: {
    fontSize: 12.5,
    marginBottom: 3,
  },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taglineText: {
    fontSize: 12.5,
    fontStyle: 'italic',
    fontWeight: '500',
    color: COLORS.primaryNavy,
  },
  taglineDot: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryRed,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
  },
  cardContainerLandscape: {
    flex: 1,
    maxWidth: 430,
    justifyContent: 'center',
  },
  footerWrapper: {
    width: '100%',
  },
  footerRedAccent: {
    height: 3,
    width: '45%',
    backgroundColor: COLORS.primaryRed,
    borderTopRightRadius: 8,
  },
  footerNavyBar: {
    backgroundColor: COLORS.primaryNavy,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  footerNavyBarCompact: {
    paddingVertical: 8,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  footerText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.94)',
  },
  footerDivider: {
    width: 1,
    height: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
});
