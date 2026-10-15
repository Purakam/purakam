import apiClient from '../client';

export const getBookings = () => apiClient.get('/bookings').then((r) => r.data);

export const createBooking = (payload) =>
  apiClient.post('/bookings', payload).then((r) => r.data);

export const updateBookingStatus = (bookingId, newStatus, otp) => {
  const params = { new_status: newStatus };
  if (otp) params.otp = otp;
  return apiClient
    .put(`/bookings/${bookingId}/status`, null, { params })
    .then((r) => r.data);
};

export const declineBooking = (bookingId) =>
  apiClient.post(`/bookings/${bookingId}/decline`).then((r) => r.data);

export const createPaymentOrder = (bookingId) =>
  apiClient.post(`/bookings/${bookingId}/order`).then((r) => r.data);

export const verifyPayment = (bookingId, paymentData) =>
  apiClient
    .post(`/bookings/${bookingId}/verify-payment`, paymentData)
    .then((r) => r.data);

export const submitReview = (payload) =>
  apiClient.post('/reviews', payload).then((r) => r.data);

export const getMessages = (bookingId) =>
  apiClient.get(`/bookings/${bookingId}/messages`).then((r) => r.data);

export const sendMessage = (bookingId, messageText) =>
  apiClient
    .post(`/bookings/${bookingId}/messages`, { message_text: messageText })
    .then((r) => r.data);
