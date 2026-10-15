import apiClient from '../client';

export const getServices = () => apiClient.get('/services').then((r) => r.data);

export const getPartners = (category) =>
  apiClient
    .get('/partners', { params: category ? { category } : {} })
    .then((r) => r.data);
