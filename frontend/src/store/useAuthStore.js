import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCartStore } from './useCartStore';
import { insforge } from '../lib/insforge';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoggedIn: false,
      isLoading: false,

      setAuth: (user, token) => {
        set({ user, token, isLoggedIn: true });
        useCartStore.getState().mergeCart();
      },

      logout: async () => {
        try {
          await insforge.auth.signOut();
        } catch (err) {
          console.error("Logout from InsForge failed:", err);
        }
        set({ user: null, token: null, isLoggedIn: false });
        useCartStore.getState().logoutCart();
        localStorage.removeItem('auth-storage');
      },

      refreshProfile: async () => {
        const { user } = get();
        if (!user) return;
        try {
          const profileRes = await insforge.auth.getProfile(user.id);
          if (profileRes.data) {
            set({ user: profileRes.data });
          }
        } catch (err) {
          console.error("Refresh profile failed:", err);
        }
      },

      initialize: async () => {
        set({ isLoading: true });
        try {
          const { data, error } = await insforge.auth.getCurrentUser();
          if (!error && data?.user) {
            const profileRes = await insforge.auth.getProfile(data.user.id);
            const activeProfile = profileRes.data || data.user;
            set({ user: activeProfile, isLoggedIn: true });
            useCartStore.getState().mergeCart();
          } else {
            set({ user: null, token: null, isLoggedIn: false });
          }
        } catch (err) {
          console.error("Initialize auth failed:", err);
          set({ user: null, token: null, isLoggedIn: false });
        } finally {
          set({ isLoading: false });
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, isLoggedIn: state.isLoggedIn, user: state.user })
    }
  )
);
