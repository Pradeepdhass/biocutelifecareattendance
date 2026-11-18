import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADII } from '../theme/colors';
import { validateEmail, validateForgotPasswordForm } from '../utils/validation';
import { requestPasswordReset } from '../services/authService';

const COMPANY_LOGO = require('../../assets/biocute_logo.png');

export default function ForgotPasswordScreen({ navigation }) {
  const { width, height } = useWindowDimensions();
  const isWideLandscape = width > height && width >= 768;

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailChange = (text) => {
    setEmail(text);
    if (submitError) setSubmitError('');
    if (touched) {
      setEmailError(validateEmail(text));
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setSubmitError('');
    setSuccessMessage('');

    const { isValid, errors } = validateForgotPasswordForm(email);
    setTouched(true);
    setEmailError(errors.email);
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      const response = await requestPasswordReset(email.trim());
      setSuccessMessage(response.message);
    } catch (error) {
      setSubmitError(
        error?.message || 'Unable to process password reset request. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LinearGradient
      colors={['#EEF6FD', '#F8FBFF', '#E4F1FC']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.root}
    >
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              isWideLandscape && styles.scrollContentLandscape,
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.logoWrap}>
              <Image
                source={COMPANY_LOGO}
                style={styles.companyLogo}
                resizeMode="contain"
                accessibilityLabel="Bio Cute Life Care Logo"
              />
            </View>

            <View style={styles.card}>
              <View style={styles.cardBody}>
                <View style={styles.headerBlock}>
                  <View style={styles.shieldDividerRow}>
                    <View style={styles.dividerRule} />
                    <MaterialCommunityIcons
                      name="shield-lock"
                      size={34}
                      color={COLORS.primaryNavy}
                      style={styles.shieldIcon}
                    />
                    <View style={styles.dividerRule} />
                  </View>

                  <Text style={styles.secureAccessText}>Account Recovery</Text>

                  <Text style={styles.heading} accessibilityRole="header">
                    <Text style={styles.headingAdmin}>Reset </Text>
                    <Text style={styles.headingLogin}>Password</Text>
                  </Text>

                  <Text style={styles.subtitle}>
                    Enter your registered admin email to receive reset instructions
                  </Text>
                </View>

                {Boolean(submitError) && (
                  <View style={styles.alertError} accessibilityRole="alert">
                    <Feather
                      name="alert-circle"
                      size={17}
                      color={COLORS.error}
                      style={styles.alertIcon}
                    />
                    <Text style={styles.alertErrorText}>{submitError}</Text>
                  </View>
                )}

                {Boolean(successMessage) ? (
                  <View>
                    <View style={styles.alertSuccess}>
                      <Feather
                        name="check-circle"
                        size={18}
                        color={COLORS.success}
                        style={styles.alertIcon}
                      />
                      <Text style={styles.alertSuccessText}>{successMessage}</Text>
                    </View>

                    <Pressable onPress={() => navigation.goBack()} accessibilityRole="button">
                      <LinearGradient
                        colors={['#E31135', '#B90024', '#7F0018']}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                        style={styles.submitButton}
                      >
                        <Feather name="arrow-left" size={18} color={COLORS.white} />
                        <Text style={styles.submitButtonText}>Back to Admin Login</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                ) : (
                  <View>
                    <View style={styles.fieldGroup}>
                      <View
                        style={[
                          styles.inputWrapper,
                          focused && styles.inputWrapperFocused,
                          Boolean(emailError) && styles.inputWrapperError,
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="email"
                          size={19}
                          color={
                            emailError
                              ? COLORS.error
                              : focused
                              ? COLORS.secondaryBlue
                              : COLORS.primaryNavy
                          }
                          style={styles.inputIconLeft}
                        />
                        <TextInput
                          style={styles.input}
                          placeholder="Email Address"
                          placeholderTextColor={COLORS.placeholder}
                          value={email}
                          onChangeText={handleEmailChange}
                          onFocus={() => setFocused(true)}
                          onBlur={() => {
                            setFocused(false);
                            setTouched(true);
                            setEmailError(validateEmail(email));
                          }}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                          returnKeyType="done"
                          editable={!isSubmitting}
                          onSubmitEditing={handleSubmit}
                          accessibilityLabel="Email Address"
                        />
                      </View>
                      {Boolean(emailError) && (
                        <Text style={styles.fieldErrorText}>{emailError}</Text>
                      )}
                    </View>

                    <Pressable
                      onPress={handleSubmit}
                      disabled={isSubmitting}
                      accessibilityRole="button"
                      accessibilityLabel="Send Recovery Link"
                    >
                      <LinearGradient
                        colors={['#E31135', '#B90024', '#7F0018']}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                        style={[styles.submitButton, isSubmitting && { opacity: 0.85 }]}
                      >
                        {isSubmitting ? (
                          <>
                            <ActivityIndicator size="small" color={COLORS.white} />
                            <Text style={styles.submitButtonText}>Sending Reset Link...</Text>
                          </>
                        ) : (
                          <Text style={styles.submitButtonText}>Send Recovery Link</Text>
                        )}
                      </LinearGradient>
                    </Pressable>

                    <TouchableOpacity
                      onPress={() => navigation.goBack()}
                      style={styles.backButton}
                      accessibilityRole="link"
                    >
                      <Feather name="arrow-left" size={16} color={COLORS.primaryNavy} />
                      <Text style={styles.backButtonText}>Return to Admin Login</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.footer}>
                  <View style={styles.dividerRule} />
                  <Text style={styles.poweredByText}>Powered by Bio Cute Life Care</Text>
                  <View style={styles.dividerRule} />
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
  scrollContentLandscape: {
    paddingHorizontal: 40,
  },
  logoWrap: {
    marginBottom: 18,
    alignItems: 'center',
  },
  companyLogo: {
    width: 240,
    height: 68,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderRadius: RADII.card,
    borderWidth: 1.25,
    borderColor: '#DCE6F0',
    elevation: 8,
  },
  cardBody: { paddingHorizontal: 26, paddingTop: 26, paddingBottom: 22 },
  headerBlock: { alignItems: 'center', marginBottom: 20 },
  shieldDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 6,
  },
  dividerRule: { flex: 1, height: 1, backgroundColor: '#D8E2EC' },
  shieldIcon: { marginHorizontal: 14 },
  secureAccessText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.primaryNavy,
    marginBottom: 10,
  },
  heading: { fontSize: 27, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  headingAdmin: { color: COLORS.primaryNavy },
  headingLogin: { color: COLORS.primaryRed },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  alertError: {
    flexDirection: 'row',
    backgroundColor: COLORS.errorBackground,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  alertErrorText: { flex: 1, fontSize: 13, color: COLORS.error, fontWeight: '500' },
  alertSuccess: {
    flexDirection: 'row',
    backgroundColor: COLORS.successBackground,
    borderWidth: 1,
    borderColor: COLORS.successBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  alertSuccessText: { flex: 1, fontSize: 13, color: COLORS.success, fontWeight: '500' },
  alertIcon: { marginRight: 9, marginTop: 1 },
  fieldGroup: { marginBottom: 18 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1.4,
    borderColor: COLORS.lightBorder,
    borderRadius: 10,
    height: 50,
    paddingHorizontal: 14,
  },
  inputWrapperFocused: { borderColor: COLORS.secondaryBlue },
  inputWrapperError: { backgroundColor: '#FFFAFB', borderColor: COLORS.error },
  inputIconLeft: { marginRight: 11 },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.primaryNavy,
  },
  fieldErrorText: {
    marginTop: 5,
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.error,
  },
  submitButton: {
    height: 52,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 15.5,
    fontWeight: '700',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 6,
  },
  backButtonText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.primaryNavy,
  },
  footer: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  poweredByText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryNavy,
    marginHorizontal: 10,
  },
});
