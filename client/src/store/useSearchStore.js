import { create } from "zustand";

export const useSearchStore = create((set) => ({
  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),
}));
