import { create } from 'zustand';
import { wishlistAPI } from '../services/api';
import { toast } from '../components/GlobalToast';

export const useWishlistStore = create((set, get) => ({
  items: [],

  setWishlist: (items) => set({ items }),

  fetchWishlist: async () => {
    try {
      const res = await wishlistAPI.get();
      if (res.success) {
        set({ items: res.wishlist || [] });
      }
    } catch (err) {
      console.error("Failed to fetch wishlist:", err);
      toast.error("Failed to fetch wishlist.");
    }
  },

  addToWishlist: async (product) => {
    const productId = product.id || product._id;
    const exists = get().items.find(item => (item.id || item._id) === productId);
    if (exists) return; // Already in wishlist

    set({ items: [...get().items, product] });
    try {
      await wishlistAPI.toggle(productId);
    } catch (err) {
      console.error("Failed to add to wishlist:", err);
      toast.error("Failed to update wishlist.");
      // Revert on error
      set({ items: get().items.filter(item => (item.id || item._id) !== productId) });
    }
  },

  removeFromWishlist: async (productId) => {
    const product = get().items.find(item => (item.id || item._id) === productId);
    if (!product) return;

    set({ items: get().items.filter(item => (item.id || item._id) !== productId) });
    try {
      await wishlistAPI.toggle(productId);
    } catch (err) {
      console.error("Failed to remove from wishlist in DB:", err);
      toast.error("Failed to update wishlist.");
      // Revert on error
      set({ items: [...get().items, product] });
    }
  },

  isInWishlist: (productId) => {
    return get().items.some(item => (item.id || item._id) === productId);
  },

  clearWishlist: async () => {
    set({ items: [] });
    try {
      await wishlistAPI.clear();
    } catch (err) {
      console.error("Failed to clear wishlist in DB:", err);
      toast.error("Failed to clear wishlist.");
    }
  },

  getWishlistCount: () => get().items.length,
}));
