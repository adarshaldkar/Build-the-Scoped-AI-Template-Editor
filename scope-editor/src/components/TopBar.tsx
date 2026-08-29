import React, { useEffect, useRef, useState } from "react";
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
  IconCheck,
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
  layersOpen: boolean;
  onToggleLayers: () => void;
  inspectorOpen: boolean;
  onToggleInspector: () => void;
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
}) => {
  const [activeMenu, setActiveMenu] = useState<"file" | "edit" | "view" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    if (activeMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [activeMenu]);

  return (
    <header className="h-12 shrink-0 bg-[#fbfbfa] border-b border-zinc-200 text-zinc-900 flex items-center justify-between px-2 sm:px-3 gap-1 sm:gap-2 select-none relative z-40 w-full min-w-0">
      {/* Left Section: Brand, Layers Toggle & File/Edit/View Menus */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0" ref={menuRef}>
        {/* Toggle Layers Sidebar Button */}
        <button
          type="button"
          onClick={onToggleLayers}
          title={layersOpen ? "Hide Layers Panel" : "Show Layers Panel"}
          className={`p-1.5 rounded-md border transition-all ${
            layersOpen
              ? "bg-zinc-900 text-white border-zinc-900 shadow-sm"
              : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100"
          }`}
        >
          <IconLayers size={14} />
        </button>

        {/* Brand Title */}
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-zinc-900 text-white flex items-center justify-center text-[9px] sm:text-[10px] font-bold shadow-sm">
            S
          </div>
          <span className="text-xs sm:text-sm font-semibold tracking-tight hidden xs:inline">Scope</span>
        </div>

        {/* Studio Menus: File, Edit, View (Hidden on very narrow mobile screens) */}
        <nav className="hidden md:flex items-center gap-0.5 text-xs text-zinc-600 ml-1 relative">
          {/* File Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveMenu(activeMenu === "file" ? null : "file")}
              className={`px-2 py-1 rounded-md transition-colors ${
                activeMenu === "file"
                  ? "bg-zinc-200 text-zinc-900 font-semibold"
                  : "hover:bg-zinc-100 text-zinc-600"
              }`}
            >
              File
            </button>
            {activeMenu === "file" && (
              <div className="absolute top-full left-0 mt-1.5 w-52 bg-white rounded-lg border border-zinc-200 shadow-xl py-1 z-50 text-xs text-zinc-700 animate-fade-in">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-100">
                  Document Actions
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu(null);
                    onToggleCodeEditor();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-zinc-50 flex items-center justify-between"
                >
                  <span>Export HTML Code...</span>
                  <span className="text-[10px] text-zinc-400 font-mono">⌘K</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu(null);
                    onToggleHistory();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-zinc-50 flex items-center justify-between"
                >
                  <span>Audit History...</span>
                </button>
                <div className="my-1 border-t border-zinc-100"></div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu(null);
                    onReset();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 font-medium"
                >
                  Reset Template...
                </button>
                <div className="my-1 border-t border-zinc-100"></div>
                <div className="px-3 py-1 text-[10px] text-zinc-400">
                  Revision {revision} · {saved ? "Auto-saved" : "Modified"}
                </div>
              </div>
            )}
          </div>

          {/* Edit Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveMenu(activeMenu === "edit" ? null : "edit")}
              className={`px-2 py-1 rounded-md transition-colors ${
                activeMenu === "edit"
                  ? "bg-zinc-200 text-zinc-900 font-semibold"
                  : "hover:bg-zinc-100 text-zinc-600"
              }`}
            >
              Edit
            </button>
            {activeMenu === "edit" && (
              <div className="absolute top-full left-0 mt-1.5 w-52 bg-white rounded-lg border border-zinc-200 shadow-xl py-1 z-50 text-xs text-zinc-700 animate-fade-in">
                <button
                  type="button"
                  disabled={!canUndo}
                  onClick={() => {
                    setActiveMenu(null);
                    onUndo();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-zinc-50 flex items-center justify-between disabled:opacity-40 disabled:hover:bg-white"
                >
                  <span>Undo</span>
                  <span className="text-[10px] text-zinc-400 font-mono">⌘Z</span>
                </button>
                <button
                  type="button"
                  disabled={!canRedo}
                  onClick={() => {
                    setActiveMenu(null);
                    onRedo();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-zinc-50 flex items-center justify-between disabled:opacity-40 disabled:hover:bg-white"
                >
                  <span>Redo</span>
                  <span className="text-[10px] text-zinc-400 font-mono">⌘⇧Z</span>
                </button>
                <div className="my-1 border-t border-zinc-100"></div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu(null);
                    onToggleAssistant();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-zinc-50 flex items-center justify-between"
                >
                  <span>AI Assistant...</span>
                  <span className="text-[10px] text-zinc-400 font-mono">⌘/</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu(null);
                    onToggleCodeEditor();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-zinc-50 flex items-center justify-between"
                >
                  <span>HTML Code Editor...</span>
                  <span className="text-[10px] text-zinc-400 font-mono">⌘K</span>
                </button>
              </div>
            )}
          </div>

          {/* View Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveMenu(activeMenu === "view" ? null : "view")}
              className={`px-2 py-1 rounded-md transition-colors ${
                activeMenu === "view"
                  ? "bg-zinc-200 text-zinc-900 font-semibold"
                  : "hover:bg-zinc-100 text-zinc-600"
              }`}
            >
              View
            </button>
            {activeMenu === "view" && (
              <div className="absolute top-full left-0 mt-1.5 w-56 bg-white rounded-lg border border-zinc-200 shadow-xl py-1 z-50 text-xs text-zinc-700 animate-fade-in">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-100">
                  Viewport Mode
                </div>
                {(["desktop", "tablet", "mobile"] as Viewport[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      setActiveMenu(null);
                      onViewportChange(v);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-zinc-50 flex items-center justify-between"
                  >
                    <span>{v === "desktop" ? "Desktop (1440px)" : v === "tablet" ? "Tablet (768px)" : "Mobile (375px)"}</span>
                    {activeViewport === v && <IconCheck size={13} className="text-blue-600" />}
                  </button>
                ))}
                <div className="my-1 border-t border-zinc-100"></div>
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-100">
                  Panels & Drawers
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu(null);
                    onToggleLayers();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-zinc-50 flex items-center justify-between"
                >
                  <span>Layers Panel</span>
                  {layersOpen && <IconCheck size={13} className="text-blue-600" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu(null);
                    onToggleInspector();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-zinc-50 flex items-center justify-between"
                >
                  <span>Property Inspector</span>
                  {inspectorOpen && <IconCheck size={13} className="text-blue-600" />}
                </button>
              </div>
            )}
          </div>
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
                title={`Switch to ${v} viewport`}
                className={`flex items-center gap-1 px-2 sm:px-2.5 h-6 sm:h-7 rounded-md text-[10px] sm:text-[11px] font-medium transition-all ${
                  isActive
                    ? "bg-white text-zinc-900 shadow-sm border border-zinc-200/50 font-semibold"
                    : "text-zinc-500 hover:text-zinc-800 hover:bg-white/50"
                }`}
              >
                <I size={12} className="sm:size-[13px]" />
                <span className="hidden sm:inline">{v[0].toUpperCase() + v.slice(1)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Section: Tools, History, Inspector Toggle */}
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        <span className="hidden lg:inline-block text-[10px] font-mono text-zinc-400 mr-1.5 bg-zinc-100/70 border border-zinc-200/60 px-2 py-0.5 rounded-full">
          Rev {revision} · {saved ? "Saved" : "Unsaved"}
        </span>

        <button
          title="Undo (⌘Z)"
          disabled={!canUndo}
          onClick={onUndo}
          className="p-1 sm:p-1.5 rounded-md text-zinc-600 hover:bg-zinc-100 disabled:opacity-25 transition-colors"
        >
          <IconUndo size={13} className="sm:size-[14px]" />
        </button>

        <button
          title="Redo (⌘⇧Z)"
          disabled={!canRedo}
          onClick={onRedo}
          className="p-1 sm:p-1.5 rounded-md text-zinc-600 hover:bg-zinc-100 disabled:opacity-25 transition-colors"
        >
          <IconRedo size={13} className="sm:size-[14px]" />
        </button>

        <div className="w-[1px] h-3.5 bg-zinc-200 mx-0.5 hidden xs:block"></div>

        <button
          title="Open HTML Code Editor (⌘K)"
          onClick={onToggleCodeEditor}
          className="p-1 sm:p-1.5 rounded-md text-zinc-600 hover:bg-zinc-100 transition-colors"
        >
          <IconCode size={13} className="sm:size-[14px]" />
        </button>

        <button
          title="Open AI Assistant (⌘/)"
          onClick={onToggleAssistant}
          className="flex items-center gap-1 px-2 sm:px-2.5 h-6 sm:h-7 rounded-md border border-zinc-200/80 bg-white text-[11px] sm:text-xs font-medium text-zinc-700 hover:bg-zinc-50 shadow-sm transition-colors"
        >
          <span>Assistant</span>
        </button>

        <button
          title="Audit History"
          onClick={onToggleHistory}
          className="hidden sm:inline-flex p-1.5 rounded-md text-zinc-600 hover:bg-zinc-100 transition-colors"
        >
          <IconHistory size={14} />
        </button>

        <button
          title="Reset template"
          onClick={onReset}
          className="hidden sm:inline-flex p-1.5 rounded-md text-zinc-600 hover:bg-zinc-100 hover:text-rose-600 transition-colors"
        >
          <IconRotateCcw size={14} />
        </button>

        {/* Toggle Inspector Sidebar Button */}
        <button
          type="button"
          onClick={onToggleInspector}
          title={inspectorOpen ? "Hide Inspector Panel" : "Show Inspector Panel"}
          className={`p-1.5 rounded-md border transition-all ${
            inspectorOpen
              ? "bg-zinc-900 text-white border-zinc-900 shadow-sm"
              : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100"
          }`}
        >
          <IconSliders size={14} />
        </button>
      </div>
    </header>
  );
};
