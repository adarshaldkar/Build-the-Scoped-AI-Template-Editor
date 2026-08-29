import React, { useState } from "react";
import type { ElementNode, TemplateModel } from "../lib/types";

interface LayersPanelProps { model: TemplateModel; selectedIds: string[]; onSelect: (id: string, additive: boolean) => void; }
export const LayersPanel: React.FC<LayersPanelProps> = ({ model, selectedIds, onSelect }) => {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setCollapsed((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const render = (node: ElementNode, depth = 0): React.ReactNode => {
    const selected = selectedIds.includes(node.id); const hasChildren = !!node.children?.length; const hidden = collapsed.has(node.id);
    return <React.Fragment key={node.id}>
      <div className={`group flex items-center gap-2 h-8 px-3 text-[12px] cursor-default ${selected ? "bg-zinc-100 text-zinc-900" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"}`} style={{ paddingLeft: 10 + depth * 14 }} onClick={(e) => onSelect(node.id, e.shiftKey || e.metaKey || e.ctrlKey)}>
        <button type="button" className="w-3 h-3 flex items-center justify-center" onClick={(e) => { e.stopPropagation(); if (hasChildren) toggle(node.id); }}>{hasChildren ? (hidden ? "›" : "⌄") : ""}</button>
        <span className="w-4 text-center font-mono text-[10px] opacity-60">{node.kind[0].toUpperCase()}</span>
        <span className="truncate flex-1">{node.name}</span>
      </div>
      {hasChildren && !hidden ? node.children!.map((child) => render(child, depth + 1)) : null}
    </React.Fragment>;
  };
  return <aside className="w-[240px] shrink-0 border-r border-zinc-200 bg-[#fbfbfa] text-zinc-900 flex flex-col">
    <div className="h-11 border-b border-zinc-200 flex items-center justify-between px-4"><span className="text-[11px] font-semibold tracking-[0.16em] uppercase text-zinc-500">Layers</span><span className="text-[11px] text-zinc-400">{selectedIds.length || 0}</span></div>
    <div className="flex-1 overflow-auto py-2">{model.elements.map((node) => render(node))}</div>
  </aside>;
};
