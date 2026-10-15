import { create } from 'zustand';

export const useNotificationStore = create((set, get) => ({
  toast: null, // { type: 'success' | 'warning' | 'error' | 'info', title, description }
  dialog: null, // { icon: 'trash' | 'warning' | 'logout' | 'info', title, description, primaryText, secondaryText, onConfirm, onCancel, primaryAccent }
  successModal: null, // { title, description, badgeText, onConfirm }
  toastTimeout: null,

  showSuccessModal: (title, description, badgeText = 'SUCCESS', onConfirm) => {
    set({ successModal: { title, description, badgeText, onConfirm } });
  },

  dismissSuccessModal: () => {
    const current = get().successModal;
    set({ successModal: null });
    if (current && current.onConfirm) {
      current.onConfirm();
    }
  },


  showToast: (type, title, description) => {
    // Clear any previous auto-dismiss timeouts
    const existingTimeout = get().toastTimeout;
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(() => {
      get().dismissToast();
    }, 3000);

    set({
      toast: { type, title, description },
      toastTimeout: timeout,
    });
  },

  dismissToast: () => {
    const existingTimeout = get().toastTimeout;
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    set({ toast: null, toastTimeout: null });
  },

  showDialog: (dialogConfig) => {
    set({ dialog: dialogConfig });
  },

  dismissDialog: () => {
    set({ dialog: null });
  },
}));
