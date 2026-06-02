import { create } from "zustand";

export const useThemeStore = create((set, get) => ({
  theme: "light",

  setTheme: (newTheme) => {
    set({ theme: "light" });
    get().applyTheme();
  },

  applyTheme: () => {
    const root = document.documentElement;
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
  }
}));
