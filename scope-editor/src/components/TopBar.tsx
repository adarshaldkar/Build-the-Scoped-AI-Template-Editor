import React from "react";
import type { Viewport } from "../lib/types";
import {
  IconCode,
  IconDesktop,
  IconHistory,
  IconMobile,
  IconRedo,
  IconRotateCcw,
  IconTablet,
  IconUndo,
  IconLayers,
  IconSliders,
} from "./icons";

interface Props {
  revision: number;
  activeViewport: Viewport;
  onViewportChange: (v: Viewport) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onToggleCodeEditor: () => void;
  onToggleAssistant: () => void;
  onToggleHistory: () => void;
  onReset: () => void;
  saved: boolean;
  layersOpen?: boolean;
  onToggleLayers?: () => void;
  inspectorOpen?: boolean;
  onToggleInspector?: () => void;
}

export const TopBar: React.FC<Props> = ({
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
  onReset,
  saved,
  layersOpen,
  onToggleLayers,
  inspectorOpen,
  onToggleInspector,
}) => (
  <header className="h-12 shrink-0 bg-[#fbfbfa] border-b border-zinc-200 text-zinc-900 flex items-center justify-between px-3 gap-2 overflow-x-auto custom-scrollbar select-none">
    {/* Left Section: Brand & Sidebar Toggles */}
    <div className="flex items-center gap-2 shrink-0">
      {/* Mobile/Tablet Layers Toggle */}
      {onToggleLayers && (
        <button
          type="button"
          onClick={onToggleLayers}
          title="Toggle Layers panel"
          className={`lg:hidden p-1.5 rounded-md border transition-colors ${
            layersOpen
              ? "bg-zinc-800 text-white border-zinc-800"
              : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
          }`}
        >
          <IconLayers size={14} />
        </button>
      )}

      {/* Brand logo & title */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-zinc-900 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
          S
        </div>
        <span className="text-sm font-semibold tracking-tight">Scope</span>
        <span className="text-zinc-300 hidden sm:inline">/</span>
        <span className="text-xs text-zinc-500 hidden sm:inline font-medium">NOVA Studio</span>
      </div>

      {/* Menu items on wider screens */}
      <nav className="hidden xl:flex items-center gap-0.5 text-xs text-zinc-500 ml-2">
        <button className="px-2 py-1 rounded hover:bg-zinc-100 transition-colors">File</button>
        <button className="px-2 py-1 rounded hover:bg-zinc-100 transition-colors">Edit</button>
        <button className="px-2 py-1 rounded hover:bg-zinc-100 transition-colors">View</button>
      </nav>
    </div>

    {/* Center Section: Viewport Switcher */}
    <div className="flex items-center justify-center shrink-0">
      <div className="inline-flex rounded-lg border border-zinc-200/80 bg-zinc-100/60 p-0.5 shadow-inner">
        {(["desktop", "tablet", "mobile"] as Viewport[]).map((v) => {
          const I = v === "desktop" ? IconDesktop : v === "tablet" ? IconTablet : IconMobile;
          const isActive = activeViewport === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onViewportChange(v)}
              className={`flex items-center gap-1.5 px-2.5 h-7 rounded-md text-[11px] font-medium transition-all ${
                isActive
                  ? "bg-white text-zinc-900 shadow-sm border border-zinc-200/50 font-semibold"
                  : "text-zinc-500 hover:text-zinc-800 hover:bg-white/50"
              }`}
            >
              <I size={13} />
              <span className="hidden sm:inline">{v[0].toUpperCase() + v.slice(1)}</span>
            </button>
          );
        })}
      </div>
    </div>

    {/* Right Section: Revision Status, Tools & Actions */}
    <div className="flex items-center gap-1 shrink-0">
      <span className="hidden md:inline-block text-[10px] font-mono text-zinc-400 mr-2 bg-zinc-100/70 border border-zinc-200/60 px-2 py-0.5 rounded-full">
        Rev {revision} · {saved ? "Saved" : "Unsaved"}
      </span>

      <button
        title="Undo (⌘Z)"
        disabled={!canUndo}
        onClick={onUndo}
        className="p-1.5 rounded-md text-zinc-600 hover:bg-zinc-100 disabled:opacity-25 transition-colors"
      >
        <IconUndo size={14} />
      </button>

      <button
        title="Redo (⌘⇧Z)"
        disabled={!canRedo}
        onClick={onRedo}
        className="p-1.5 rounded-md text-zinc-600 hover:bg-zinc-100 disabled:opacity-25 transition-colors"
      >
        <IconRedo size={14} />
      </button>

      <div className="w-[1px] h-4 bg-zinc-200 mx-0.5"></div>

      <button
        title="Open HTML Code Editor (⌘K)"
        onClick={onToggleCodeEditor}
        className="p-1.5 rounded-md text-zinc-600 hover:bg-zinc-100 transition-colors"
      >
        <IconCode size={14} />
      </button>

      <button
        title="Open AI Assistant (⌘/)"
        onClick={onToggleAssistant}
        className="flex items-center gap-1 px-2.5 h-7 rounded-md border border-zinc-200/80 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50 shadow-sm transition-colors"
      >
        <span>Assistant</span>
      </button>

      <button
        title="Audit History"
        onClick={onToggleHistory}
        className="p-1.5 rounded-md text-zinc-600 hover:bg-zinc-100 transition-colors"
      >
        <IconHistory size={14} />
      </button>

      <button
        title="Reset project"
        onClick={onReset}
        className="p-1.5 rounded-md text-zinc-600 hover:bg-zinc-100 hover:text-rose-600 transition-colors"
      >
        <IconRotateCcw size={14} />
      </button>

      {/* Mobile/Tablet Inspector Toggle */}
      {onToggleInspector && (
        <button
          type="button"
          onClick={onToggleInspector}
          title="Toggle Properties Inspector"
          className={`lg:hidden ml-1 p-1.5 rounded-md border transition-colors ${
            inspectorOpen
              ? "bg-zinc-800 text-white border-zinc-800"
              : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
          }`}
        >
          <IconSliders size={14} />
        </button>
      )}
    </div>
  </header>
);
