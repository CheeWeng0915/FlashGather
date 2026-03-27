export const THEME_STORAGE_KEY = "flashgather-theme";

const VALID_THEMES = new Set(["light", "dark"]);

export const getStoredTheme = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return VALID_THEMES.has(storedTheme) ? storedTheme : null;
};

export const getPreferredTheme = () => {
  const storedTheme = getStoredTheme();
  if (storedTheme) {
    return storedTheme;
  }

  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
};

export const applyTheme = (theme) => {
  if (typeof document === "undefined") {
    return;
  }

  const resolvedTheme = VALID_THEMES.has(theme) ? theme : "light";
  const root = document.documentElement;

  root.classList.toggle("dark", resolvedTheme === "dark");
  root.dataset.theme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;
};

export const persistTheme = (theme) => {
  if (typeof window === "undefined") {
    return;
  }

  const resolvedTheme = VALID_THEMES.has(theme) ? theme : "light";
  window.localStorage.setItem(THEME_STORAGE_KEY, resolvedTheme);
};
