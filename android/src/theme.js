import { useColorScheme } from 'react-native';
import useThemeStore from './stores/themeStore';

export const LIGHT_COLORS = {
  background: '#F8F6F3',
  surface: '#FFFFFF',
  card: '#FCFBF8',
  border: '#E9E4DB',
  textPrimary: '#161616',
  textSecondary: '#767676',
  textMuted: '#969696',
  primary: '#D8C6B0',
  accent: '#D8C6B0',
  accentDark: '#161616', // Primary buttons text in light mode is dark
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
};

export const DARK_COLORS = {
  background: '#0B0B0B',
  surface: '#121212',
  card: '#181818',
  border: 'rgba(255, 255, 255, 0.06)',
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1A1',
  textMuted: '#666666',
  primary: '#F5F1E8',
  accent: '#F5F1E8',
  accentDark: '#0B0B0B', // Primary buttons text in dark mode is dark
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
};

// Fallback static COLORS for backward compatibility
export const COLORS = DARK_COLORS;

export const SIZES = {
  base: 16,
  radius: 20,
  padding: 24,
};

export const SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.02,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
  elevation: 1,
};

export const ACCENT_PALETTES = {
  gold: {
    light: '#D8C6B0',
    dark: '#F5F1E8',
    textLight: '#161616',
    textDark: '#0B0B0B',
  },
  blue: {
    light: '#2563EB',
    dark: '#3B82F6',
    textLight: '#FFFFFF',
    textDark: '#FFFFFF',
  },
  purple: {
    light: '#7C3AED',
    dark: '#8B5CF6',
    textLight: '#FFFFFF',
    textDark: '#FFFFFF',
  },
  green: {
    light: '#16A34A',
    dark: '#22C55E',
    textLight: '#FFFFFF',
    textDark: '#FFFFFF',
  },
  coral: {
    light: '#E11D48',
    dark: '#F43F5E',
    textLight: '#FFFFFF',
    textDark: '#FFFFFF',
  },
};

export function useTheme() {
  const themeMode = useThemeStore((s) => s.themeMode);
  const accentColor = useThemeStore((s) => s.accentColor) || 'gold';
  const systemScheme = useColorScheme();

  const isDark =
    themeMode === 'system'
      ? systemScheme === 'dark'
      : themeMode === 'dark';

  const baseColors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const palette = ACCENT_PALETTES[accentColor] || ACCENT_PALETTES.gold;
  const primaryVal = isDark ? palette.dark : palette.light;
  const accentTextVal = isDark ? palette.textDark : palette.textLight;

  const colors = {
    ...baseColors,
    primary: primaryVal,
    accent: primaryVal,
    accentDark: accentTextVal,
  };

  return {
    colors,
    isDark,
    themeMode,
    accentColor,
    setThemeMode: useThemeStore.getState().setThemeMode,
    setAccentColor: useThemeStore.getState().setAccentColor,
  };
}
