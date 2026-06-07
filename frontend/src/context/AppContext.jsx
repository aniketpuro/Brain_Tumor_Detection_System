import { createContext, useContext, useReducer, useEffect } from "react";

const AppContext = createContext(null);

const STORAGE_KEY_HISTORY = "neuroscan_history";
const STORAGE_KEY_DARK = "neuroscan_dark";
const MAX_HISTORY = 50;

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

const initialState = {
  darkMode: loadFromStorage(STORAGE_KEY_DARK, false),
  scanHistory: loadFromStorage(STORAGE_KEY_HISTORY, []),
};

function appReducer(state, action) {
  switch (action.type) {
    case "TOGGLE_DARK_MODE":
      return { ...state, darkMode: !state.darkMode };
    case "ADD_SCAN": {
      const updated = [action.payload, ...state.scanHistory].slice(0, MAX_HISTORY);
      return { ...state, scanHistory: updated };
    }
    case "REMOVE_SCAN":
      return {
        ...state,
        scanHistory: state.scanHistory.filter((s) => s.id !== action.payload),
      };
    case "CLEAR_HISTORY":
      return { ...state, scanHistory: [] };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    const root = document.documentElement;
    if (state.darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem(STORAGE_KEY_DARK, JSON.stringify(state.darkMode));
  }, [state.darkMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(state.scanHistory));
    } catch {
      // localStorage quota exceeded — drop oldest entries and retry
      const trimmed = state.scanHistory.slice(0, 10);
      try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(trimmed));
      } catch {
        // give up silently
      }
    }
  }, [state.scanHistory]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
