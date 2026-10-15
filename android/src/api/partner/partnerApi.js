import apiClient from '../client';

export const getIncomingBookings = () =>
  apiClient.get('/partner/incoming-bookings').then((r) => r.data);

export const updatePartnerProfile = (payload) =>
  apiClient.put('/partner/profile', payload).then((r) => r.data);

export const updatePartnerLocation = (latitude, longitude) =>
  apiClient
    .put('/partner/location', { latitude, longitude })
    .then((r) => r.data);
