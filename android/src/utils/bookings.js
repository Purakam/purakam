const ACTIVE_STATUSES = ['requested', 'accepted', 'on_the_way', 'in_progress'];

export const isActiveBooking = (booking) => ACTIVE_STATUSES.includes(booking?.status);

export const isUpcomingBooking = (booking) =>
  ['requested', 'accepted'].includes(booking?.status);

export const isCompletedBooking = (booking) => booking?.status === 'completed';

export const isCancelledBooking = (booking) => booking?.status === 'cancelled';

export const computeCustomerStats = (bookings = []) => ({
  total: bookings.length,
  completed: bookings.filter(isCompletedBooking).length,
  active: bookings.filter(isActiveBooking).length,
  cancelled: bookings.filter(isCancelledBooking).length,
});

export const computePartnerActiveJobs = (bookings = []) =>
  bookings.filter((b) => ['accepted', 'on_the_way', 'in_progress'].includes(b.status));

export const computeEarnings = (bookings = []) => {
  const completed = bookings.filter(isCompletedBooking);
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const sumInRange = (from) =>
    completed
      .filter((b) => {
        const date = new Date(b.created_at || b.booking_date);
        return date >= from;
      })
      .reduce((sum, b) => sum + (b.price || 0), 0);

  const total = completed.reduce((sum, b) => sum + (b.price || 0), 0);

  return {
    today: sumInRange(startOfDay),
    weekly: sumInRange(startOfWeek),
    monthly: sumInRange(startOfMonth),
    total,
    transactions: completed
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
  };
};

export const formatStatus = (status) =>
  (status || 'pending').replace(/_/g, ' ');
