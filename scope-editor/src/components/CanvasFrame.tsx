import React from "react";
import type { Viewport } from "../lib/types";
import { VIEWPORT_WIDTHS } from "../lib/types";

export interface CanvasFrameProps {
  activeViewport: Viewport;
  children: React.ReactNode;
  onClearSelection: () => void;
}

export const CanvasFrame: React.FC<CanvasFrameProps> = ({
  activeViewport,
  children,
  onClearSelection,
}) => {
  const isDesktop = activeViewport === "desktop";
  const isTablet = activeViewport === "tablet";
  const isMobile = activeViewport === "mobile";

  const targetWidth = VIEWPORT_WIDTHS[activeViewport];

  return (
    <div
      className="flex-1 w-full h-full overflow-auto bg-zinc-100/90 dark:bg-zinc-950 p-4 md:p-8 flex justify-center items-start transition-colors select-none"
      onClick={onClearSelection}
    >
      <div
        className={`transition-all duration-300 ease-out origin-top flex flex-col items-center ${
          isDesktop
            ? "w-full max-w-[1440px] shadow-sm rounded-none border border-zinc-200/80 dark:border-zinc-800/80"
            : isTablet
            ? "w-[768px] shadow-2xl rounded-2xl border-4 border-zinc-800 bg-zinc-800 my-4"
            : "w-[375px] shadow-2xl rounded-3xl border-8 border-zinc-800 bg-zinc-800 my-4"
        }`}
        style={{
          width: isDesktop ? "100%" : `${targetWidth}px`,
          maxWidth: isDesktop ? "1440px" : undefined,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Device Frame Notch / Top Bezel for Mobile & Tablet */}
        {isMobile && (
          <div className="w-full h-5 bg-zinc-800 flex items-center justify-center shrink-0 select-none">
            <div className="w-16 h-3 bg-zinc-900 rounded-full flex items-center justify-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
              <div className="w-6 h-1 rounded-full bg-zinc-800" />
            </div>
          </div>
        )}

        {isTablet && (
          <div className="w-full h-3 bg-zinc-800 flex items-center justify-center shrink-0 select-none">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
          </div>
        )}

        {/* Content Viewport Frame */}
        <div
          className={`w-full overflow-hidden bg-white text-zinc-900 ${
            isMobile
              ? "rounded-2xl min-h-[667px]"
              : isTablet
              ? "rounded-xl min-h-[1024px]"
              : "min-h-screen"
          }`}
        >
          {children}
        </div>

        {/* Bottom Home Indicator for Mobile */}
        {isMobile && (
          <div className="w-full h-4 bg-zinc-800 flex items-center justify-center shrink-0 select-none">
            <div className="w-24 h-1 bg-zinc-600 rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
};
