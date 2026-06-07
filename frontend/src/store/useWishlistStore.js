import { create } from 'zustand';
import { wishlistAPI } from '../services/api';
import { toast } from '../components/GlobalToast';

export const useWishlistStore = create((set, get) => ({
  wishlistItems: [],

  setWishlist: (items) => set({ wishlistItems: items }),

  fetchWishlist: async () => {
    try {
      const res = await wishlistAPI.get();
      if (res.success) {
        set({ wishlistItems: res.wishlist || [] });
      }
    } catch (err) {
      console.error("Failed to fetch wishlist:", err);
      toast.error("Failed to fetch wishlist.");
    }
  },

  toggleWishlist: async (product) => {
    const productId = product.id || product._id;
    const exists = get().wishlistItems.find(item => (item.id || item._id) === productId);
    
    // Optimistic update
    if (exists) {
      set({ wishlistItems: get().wishlistItems.filter(item => (item.id || item._id) !== productId) });
    } else {
      set({ wishlistItems: [...get().wishlistItems, product] });
    }

    try {
      await wishlistAPI.toggle(productId);
    } catch (err) {
      console.error("Failed to toggle wishlist in DB:", err);
      toast.error("Failed to update wishlist.");
      // Revert on error
      if (exists) {
        set({ wishlistItems: [...get().wishlistItems, product] });
      } else {
        set({ wishlistItems: get().wishlistItems.filter(item => (item.id || item._id) !== productId) });
      }
    }
  },

  isInWishlist: (productId) => {
    return get().wishlistItems.some(item => (item.id || item._id) === productId);
  },

  clearWishlist: async () => {
    set({ wishlistItems: [] });
    try {
      await wishlistAPI.clear();
    } catch (err) {
      console.error("Failed to clear wishlist in DB:", err);
      toast.error("Failed to clear wishlist.");
    }
  },

  getWishlistCount: () => get().wishlistItems.length,
}));
