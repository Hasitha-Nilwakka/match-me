"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type DataMode = "mock" | "real";

type Ctx = {
  mode: DataMode;
  setMode: (m: DataMode) => void;
};

const DataModeContext = createContext<Ctx | undefined>(undefined);

const STORAGE_KEY = "MM_DATA_MODE";

function getDefaultMode(): DataMode {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(STORAGE_KEY) as DataMode | null;
    if (stored === "mock" || stored === "real") return stored;
  }
  const env = process.env.NEXT_PUBLIC_DEFAULT_DATA_MODE;
  return env === "mock" || env === "real" ? env : "real";
}

export function DataModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<DataMode>(getDefaultMode);

  const setMode = (m: DataMode) => {
    setModeState(m);
    try {
      window.localStorage.setItem(STORAGE_KEY, m);
    } catch {}
  };

  // Sync from storage if multiple tabs toggle
  useEffect(() => {
    const handler = () => {
      const v = window.localStorage.getItem(STORAGE_KEY) as DataMode | null;
      if (v && (v === "mock" || v === "real")) setModeState(v);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const value = useMemo(() => ({ mode, setMode }), [mode]);
  return <DataModeContext.Provider value={value}>{children}</DataModeContext.Provider>;
}

export function useDataMode() {
  const ctx = useContext(DataModeContext);
  if (!ctx) throw new Error("useDataMode must be used within DataModeProvider");
  return ctx;
}


