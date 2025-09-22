"use client";
import { useDataMode } from "../context/DataModeContext";

export default function DataModeToggle() {
  const { mode, setMode } = useDataMode();
  const isMock = mode === "mock";
  return (
    <div className="flex items-center gap-2">
      <span className={`px-2 py-1 rounded text-xs font-medium ${isMock ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>
        {isMock ? "Mock" : "Live"}
      </span>
      <button
        onClick={() => setMode(isMock ? "real" : "mock")}
        className="text-sm text-gray-600 hover:text-gray-900 underline"
        title="Toggle data mode"
      >
        Switch to {isMock ? "Live" : "Mock"}
      </button>
    </div>
  );
}


