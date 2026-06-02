import { create } from 'zustand';

export const useRecentlyViewedStore = create((set, get) => ({
  recentItems: [],

  addToRecentlyViewed: (product) => set((state) => {
    const filtered = state.recentItems.filter(item => item.id !== product.id);
    return { recentItems: [product, ...filtered].slice(0, 10) };
  }),

  getRecentItems: () => get().recentItems,
}));
