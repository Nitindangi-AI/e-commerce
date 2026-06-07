import { create } from "zustand";

export const useSearchStore = create((set, get) => ({
  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),
  searchHistory: [],
  logSearch: (query) => {
    const newEntry = { query, timestamp: new Date().toISOString() };
    set({ searchHistory: [newEntry, ...get().searchHistory].slice(0, 50) });
  }
}));
