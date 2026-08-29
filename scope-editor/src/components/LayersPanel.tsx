import React, { useMemo, useState } from "react";
import type { ElementNode, TemplateModel } from "../lib/types";
import { getAllNodes } from "../lib/treeUtils";

interface LayersPanelProps {
  model: TemplateModel;
  selectedIds: string[];
  onSelect: (id: string, additive: boolean) => void;
}

const kindBadges: Record<string, { label: string; color: string }> = {
  section: { label: "SEC", color: "bg-purple-50 text-purple-700 border-purple-200" },
  container: { label: "DIV", color: "bg-zinc-100 text-zinc-600 border-zinc-200" },
  card: { label: "CRD", color: "bg-zinc-100 text-zinc-600 border-zinc-200" },
  button: { label: "BTN", color: "bg-blue-50 text-blue-700 border-blue-200" },
  text: { label: "TXT", color: "bg-amber-50 text-amber-700 border-amber-200" },
  link: { label: "LNK", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  image: { label: "IMG", color: "bg-rose-50 text-rose-700 border-rose-200" },
  input: { label: "INP", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
};

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
    const badge = kindBadges[node.kind] ?? {
      label: node.kind.slice(0, 3).toUpperCase(),
      color: "bg-zinc-100 text-zinc-600 border-zinc-200",
    };

    return (
      <React.Fragment key={node.id}>
        <div
          className={`group flex items-center gap-1.5 h-8 px-2.5 text-xs cursor-pointer select-none transition-colors ${
            selected
              ? "bg-blue-50/80 text-blue-900 font-semibold border-r-2 border-blue-600"
              : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900"
          }`}
          style={{ paddingLeft: `${8 + depth * 14}px` }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(node.id, e.shiftKey || e.metaKey || e.ctrlKey);
          }}
          title={`${node.name} (${node.kind}) - Click to select`}
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
            ) : null}
          </button>

          {/* Kind Mini-Badge */}
          <span
            className={`px-1 py-0.2 rounded text-[8px] font-mono font-bold tracking-tight border shrink-0 ${badge.color}`}
          >
            {badge.label}
          </span>

          {/* Node Name */}
          <span className="truncate flex-1 text-[11px]">{node.name}</span>
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
            {selectedIds.length} {selectedIds.length === 1 ? "selected" : "selected"}
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
