import apiClient from '../client';

export const login = (email, password) =>
  apiClient.post('/auth/login', { email, password }).then((r) => r.data);

export const register = (payload) =>
  apiClient.post('/auth/register', payload).then((r) => r.data);

export const getMe = () => apiClient.get('/auth/me').then((r) => r.data);

export const verifyEmail = (email, code) =>
  apiClient.post('/auth/verify-email', { email, code }).then((r) => r.data);

export const resendVerification = (email) =>
  apiClient.post('/auth/resend-verification', { email }).then((r) => r.data);

export const forgotPassword = (email) =>
  apiClient.post('/auth/forgot-password', { email }).then((r) => r.data);

export const resetPassword = (email, code, newPassword) =>
  apiClient.post('/auth/reset-password', { email, code, new_password: newPassword }).then((r) => r.data);

// payload: { access_token } in production (verified by the backend with Google),
// or { email, name } for the development-only mock flow.
export const googleLogin = (payload) =>
  apiClient.post('/auth/google', payload).then((r) => r.data);

export const updateProfile = (payload) =>
  apiClient.put('/users/me', payload).then((r) => r.data);