import { create } from 'zustand';
import * as partnerApi from '../api/partner/partnerApi';
import * as bookingsApi from '../api/bookings/bookingsApi';
import { getErrorMessage } from '../api/client';
import {
  computePartnerActiveJobs,
  computeEarnings,
} from '../utils/bookings';

const usePartnerStore = create((set, get) => ({
  assignedBookings: [],
  incomingBookings: [],
  isLoading: true,
  incomingLoading: false,
  isUpdatingAvailability: false,
  error: null,
  earnings: { today: 0, weekly: 0, monthly: 0, total: 0, transactions: [] },

  fetchDashboard: async () => {
    set({ isLoading: true, error: null });
    try {
      const [assignedBookings, incomingBookings] = await Promise.all([
        bookingsApi.getBookings(),
        partnerApi.getIncomingBookings(),
      ]);
      const earnings = computeEarnings(assignedBookings);
      set({ assignedBookings, incomingBookings, earnings });
      return { assignedBookings, incomingBookings, earnings };
    } catch (error) {
      set({ error: getErrorMessage(error, 'Failed to load dashboard') });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchIncoming: async () => {
    set({ incomingLoading: true });
    try {
      const incomingBookings = await partnerApi.getIncomingBookings();
      set({ incomingBookings });
      return incomingBookings;
    } catch (error) {
      set({ error: getErrorMessage(error, 'Failed to load incoming requests') });
      throw error;
    } finally {
      set({ incomingLoading: false });
    }
  },

  fetchEarnings: async () => {
    set({ isLoading: true, error: null });
    try {
      const assignedBookings = await bookingsApi.getBookings();
      const earnings = computeEarnings(assignedBookings);
      set({ assignedBookings, earnings });
      return earnings;
    } catch (error) {
      set({ error: getErrorMessage(error, 'Failed to load earnings') });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateAvailability: async (availabilityStatus) => {
    set({ isUpdatingAvailability: true, error: null });
    try {
      await partnerApi.updatePartnerProfile({ availability_status: availabilityStatus });
    } catch (error) {
      set({ error: getErrorMessage(error, 'Failed to update availability') });
      throw error;
    } finally {
      set({ isUpdatingAvailability: false });
    }
  },

  acceptJob: async (bookingId) => {
    try {
      await bookingsApi.updateBookingStatus(bookingId, 'accepted');
      await get().fetchDashboard();
    } catch (error) {
      set({ error: getErrorMessage(error, 'Failed to accept job') });
      throw error;
    }
  },

  declineJob: async (bookingId) => {
    try {
      await bookingsApi.declineBooking(bookingId);
      await get().fetchDashboard();
    } catch (error) {
      set({ error: getErrorMessage(error, 'Failed to decline job') });
      throw error;
    }
  },

  progressJob: async (bookingId, currentStatus, otp) => {
    let nextStatus = '';
    if (currentStatus === 'accepted') nextStatus = 'on_the_way';
    else if (currentStatus === 'on_the_way') nextStatus = 'in_progress';
    else if (currentStatus === 'in_progress') nextStatus = 'completed';

    if (!nextStatus) return;

    try {
      await bookingsApi.updateBookingStatus(bookingId, nextStatus, otp);
      await get().fetchDashboard();
    } catch (error) {
      set({ error: getErrorMessage(error, 'Failed to update job status') });
      throw error;
    }
  },

  getActiveJobs: () => computePartnerActiveJobs(get().assignedBookings),

  getCompletedCount: () =>
    get().assignedBookings.filter((b) => b.status === 'completed').length,

  clear: () =>
    set({
      assignedBookings: [],
      incomingBookings: [],
      earnings: { today: 0, weekly: 0, monthly: 0, total: 0, transactions: [] },
      error: null,
    }),
}));

export default usePartnerStore;
