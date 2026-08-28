import { useState } from "react";
import type { ElementNode } from "../lib/types";
import { elementIcon } from "./icons";
import { IconChevron, IconEye, IconEyeOff, IconLayers, IconSearch } from "./icons";
import { TextInput } from "./ui";

function LayerRow({
  node,
  depth,
  selectedIds,
  onToggle,
  onSelect,
  collapsed,
  setCollapsed,
  hidden,
  toggleHidden,
}: {
  node: ElementNode;
  depth: number;
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelect: (id: string, shift: boolean) => void;
  collapsed: Set<string>;
  setCollapsed: (s: Set<string>) => void;
  hidden: Set<string>;
  toggleHidden: (id: string) => void;
}) {
  const Icon = elementIcon[node.icon] ?? elementIcon.box;
  const selected = selectedIds.includes(node.id);
  const isCollapsed = collapsed.has(node.id);
  const isHidden = hidden.has(node.id);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <>
      <div
        onClick={(e) => onSelect(node.id, e.shiftKey)}
        className={`group flex items-center h-7 pr-1 cursor-default transition-colors-fast ${
          selected
            ? "bg-canvas-accentSoft text-canvas-accent"
            : "text-canvas-sub hover:bg-canvas-line2"
        }`}
        style={{ paddingLeft: depth * 14 + 6 }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!hasChildren) return;
            const n = new Set(collapsed);
            if (n.has(node.id)) n.delete(node.id);
            else n.add(node.id);
            setCollapsed(n);
          }}
          className={`w-4 h-4 flex items-center justify-center shrink-0 ${
            hasChildren ? "hover:text-canvas-ink" : "opacity-0 pointer-events-none"
          }`}
        >
          <IconChevron
            size={12}
            className={`transition-transform-fast ${isCollapsed ? "" : "rotate-90"}`}
          />
        </button>
        <span className={`shrink-0 ${selected ? "text-canvas-accent" : "text-canvas-faint"}`}>
          <Icon size={13} />
        </span>
        <span
          className={`flex-1 ml-1.5 text-ctrl truncate ${
            selected ? "font-medium text-canvas-accent" : ""
          }`}
        >
          {node.name}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleHidden(node.id);
          }}
          className={`shrink-0 w-5 h-5 flex items-center justify-center rounded transition-opacity-fast ${
            isHidden
              ? "opacity-100 text-canvas-faint"
              : "opacity-0 group-hover:opacity-100 text-canvas-faint hover:text-canvas-ink"
          }`}
        >
          {isHidden ? <IconEyeOff size={13} /> : <IconEye size={13} />}
        </button>
      </div>
      {!isCollapsed &&
        hasChildren &&
        node.children!.map((c) => (
          <LayerRow
            key={c.id}
            node={c}
            depth={depth + 1}
            selectedIds={selectedIds}
            onToggle={onToggle}
            onSelect={onSelect}
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            hidden={hidden}
            toggleHidden={toggleHidden}
          />
        ))}
    </>
  );
}

export function LayersPanel({
  tree,
  selectedIds,
  onSelect,
}: {
  tree: ElementNode[];
  selectedIds: string[];
  onSelect: (id: string, shift: boolean) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  const toggleHidden = (id: string) => {
    const n = new Set(hidden);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setHidden(n);
  };

  return (
    <aside className="w-60 shrink-0 bg-canvas-surface border-r border-canvas-line flex flex-col">
      <div className="h-9 shrink-0 flex items-center gap-2 px-3 border-b border-canvas-line">
        <IconLayers size={14} className="text-canvas-faint" />
        <span className="text-meta uppercase tracking-wider font-semibold text-canvas-sub">Layers</span>
      </div>
      <div className="px-2 py-2 border-b border-canvas-line">
        <div className="relative">
          <IconSearch size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-canvas-faint pointer-events-none" />
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search layers"
            className="pl-7"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scroll-thin py-1">
        {tree.map((node) => (
          <LayerRow
            key={node.id}
            node={node}
            depth={0}
            selectedIds={selectedIds}
            onToggle={() => {}}
            onSelect={onSelect}
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            hidden={hidden}
            toggleHidden={toggleHidden}
          />
        ))}
      </div>
      <div className="h-7 shrink-0 border-t border-canvas-line flex items-center px-3">
        <span className="text-meta text-canvas-faint">
          {selectedIds.length > 0 ? `${selectedIds.length} selected` : "Click to select · Shift to multi-select"}
        </span>
      </div>
    </aside>
  );
}
