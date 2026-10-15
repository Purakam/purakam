import axios from 'axios';
import Constants from 'expo-constants';

const expoExtra =
  (Constants.manifest && Constants.manifest.extra) ||
  (Constants.expoConfig && Constants.expoConfig.extra) ||
  {};

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  expoExtra.apiUrl ||
  'http://127.0.0.1:8000/api';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

let tokenGetter = () => null;
let onUnauthorized = () => {};

export const setTokenGetter = (getter) => {
  tokenGetter = getter;
};

export const setOnUnauthorized = (handler) => {
  onUnauthorized = handler;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldRetry = (error) => {
  if (!error.response) return true;
  const status = error.response.status;
  return status >= 500 || status === 429;
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = tokenGetter();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    if (error.response?.status === 401) {
      onUnauthorized();
    }

    if (!config || config.__retryCount >= MAX_RETRIES || !shouldRetry(error)) {
      return Promise.reject(error);
    }

    config.__retryCount = (config.__retryCount || 0) + 1;
    await sleep(RETRY_DELAY_MS * config.__retryCount);
    return apiClient(config);
  },
);

export const getErrorMessage = (error, fallback = 'Something went wrong') => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d) => d.msg || d).join(', ');
  return error?.message || fallback;
};

export default apiClient;
