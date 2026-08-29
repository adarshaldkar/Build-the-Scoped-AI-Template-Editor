import React, { useMemo, useState } from "react";
import type { ElementNode, TemplateModel } from "../lib/types";
import { getAllNodes } from "../lib/treeUtils";

interface LayersPanelProps {
  model: TemplateModel;
  selectedIds: string[];
  onSelect: (id: string, additive: boolean) => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
  model,
  selectedIds,
  onSelect,
}) => {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const totalCount = useMemo(() => getAllNodes(model.elements).length, [model.elements]);

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const render = (node: ElementNode, depth = 0): React.ReactNode => {
    const selected = selectedIds.includes(node.id);
    const hasChildren = Boolean(node.children?.length);
    const isCollapsed = collapsed.has(node.id);

    return (
      <React.Fragment key={node.id}>
        <div
          className={`group flex items-center gap-2 h-8 px-2.5 text-xs cursor-pointer select-none transition-colors ${
            selected
              ? "bg-blue-50/80 text-blue-900 font-semibold border-r-2 border-blue-600"
              : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900"
          }`}
          style={{ paddingLeft: `${8 + depth * 14}px` }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(node.id, e.shiftKey || e.metaKey || e.ctrlKey);
          }}
          title={`${node.name} - Click to select`}
        >
          {/* Chevron expand/collapse button */}
          <button
            type="button"
            className="w-4 h-4 flex items-center justify-center text-zinc-400 hover:text-zinc-700 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) toggle(node.id);
            }}
          >
            {hasChildren ? (
              <span className="text-[10px] font-bold leading-none">
                {isCollapsed ? "›" : "⌄"}
              </span>
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 opacity-40"></span>
            )}
          </button>

          {/* Node Name */}
          <span className="truncate flex-1 text-[12px]">{node.name}</span>
        </div>

        {/* Recursive Children Tree */}
        {hasChildren && !isCollapsed
          ? node.children!.map((child) => render(child, depth + 1))
          : null}
      </React.Fragment>
    );
  };

  return (
    <aside className="w-[240px] shrink-0 border-r border-zinc-200 bg-[#fbfbfa] text-zinc-900 flex flex-col h-full overflow-hidden select-none">
      {/* Header */}
      <div className="h-11 px-3.5 border-b border-zinc-200 flex items-center justify-between shrink-0 bg-white/60 backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-[0.14em] font-bold text-zinc-400">
            Layers
          </span>
        </div>

        {/* Dynamic Selection/Count Badge */}
        {selectedIds.length > 0 ? (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 animate-fade-in">
            {selectedIds.length} selected
          </span>
        ) : (
          <span className="text-[10px] text-zinc-400 font-mono">
            {totalCount} elements
          </span>
        )}
      </div>

      {/* Scrollable Tree View */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-1.5 custom-scrollbar">
        {model.elements.map((node) => render(node))}
      </div>
    </aside>
  );
};
