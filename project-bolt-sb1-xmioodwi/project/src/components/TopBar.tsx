import type { Viewport } from "../lib/types";
import { VIEWPORT_WIDTHS } from "../lib/types";
import {
  IconDesktop,
  IconTablet,
  IconMobile,
  IconUndo,
  IconRedo,
  IconPlay,
  IconReset,
  IconUpload,
  IconCode,
  IconHistory,
} from "./icons";
import { IconButton, SegmentedControl } from "./ui";

export function TopBar({
  viewport,
  onViewport,
  onUndo,
  onRedo,
  onPreview,
  onReset,
  onPublish,
  onToggleCode,
  onToggleHistory,
  showCode,
  showHistory,
  canUndo,
  canRedo,
}: {
  viewport: Viewport;
  onViewport: (v: Viewport) => void;
  onUndo: () => void;
  onRedo: () => void;
  onPreview: () => void;
  onReset: () => void;
  onPublish: () => void;
  onToggleCode: () => void;
  onToggleHistory: () => void;
  showCode: boolean;
  showHistory: boolean;
  canUndo: boolean;
  canRedo: boolean;
}) {
  return (
    <header className="h-11 shrink-0 bg-canvas-surface border-b border-canvas-line flex items-center px-2 gap-1 select-none">
      {/* Left: brand + menus */}
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-2 px-2">
          <div className="w-5 h-5 rounded-[5px] bg-canvas-ink flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-[2px] border-2 border-white border-t-transparent border-l-transparent" />
          </div>
          <span className="text-ctrl font-semibold text-canvas-ink tracking-tight">Scope</span>
        </div>
        <div className="w-px h-5 bg-canvas-line mx-1" />
        {["File", "Edit", "View"].map((m) => (
          <button
            key={m}
            className="px-2 py-1 rounded-md text-ctrl text-canvas-sub hover:bg-canvas-line2 hover:text-canvas-ink transition-colors-fast focus-ring"
          >
            {m}
          </button>
        ))}
      </div>

      {/* Center: page name */}
      <div className="flex-1 flex justify-center">
        <div className="flex items-center gap-2 px-3 py-1 rounded-md hover:bg-canvas-line2 transition-colors-fast cursor-default">
          <span className="text-ctrl font-medium text-canvas-ink">Nova Studio — Landing</span>
          <span className="text-meta text-canvas-faint">·</span>
          <span className="text-meta text-canvas-faint">Draft</span>
        </div>
      </div>

      {/* Right: viewport + actions */}
      <div className="flex items-center gap-1.5">
        <SegmentedControl
          value={viewport}
          onChange={(v) => onViewport(v as Viewport)}
          options={[
            { label: <IconDesktop size={15} />, value: "desktop", tip: `Desktop · ${VIEWPORT_WIDTHS.desktop}px` },
            { label: <IconTablet size={15} />, value: "tablet", tip: `Tablet · ${VIEWPORT_WIDTHS.tablet}px` },
            { label: <IconMobile size={15} />, value: "mobile", tip: `Mobile · ${VIEWPORT_WIDTHS.mobile}px` },
          ]}
        />
        <div className="w-px h-5 bg-canvas-line mx-0.5" />
        <IconButton tip="Undo (⌘Z)" onClick={onUndo} disabled={!canUndo}>
          <IconUndo size={16} />
        </IconButton>
        <IconButton tip="Redo (⌘⇧Z)" onClick={onRedo} disabled={!canRedo}>
          <IconRedo size={16} />
        </IconButton>
        <div className="w-px h-5 bg-canvas-line mx-0.5" />
        <IconButton tip="Code editor" onClick={onToggleCode} active={showCode}>
          <IconCode size={16} />
        </IconButton>
        <IconButton tip="History" onClick={onToggleHistory} active={showHistory}>
          <IconHistory size={16} />
        </IconButton>
        <div className="w-px h-5 bg-canvas-line mx-0.5" />
        <IconButton tip="Preview" onClick={onPreview}>
          <IconPlay size={15} />
        </IconButton>
        <IconButton tip="Reset" onClick={onReset}>
          <IconReset size={15} />
        </IconButton>
        <button
          onClick={onPublish}
          className="ml-1 inline-flex items-center gap-1.5 px-3 h-7 rounded-md bg-canvas-ink text-white text-ctrl font-medium hover:bg-canvas-ink/90 transition-colors-fast focus-ring"
        >
          <IconUpload size={13} />
          Publish
        </button>
      </div>
    </header>
  );
}
