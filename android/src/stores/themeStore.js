import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = 'purakam_theme_mode';
const ACCENT_STORAGE_KEY = 'purakam_accent_color';

const useThemeStore = create((set) => ({
  themeMode: 'dark', // 'light' | 'dark' | 'system'
  accentColor: 'gold', // 'gold' | 'blue' | 'purple' | 'green' | 'coral'

  setThemeMode: async (themeMode) => {
    set({ themeMode });
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch (e) {
      console.log('Error saving theme mode:', e);
    }
  },

  setAccentColor: async (accentColor) => {
    set({ accentColor });
    try {
      await AsyncStorage.setItem(ACCENT_STORAGE_KEY, accentColor);
    } catch (e) {
      console.log('Error saving accent color:', e);
    }
  },

  initTheme: async () => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedMode) {
        set({ themeMode: savedMode });
      }
      const savedAccent = await AsyncStorage.getItem(ACCENT_STORAGE_KEY);
      if (savedAccent) {
        set({ accentColor: savedAccent });
      }
    } catch (e) {
      console.log('Error loading theme settings:', e);
    }
  },
}));

export default useThemeStore;
