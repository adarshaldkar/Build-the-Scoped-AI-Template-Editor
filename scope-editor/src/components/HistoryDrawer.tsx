import React, { useState, useMemo } from "react";
import type { RevisionEntry, TemplateModel, ElementNode, EditCommand, ValidationError } from "../lib/types";
import { filterHistoryEntries, createForwardRestoreCommand } from "../lib/historyManager";
import { IconHistory, IconClose, IconRotateCcw } from "./icons";

export interface HistoryDrawerProps {
  model: TemplateModel;
  history: RevisionEntry[];
  selectedNode: ElementNode | null;
  isOpen: boolean;
  onClose: () => void;
  onCommitCommand: (command: EditCommand) => { success: boolean; error?: ValidationError };
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  model,
  history,
  selectedNode,
  isOpen,
  onClose,
  onCommitCommand,
}) => {
  const [filterKind, setFilterKind] = useState<"all" | "ai" | "manual">("all");
  const [filterSelectedOnly, setFilterSelectedOnly] = useState<boolean>(false);

  // Compute filtered entries in reverse chronological order (newest first)
  const filteredEntries = useMemo(() => {
    const reversed = [...history].reverse();
    return filterHistoryEntries(reversed, {
      selectedElementId: filterSelectedOnly && selectedNode ? selectedNode.id : undefined,
      kind: filterKind,
    });
  }, [history, selectedNode, filterSelectedOnly, filterKind]);

  if (!isOpen) return null;

  const handleRestore = (entry: RevisionEntry) => {
    const restoreCommand = createForwardRestoreCommand(entry, model);
    onCommitCommand(restoreCommand);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-96 bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col font-sans text-zinc-100 animate-slideUp select-none">
      {/* Top Header */}
      <div className="p-4 border-b border-zinc-850 bg-zinc-950/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
            <IconHistory size={16} />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-200">
              Audit History
            </div>
            <div className="text-[11px] text-zinc-500">
              Total {history.length} revision{history.length === 1 ? "" : "s"} logged
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          title="Close History Drawer"
        >
          <IconClose size={16} />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2.5 border-b border-zinc-850 bg-zinc-900/40 flex flex-wrap gap-1.5 text-[11px]">
        <button
          type="button"
          onClick={() => {
            setFilterKind("all");
            setFilterSelectedOnly(false);
          }}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
            filterKind === "all" && !filterSelectedOnly
              ? "bg-zinc-800 text-zinc-100 shadow-xs"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          All ({history.length})
        </button>

        {selectedNode && (
          <button
            type="button"
            onClick={() => setFilterSelectedOnly((prev) => !prev)}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              filterSelectedOnly
                ? "bg-blue-600 text-white shadow-xs"
                : "text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800"
            }`}
          >
            Selected Element
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setFilterKind("ai");
            setFilterSelectedOnly(false);
          }}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
            filterKind === "ai"
              ? "bg-zinc-800 text-zinc-100 shadow-xs"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          AI Only
        </button>

        <button
          type="button"
          onClick={() => {
            setFilterKind("manual");
            setFilterSelectedOnly(false);
          }}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
            filterKind === "manual"
              ? "bg-zinc-800 text-zinc-100 shadow-xs"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Manual
        </button>
      </div>

      {/* Timeline Entry List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredEntries.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-center text-zinc-500 text-xs">
            No history revisions match the current filter.
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <div
              key={entry.revisionId}
              className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-2 text-xs"
            >
              {/* Header row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-zinc-500">
                    {entry.displayTime}
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium uppercase ${
                      entry.kind === "ai"
                        ? "bg-purple-950/60 border border-purple-800/60 text-purple-300"
                        : entry.kind === "restore"
                        ? "bg-emerald-950/60 border border-emerald-800/60 text-emerald-300"
                        : "bg-zinc-800 text-zinc-300 border border-zinc-700/60"
                    }`}
                  >
                    {entry.source}
                  </span>
                </div>

                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-zinc-800/60 text-zinc-400">
                  {entry.scope}
                </span>
              </div>

              {/* Target Element Name */}
              <div className="font-semibold text-zinc-200">
                {entry.elementName}{" "}
                <span className="font-mono text-[10px] font-normal text-zinc-500">
                  ({entry.elementId})
                </span>
              </div>

              {/* Delta Diff Summary */}
              {entry.beforeState.content !== undefined && (
                <div className="p-2 rounded bg-zinc-950 border border-zinc-850 text-[11px] font-sans text-zinc-400 space-y-1">
                  <div className="line-through text-zinc-500">
                    {entry.beforeState.content}
                  </div>
                  <div className="text-zinc-200 font-medium">
                    {entry.afterState.content}
                  </div>
                </div>
              )}

              {entry.beforeState.props && Object.keys(entry.beforeState.props).length > 0 && (
                <div className="p-2 rounded bg-zinc-950 border border-zinc-850 text-[11px] font-mono text-zinc-400 space-y-0.5">
                  {Object.entries(entry.beforeState.props).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between">
                      <span className="text-zinc-500">{k}:</span>
                      <span>
                        <span className="line-through text-zinc-600 mr-1">{String(v)}</span>
                        <span className="text-zinc-200">
                          {String(entry.afterState.props?.[k as keyof typeof entry.afterState.props])}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Restore Action */}
              <div className="pt-1.5 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleRestore(entry)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white transition-colors"
                  title="Restore this historical state on this element"
                >
                  <IconRotateCcw size={12} />
                  <span>Restore</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
