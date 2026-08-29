import React from "react";
import type { Viewport } from "../lib/types";
import { VIEWPORT_WIDTHS } from "../lib/types";

interface Props {
  activeViewport: Viewport;
  onClearSelection: () => void;
  onCanvasClick?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

export const CanvasFrame: React.FC<Props> = ({
  activeViewport,
  onClearSelection,
  onCanvasClick,
  children,
}) => {
  const width =
    activeViewport === "desktop"
      ? "min(100%, 1440px)"
      : `min(100%, ${VIEWPORT_WIDTHS[activeViewport]}px)`;

  return (
    <div
      className="w-full h-full flex-1 overflow-y-auto overflow-x-hidden bg-[#efede8] p-2 sm:p-4 md:p-6 select-auto"
      onClick={onCanvasClick}
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <div className="min-h-full w-full flex justify-center items-start pb-24">
        <div
          className={`relative bg-white max-w-full transition-[width] duration-200 ${
            activeViewport === "mobile"
              ? "rounded-[24px] sm:rounded-[28px] p-1.5 sm:p-2 shadow-2xl border border-zinc-300 mb-12"
              : activeViewport === "tablet"
              ? "rounded-xl sm:rounded-2xl shadow-xl p-1.5 border border-zinc-300 mb-12"
              : "border border-zinc-300 shadow-sm mb-16"
          }`}
          style={{
            width,
            minHeight: activeViewport === "mobile" ? "640px" : "900px",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {activeViewport !== "desktop" && (
            <div className="h-6 flex items-center justify-center text-[10px] font-mono text-zinc-400 select-none border-b border-zinc-100 mb-1">
              {activeViewport === "mobile" ? "Mobile Viewport (375px)" : "Tablet Viewport (768px)"}
            </div>
          )}
          <div
            className="canvas-frame relative bg-white w-full overflow-hidden"
            onClick={(e) => {
              if (e.target === e.currentTarget) onClearSelection();
              onCanvasClick?.(e);
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
