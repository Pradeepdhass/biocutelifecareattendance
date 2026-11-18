import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADII } from '../theme/colors';
import {
  validateEmail,
  validatePassword,
  validateLoginForm,
} from '../utils/validation';
import { getRememberedEmail, getRememberedRole } from '../services/authService';

const ROLE_OPTIONS = [
  {
    value: 'ADMIN',
    label: 'Admin',
    subtitle: 'Manage branches, managers, staff & shift settings',
  },
  {
    value: 'MANAGER',
    label: 'Manager',
    subtitle: 'Manage attendance, employees & leave approvals',
  },
  {
    value: 'EMPLOYEE',
    label: 'Employee',
    subtitle: 'Mark daily attendance & apply for leave',
  },
];

export default function LoginForm({ onSubmit, onForgotPassword, compact = false }) {
  const [selectedRole, setSelectedRole] = useState('ADMIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordInputRef = useRef(null);
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let mounted = true;
    async function loadSavedPrefs() {
      const [saved, savedRole] = await Promise.all([
        getRememberedEmail(),
        getRememberedRole(),
      ]);
      if (mounted) {
        if (saved) {
          setEmail(saved);
          setRememberMe(true);
        }
        if (savedRole) {
          setSelectedRole(savedRole);
        }
      }
    }
    loadSavedPrefs();
    return () => {
      mounted = false;
    };
  }, []);

  const activeRoleMeta =
    ROLE_OPTIONS.find((r) => r.value === selectedRole) || ROLE_OPTIONS[0];

  const handleEmailChange = (text) => {
    setEmail(text);
    if (formError) setFormError('');
    if (touched.email) {
      setFieldErrors((prev) => ({ ...prev, email: validateEmail(text) }));
    }
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    if (formError) setFormError('');
    if (touched.password) {
      setFieldErrors((prev) => ({ ...prev, password: validatePassword(text) }));
    }
  };

  const handleBlur = (field) => {
    setFocusedField(null);
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'email') {
      setFieldErrors((prev) => ({ ...prev, email: validateEmail(email) }));
    } else if (field === 'password') {
      setFieldErrors((prev) => ({ ...prev, password: validatePassword(password) }));
    }
  };

  const animatePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.975,
      useNativeDriver: true,
      speed: 35,
      bounciness: 4,
    }).start();
  };

  const animatePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 25,
      bounciness: 6,
    }).start();
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    setFormError('');
    const { isValid, errors } = validateLoginForm({ email, password });
    setTouched({ email: true, password: true });
    setFieldErrors(errors);

    if (!isValid) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        email: email.trim(),
        password,
        rememberMe,
      });
    } catch (error) {
      setFormError(
        error?.message || 'Unable to sign in. Please verify your credentials and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.card} accessible accessibilityLabel="Admin Login Form">
      <View style={[styles.cardBody, compact && styles.cardBodyCompact]}>
        {/* Centered Shield-Lock Header with Horizontal Rules */}
        <View style={[styles.headerBlock, compact && styles.headerBlockCompact]}>
          <View style={styles.shieldDividerRow}>
            <View style={styles.dividerRule} />
            <MaterialCommunityIcons
              name="shield-lock"
              size={compact ? 28 : 34}
              color={COLORS.primaryNavy}
              style={styles.shieldIcon}
            />
            <View style={styles.dividerRule} />
          </View>

          <Text style={[styles.secureAccessText, compact && styles.secureAccessTextCompact]}>
            Secure Access
          </Text>

          {/* Main Heading: Clean Unified Portal Login (auto-routes Admin, Manager & Employee) */}
          <Text style={[styles.heading, compact && styles.headingCompact]} accessibilityRole="header">
            <Text style={styles.headingAdmin}>Portal </Text>
            <Text style={styles.headingLogin}>Login</Text>
          </Text>

          <Text style={styles.subtitle}>Admin • Manager • Employee</Text>
        </View>

        {/* Form-level Error Alert */}
        {Boolean(formError) && (
          <View
            style={styles.alertError}
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
          >
            <Feather
              name="alert-circle"
              size={17}
              color={COLORS.error}
              style={styles.alertIcon}
            />
            <Text style={styles.alertErrorText}>{formError}</Text>
          </View>
        )}

        {/* Email Address Field */}
        <View style={styles.fieldGroup}>
          <View
            style={[
              styles.inputWrapper,
              focusedField === 'email' && styles.inputWrapperFocused,
              Boolean(fieldErrors.email) && styles.inputWrapperError,
            ]}
          >
            <MaterialCommunityIcons
              name="email"
              size={19}
              color={
                fieldErrors.email
                  ? COLORS.error
                  : focusedField === 'email'
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
              onFocus={() => setFocusedField('email')}
              onBlur={() => handleBlur('email')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              editable={!isSubmitting}
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              accessibilityLabel="Email Address"
              accessibilityHint="Enter your admin email address"
            />
          </View>
          {Boolean(fieldErrors.email) && (
            <Text style={styles.fieldErrorText} accessibilityRole="alert">
              {fieldErrors.email}
            </Text>
          )}
        </View>

        {/* Password Field */}
        <View style={styles.fieldGroup}>
          <View
            style={[
              styles.inputWrapper,
              focusedField === 'password' && styles.inputWrapperFocused,
              Boolean(fieldErrors.password) && styles.inputWrapperError,
            ]}
          >
            <MaterialCommunityIcons
              name="lock"
              size={19}
              color={
                fieldErrors.password
                  ? COLORS.error
                  : focusedField === 'password'
                  ? COLORS.secondaryBlue
                  : COLORS.primaryNavy
              }
              style={styles.inputIconLeft}
            />
            <TextInput
              ref={passwordInputRef}
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={COLORS.placeholder}
              value={password}
              onChangeText={handlePasswordChange}
              onFocus={() => setFocusedField('password')}
              onBlur={() => handleBlur('password')}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              textContentType="password"
              returnKeyType="done"
              editable={!isSubmitting}
              onSubmitEditing={handleSubmit}
              accessibilityLabel="Password"
              accessibilityHint="Enter your account password"
            />
            <TouchableOpacity
              onPress={() => setShowPassword((prev) => !prev)}
              disabled={isSubmitting}
              style={styles.passwordToggle}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              <Feather
                name={showPassword ? 'eye' : 'eye-off'}
                size={19}
                color="#4D6278"
              />
            </TouchableOpacity>
          </View>
          {Boolean(fieldErrors.password) && (
            <Text style={styles.fieldErrorText} accessibilityRole="alert">
              {fieldErrors.password}
            </Text>
          )}
        </View>

        {/* Remember Me & Forgot Password */}
        <View style={styles.optionsRow}>
          <Pressable
            onPress={() => !isSubmitting && setRememberMe((prev) => !prev)}
            style={styles.rememberMeContainer}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: rememberMe, disabled: isSubmitting }}
            accessibilityLabel="Remember Me"
            hitSlop={8}
          >
            <View
              style={[
                styles.checkboxBox,
                rememberMe && styles.checkboxBoxChecked,
              ]}
            >
              {rememberMe && (
                <Feather name="check" size={12} color={COLORS.white} />
              )}
            </View>
            <Text style={styles.rememberMeText}>Keep me signed in</Text>
          </Pressable>

          <TouchableOpacity
            onPress={onForgotPassword}
            disabled={isSubmitting}
            hitSlop={8}
            accessibilityRole="link"
            accessibilityLabel="Forgot Password"
          >
            <Text style={styles.forgotPasswordText}>Forgot Password? ›</Text>
          </TouchableOpacity>
        </View>

        {/* Full-Width Crimson Gradient Login Button */}
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <Pressable
            onPress={handleSubmit}
            onPressIn={animatePressIn}
            onPressOut={animatePressOut}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="Login"
            accessibilityState={{ busy: isSubmitting, disabled: isSubmitting }}
            style={styles.buttonShadowWrapper}
          >
            <LinearGradient
              colors={['#E31135', '#B90024', '#7F0018']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={[styles.loginButton, isSubmitting && styles.loginButtonDisabled]}
            >
              {isSubmitting ? (
                <>
                  <ActivityIndicator size="small" color={COLORS.white} />
                  <Text style={styles.loginButtonText}>Signing In...</Text>
                </>
              ) : (
                <>
                  <Feather name="log-in" size={20} color={COLORS.white} />
                  <Text style={styles.loginButtonText}>Login</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Footer with flanking horizontal rules */}
        <View style={styles.footer}>
          <View style={styles.dividerRule} />
          <Text style={styles.poweredByText}>Powered by Bio Cute Life Care</Text>
          <View style={styles.dividerRule} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderRadius: RADII.card,
    borderWidth: 1.25,
    borderColor: '#DCE6F0',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primaryNavy,
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.14,
        shadowRadius: 28,
      },
      android: {
        elevation: 8,
      },
      default: {
        shadowColor: COLORS.primaryNavy,
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.14,
        shadowRadius: 28,
      },
    }),
  },
  cardBody: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 18,
  },
  cardBodyCompact: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
  },
  headerBlock: {
    alignItems: 'center',
    marginBottom: 18,
  },
  headerBlockCompact: {
    marginBottom: 12,
  },
  shieldDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 5,
  },
  dividerRule: {
    flex: 1,
    height: 1,
    backgroundColor: '#D8E2EC',
  },
  shieldIcon: {
    marginHorizontal: 14,
  },
  secureAccessText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryNavy,
    marginBottom: 8,
  },
  secureAccessTextCompact: {
    marginBottom: 5,
  },
  heading: {
    fontSize: 27,
    fontWeight: '800',
    marginBottom: 5,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  headingCompact: {
    fontSize: 24,
    marginBottom: 3,
  },
  headingAdmin: {
    color: COLORS.primaryNavy,
  },
  headingLogin: {
    color: COLORS.primaryRed,
  },
  subtitle: {
    fontSize: 13.5,
    lineHeight: 19,
    color: COLORS.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  roleSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#EDF5FC',
    borderWidth: 1.2,
    borderColor: COLORS.lightBorder,
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 7,
    alignItems: 'center',
  },
  roleTabActive: {
    backgroundColor: COLORS.primaryNavy,
  },
  roleTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  roleTabTextActive: {
    color: COLORS.white,
  },
  alertError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.errorBackground,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 13,
    marginBottom: 16,
  },
  alertIcon: {
    marginRight: 9,
    marginTop: 1,
  },
  alertErrorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.error,
    fontWeight: '500',
  },
  fieldGroup: {
    marginBottom: 14,
  },
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
  inputWrapperFocused: {
    borderColor: COLORS.secondaryBlue,
  },
  inputWrapperError: {
    backgroundColor: '#FFFAFB',
    borderColor: COLORS.error,
  },
  inputIconLeft: {
    marginRight: 11,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.primaryNavy,
  },
  passwordToggle: {
    paddingLeft: 8,
    paddingVertical: 6,
  },
  fieldErrorText: {
    marginTop: 5,
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.error,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 20,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#96AABF',
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxBoxChecked: {
    backgroundColor: COLORS.primaryNavy,
    borderColor: COLORS.primaryNavy,
  },
  rememberMeText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: COLORS.primaryNavy,
  },
  forgotPasswordText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.primaryRed,
  },
  buttonShadowWrapper: {
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#B90024',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  loginButton: {
    height: 52,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loginButtonDisabled: {
    opacity: 0.85,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 16.5,
    fontWeight: '700',
    letterSpacing: 0.3,
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
