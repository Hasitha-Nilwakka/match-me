"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type DataMode = "real";

type Ctx = {
  mode: DataMode;
  setMode: (m: DataMode) => void;
};

const DataModeContext = createContext<Ctx | undefined>(undefined);

const STORAGE_KEY = "MM_DATA_MODE";

function getDefaultMode(): DataMode {
  return "real";
}

export function DataModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<DataMode>(getDefaultMode);

  const setMode = () => {
    setModeState("real");
    try {
      window.localStorage.setItem(STORAGE_KEY, "real");
    } catch {}
  };

  // Sync from storage if multiple tabs toggle
  useEffect(() => {
    setModeState("real");
  }, []);

  const value = useMemo(() => ({ mode, setMode }), [mode]);
  return <DataModeContext.Provider value={value}>{children}</DataModeContext.Provider>;
}

export function useDataMode() {
  const ctx = useContext(DataModeContext);
  if (!ctx) throw new Error("useDataMode must be used within DataModeProvider");
  return ctx;
}


