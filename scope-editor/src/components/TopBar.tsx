import React from "react";
import type { Viewport } from "../lib/types";
import {
  IconDesktop,
  IconTablet,
  IconMobile,
  IconCode,
  IconSparkles,
  IconUndo,
  IconRedo,
  IconHistory,
} from "./icons";

export interface TopBarProps {
  revision: number;
  activeViewport: Viewport;
  onViewportChange: (viewport: Viewport) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onToggleCodeEditor: () => void;
  onToggleAssistant: () => void;
  onToggleHistory: () => void;
  isCodeEditorOpen: boolean;
  isAssistantOpen: boolean;
  isHistoryOpen: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  revision,
  activeViewport,
  onViewportChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onToggleCodeEditor,
  onToggleAssistant,
  onToggleHistory,
  isCodeEditorOpen,
  isAssistantOpen,
  isHistoryOpen,
}) => {
  return (
    <header className="h-14 bg-zinc-950 border-b border-zinc-800/80 px-4 flex items-center justify-between select-none shrink-0 z-30 font-sans">
      {/* Left: Brand & Template Metadata */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-xs tracking-wider shadow-sm">
            S
          </div>
          <span className="font-bold text-sm text-zinc-100 tracking-tight">
            SCOPE
          </span>
        </div>

        <div className="h-4 w-px bg-zinc-800" />

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-300">
            NOVA Creative Studio
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400">
            Rev {revision}
          </span>
        </div>
      </div>

      {/* Center: Viewport Switcher */}
      <div className="flex items-center bg-zinc-900/90 border border-zinc-800/80 p-0.5 rounded-lg">
        <button
          type="button"
          onClick={() => onViewportChange("desktop")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            activeViewport === "desktop"
              ? "bg-zinc-800 text-zinc-100 shadow-xs"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
          title="Desktop View (1440px)"
        >
          <IconDesktop size={14} />
          <span>Desktop</span>
        </button>

        <button
          type="button"
          onClick={() => onViewportChange("tablet")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            activeViewport === "tablet"
              ? "bg-zinc-800 text-zinc-100 shadow-xs"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
          title="Tablet View (768px)"
        >
          <IconTablet size={14} />
          <span>Tablet</span>
        </button>

        <button
          type="button"
          onClick={() => onViewportChange("mobile")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            activeViewport === "mobile"
              ? "bg-zinc-800 text-zinc-100 shadow-xs"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
          title="Mobile View (375px)"
        >
          <IconMobile size={14} />
          <span>Mobile</span>
        </button>
      </div>

      {/* Right: Actions & Tools */}
      <div className="flex items-center gap-2">
        {/* Undo / Redo */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800/80 rounded-lg p-0.5 mr-1">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Undo (⌘Z)"
          >
            <IconUndo size={14} />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Redo (⌘⇧Z)"
          >
            <IconRedo size={14} />
          </button>
        </div>

        {/* Code Editor Toggle */}
        <button
          type="button"
          onClick={onToggleCodeEditor}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            isCodeEditorOpen
              ? "bg-zinc-800 border-zinc-700 text-zinc-100 shadow-xs"
              : "bg-zinc-900 border-zinc-800/80 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/60"
          }`}
          title="Toggle Code Editor (⌘K)"
        >
          <IconCode size={14} />
          <span>Code</span>
        </button>

        {/* AI Assistant Toggle */}
        <button
          type="button"
          onClick={onToggleAssistant}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            isAssistantOpen
              ? "bg-blue-600 border-blue-500 text-white shadow-xs"
              : "bg-zinc-900 border-zinc-800/80 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/60"
          }`}
          title="Toggle AI Assistant (⌘/)"
        >
          <IconSparkles size={14} />
          <span>Assistant</span>
        </button>

        {/* History Drawer Toggle */}
        <button
          type="button"
          onClick={onToggleHistory}
          className={`p-2 rounded-lg text-xs font-medium border transition-all ${
            isHistoryOpen
              ? "bg-zinc-800 border-zinc-700 text-zinc-100"
              : "bg-zinc-900 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
          }`}
          title="Audit Revision History"
        >
          <IconHistory size={14} />
        </button>
      </div>
    </header>
  );
};
