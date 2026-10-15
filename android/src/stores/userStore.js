import { create } from 'zustand';
import * as authApi from '../api/auth/authApi';
import { getErrorMessage } from '../api/client';

const useUserStore = create((set) => ({
  profile: null,
  isLoading: true,
  error: null,

  fetchProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await authApi.getMe();
      const profile = { ...data };
      delete profile.access_token;
      set({ profile });
      return profile;
    } catch (error) {
      set({ error: getErrorMessage(error, 'Failed to load profile') });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  clearProfile: () => set({ profile: null, error: null }),
}));

export default useUserStore;
