import { MD3LightTheme } from 'react-native-paper';

/**
 * Bio Cute Life Care — Shared Color Palette & Theme Tokens (React Native)
 * Matches shared/theme.js and Web CSS variables identically.
 */
export const COLORS = {
  primaryNavy: '#082D52',
  primaryRed: '#D6002A',
  primaryRedLight: '#EB163F',
  primaryRedDark: '#A80021',
  secondaryBlue: '#1686D9',
  secondaryBlueSoft: 'rgba(22, 134, 217, 0.10)',
  white: '#FFFFFF',
  cardSurface: 'rgba(255, 255, 255, 0.94)',
  lightBorder: '#D5E0EB',
  inputBackground: '#F8FBFE',
  textPrimary: '#082D52',
  textSecondary: '#4E657E',
  textMuted: '#788FA7',
  placeholder: '#889DB3',
  error: '#D6002A',
  errorBackground: '#FFF2F4',
  errorBorder: '#F7C6CF',
  success: '#0E8A50',
  successBackground: '#EEFBF4',
  successBorder: '#BFEAD2',
};

export const RADII = {
  card: 20,
  input: 12,
  button: 12,
  badge: 999,
  checkbox: 5,
};

export const paperTheme = {
  ...MD3LightTheme,
  roundness: 12,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.primaryRed,
    secondary: COLORS.secondaryBlue,
    background: '#EAF3FB',
    surface: COLORS.white,
    outline: COLORS.lightBorder,
    error: COLORS.error,
    onSurface: COLORS.primaryNavy,
  },
};
