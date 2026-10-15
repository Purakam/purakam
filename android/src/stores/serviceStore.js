import { create } from 'zustand';
import * as servicesApi from '../api/services/servicesApi';
import { getErrorMessage } from '../api/client';

const useServiceStore = create((set, get) => ({
  services: [],
  partners: [],
  selectedCategory: '',
  searchQuery: '',
  maxPrice: null,
  sortBy: 'default',
  isLoading: true,
  partnersLoading: true,
  error: null,

  fetchServices: async () => {
    set({ isLoading: true, error: null });
    try {
      const services = await servicesApi.getServices();
      const maxPrice = services.length
        ? Math.max(...services.map((s) => s.base_price))
        : 600;
      set({ services, maxPrice: get().maxPrice ?? maxPrice });
      return services;
    } catch (error) {
      set({ error: getErrorMessage(error, 'Failed to load services') });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPartners: async (category) => {
    set({ partnersLoading: true, error: null });
    try {
      const partners = await servicesApi.getPartners(category);
      set({ partners, selectedCategory: category || '' });
      return partners;
    } catch (error) {
      set({ error: getErrorMessage(error, 'Failed to load partners') });
      throw error;
    } finally {
      set({ partnersLoading: false });
    }
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setMaxPrice: (maxPrice) => set({ maxPrice }),
  setSortBy: (sortBy) => set({ sortBy }),

  getFilteredServices: () => {
    const { services, searchQuery, maxPrice, sortBy } = get();
    let filtered = [...services];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q),
      );
    }

    if (maxPrice != null) {
      filtered = filtered.filter((s) => s.base_price <= maxPrice);
    }

    if (sortBy === 'price-asc') {
      filtered.sort((a, b) => a.base_price - b.base_price);
    } else if (sortBy === 'price-desc') {
      filtered.sort((a, b) => b.base_price - a.base_price);
    } else if (sortBy === 'name-asc') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  },

  clear: () =>
    set({
      services: [],
      partners: [],
      selectedCategory: '',
      searchQuery: '',
      error: null,
    }),
}));

export default useServiceStore;
