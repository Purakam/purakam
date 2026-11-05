import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authApi from '../api/auth/authApi';
import { setTokenGetter, setOnUnauthorized } from '../api/client';
import { getErrorMessage } from '../api/client';

const AUTH_STORAGE_KEY = 'purakam_auth';

const persistAuth = async (user, token) => {
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, token }));
};

const clearPersistedAuth = async () => {
  await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
};

const useAuthStore = create((set, get) => {
  setTokenGetter(() => get().token);
  setOnUnauthorized(() => {
    if (get().token) get().signOut();
  });

  return {
    user: null,
    token: null,
    isLoading: false,
    isRestoring: true,
    error: null,

    signIn: async (userData) => {
      const token = userData.access_token;
      const user = { ...userData };
      delete user.access_token;
      set({ user, token, error: null });
      await persistAuth(user, token);
    },

    signOut: async () => {
      set({ user: null, token: null, error: null });
      await clearPersistedAuth();
    },

    restoreSession: async () => {
      set({ isRestoring: true, error: null });
      try {
        const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (!stored) return false;

        const { token } = JSON.parse(stored);
        if (!token) return false;

        set({ token });
        const userData = await authApi.getMe();
        const newToken = userData.access_token;
        const user = { ...userData };
        delete user.access_token;
        set({ user, token: newToken });
        await persistAuth(user, newToken);
        return true;
      } catch (error) {
        await clearPersistedAuth();
        set({ user: null, token: null });
        return false;
      } finally {
        set({ isRestoring: false });
      }
    },

    refreshUser: async () => {
      const { token } = get();
      if (!token) return;
      try {
        const userData = await authApi.getMe();
        const newToken = userData.access_token;
        const user = { ...userData };
        delete user.access_token;
        set({ user, token: newToken });
        await persistAuth(user, newToken);
      } catch (error) {
        console.log('Refresh user error:', getErrorMessage(error));
      }
    },

    login: async (email, password) => {
      set({ isLoading: true, error: null });
      try {
        const data = await authApi.login(email, password);
        await get().signIn(data);
        return data;
      } catch (error) {
        const message = getErrorMessage(error, 'Login failed');
        set({ error: message });
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    register: async (payload) => {
      set({ isLoading: true, error: null });
      try {
        const data = await authApi.register(payload);
        return data;
      } catch (error) {
        const message = getErrorMessage(error, 'Registration failed');
        set({ error: message });
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    verifyEmail: async (email, code) => {
      set({ isLoading: true, error: null });
      try {
        const data = await authApi.verifyEmail(email, code);
        await get().signIn(data);
        return data;
      } catch (error) {
        const message = getErrorMessage(error, 'Verification failed');
        set({ error: message });
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    // Forgot/reset password are intentionally NOT auto-signed-in on success:
    // resetPassword only changes the password server-side, so the caller
    // should send the user to a normal login with their new password.
    forgotPassword: async (email) => {
      set({ isLoading: true, error: null });
      try {
        return await authApi.forgotPassword(email);
      } catch (error) {
        const message = getErrorMessage(error, 'Could not send reset code');
        set({ error: message });
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    resetPassword: async (email, code, newPassword) => {
      set({ isLoading: true, error: null });
      try {
        return await authApi.resetPassword(email, code, newPassword);
      } catch (error) {
        const message = getErrorMessage(error, 'Password reset failed');
        set({ error: message });
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    googleLogin: async (payload) => {
      set({ isLoading: true, error: null });
      try {
        const data = await authApi.googleLogin(payload);
        await get().signIn(data);
        return data;
      } catch (error) {
        const message = getErrorMessage(error, 'Google Login failed');
        set({ error: message });
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    updateProfile: async (payload) => {
      set({ isLoading: true, error: null });
      try {
        const data = await authApi.updateProfile(payload);
        const token = get().token;
        const user = { ...data };
        delete user.access_token;
        set({ user });
        await persistAuth(user, token);
        return data;
      } catch (error) {
        const message = getErrorMessage(error, 'Profile update failed');
        set({ error: message });
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },
  };
});



export default useAuthStore;