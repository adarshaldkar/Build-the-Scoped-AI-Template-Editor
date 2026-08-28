import { useState } from "react";
import type { Revision } from "../lib/types";
import { IconHistory, IconClose, IconArrowRight } from "./icons";

export function HistoryDrawer({
  open,
  history,
  onClose,
  onRestore,
}: {
  open: boolean;
  history: Revision[];
  onClose: () => void;
  onRestore: (r: Revision) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!open) return null;

  return (
    <div className="absolute right-3 top-12 bottom-3 w-[300px] bg-canvas-surface border border-canvas-line rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.08),0_24px_48px_rgba(0,0,0,0.12)] z-40 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-canvas-line flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <IconHistory size={14} className="text-canvas-faint" />
          <span className="text-meta uppercase tracking-wider font-semibold text-canvas-sub">History</span>
        </div>
        <button onClick={onClose} className="text-canvas-faint hover:text-canvas-ink transition-colors-fast">
          <IconClose size={15} />
        </button>
      </div>

      {/* Group label */}
      <div className="px-3.5 pt-3 pb-1 shrink-0">
        <span className="text-meta uppercase tracking-wider text-canvas-faint font-semibold">Today</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scroll-thin">
        {history.map((r) => {
          const isOpen = expanded === r.id;
          return (
            <div key={r.id} className="border-b border-canvas-line2 last:border-0">
              <button
                onClick={() => setExpanded(isOpen ? null : r.id)}
                className="w-full px-3.5 py-2.5 flex items-start gap-2.5 hover:bg-canvas-line2 transition-colors-fast text-left"
              >
                <div className="shrink-0 mt-0.5">
                  <span
                    className={`block w-2 h-2 rounded-full ${
                      r.kind === "ai" ? "bg-canvas-accent" : "bg-canvas-faint"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-ctrl font-medium text-canvas-ink">{r.element}</span>
                    <span className="text-meta text-canvas-faint font-mono">{r.time}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`text-meta font-medium ${
                        r.kind === "ai" ? "text-canvas-accent" : "text-canvas-faint"
                      }`}
                    >
                      {r.kind === "ai" ? "AI Edit" : "Manual Edit"}
                    </span>
                    <span className="text-meta text-canvas-faint">·</span>
                    <span className="text-meta text-canvas-faint capitalize">
                      {r.scope === "all" ? "All Views" : r.scope}
                    </span>
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="px-3.5 pb-3 pl-9">
                  <div className="flex items-start gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-meta uppercase tracking-wider text-canvas-faint font-semibold mb-1">Before</div>
                      <div className="text-ctrl text-canvas-sub bg-canvas-line2 rounded px-2 py-1.5">
                        {r.before}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-meta uppercase tracking-wider text-canvas-faint font-semibold mb-1">After</div>
                      <div className="text-ctrl text-canvas-ink bg-canvas-accentSoft border border-canvas-accent/30 rounded px-2 py-1.5">
                        {r.after}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onRestore(r)}
                    className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md border border-canvas-line text-ctrl text-canvas-sub hover:bg-canvas-line2 hover:text-canvas-ink transition-colors-fast focus-ring"
                  >
                    <IconArrowRight size={13} />
                    Restore
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-3.5 py-2.5 border-t border-canvas-line shrink-0">
        <span className="text-meta text-canvas-faint">{history.length} revisions</span>
      </div>
    </div>
  );
}
