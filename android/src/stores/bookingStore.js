import { create } from 'zustand';
import * as bookingsApi from '../api/bookings/bookingsApi';
import { getErrorMessage } from '../api/client';
import {
  isActiveBooking,
  isUpcomingBooking,
  isCompletedBooking,
  isCancelledBooking,
  computeCustomerStats,
} from '../utils/bookings';

const useBookingStore = create((set, get) => ({
  bookings: [],
  isLoading: true,
  isSubmitting: false,
  error: null,
  activeFilter: 'all',

fetchBookings: async () => {
  console.log('FETCH START');

  set({ isLoading: true, error: null });

  try {
    const bookings = await bookingsApi.getBookings();

    console.log('FETCH SUCCESS', bookings);

    set({ bookings });

    return bookings;
  } catch (error) {
    console.log('FETCH ERROR', error);

    set({
      error: getErrorMessage(error, 'Failed to load bookings'),
    });

    throw error;
  } finally {
    console.log('FETCH FINALLY');

    set({ isLoading: false });
  }
},

  createBooking: async (payload) => {
    set({ isSubmitting: true, error: null });
    try {
      const booking = await bookingsApi.createBooking(payload);
      set({ bookings: [booking, ...get().bookings] });
      return booking;
    } catch (error) {
      set({ error: getErrorMessage(error, 'Booking failed') });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  cancelBooking: async (bookingId) => {
    try {
      await bookingsApi.updateBookingStatus(bookingId, 'cancelled');
      await get().fetchBookings();
    } catch (error) {
      set({ error: getErrorMessage(error, 'Cancellation failed') });
      throw error;
    }
  },

  submitReview: async (bookingId, rating, comment) => {
    try {
      await bookingsApi.submitReview({ booking_id: bookingId, rating, comment });
      await get().fetchBookings();
    } catch (error) {
      set({ error: getErrorMessage(error, 'Review submission failed') });
      throw error;
    }
  },

  setActiveFilter: (activeFilter) => set({ activeFilter }),

  getFilteredBookings: () => {
    const { bookings, activeFilter } = get();
    switch (activeFilter) {
      case 'upcoming':
        return bookings.filter(isUpcomingBooking);
      case 'active':
        return bookings.filter(isActiveBooking);
      case 'completed':
        return bookings.filter(isCompletedBooking);
      case 'cancelled':
        return bookings.filter(isCancelledBooking);
      default:
        return bookings;
    }
  },

  getStats: () => computeCustomerStats(get().bookings),

  clear: () => set({ bookings: [], error: null, activeFilter: 'all' }),
}));

export default useBookingStore;
