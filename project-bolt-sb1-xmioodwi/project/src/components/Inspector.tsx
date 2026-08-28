import { useState } from "react";
import type { ElementNode, Scope, Viewport } from "../lib/types";
import { Divider, Field, NumberInput, Select, ColorSwatch, SegmentedControl } from "./ui";
import { IconType, IconClose } from "./icons";

function findNode(tree: ElementNode[], id: string): ElementNode | null {
  for (const n of tree) {
    if (n.id === id) return n;
    if (n.children) {
      const f = findNode(n.children, id);
      if (f) return f;
    }
  }
  return null;
}

const FONTS = [
  { label: "Inter", value: "Inter" },
  { label: "Geist", value: "Geist" },
  { label: "SF Pro", value: "SF Pro" },
  { label: "Georgia", value: "Georgia" },
  { label: "JetBrains Mono", value: "JetBrains Mono" },
];
const WEIGHTS = [
  { label: "400 Regular", value: "400" },
  { label: "500 Medium", value: "500" },
  { label: "600 Semibold", value: "600" },
  { label: "700 Bold", value: "700" },
];

export function Inspector({
  tree,
  selectedIds,
  viewport,
  onViewport,
  onPropChange,
  onContentChange,
  onDeselect,
}: {
  tree: ElementNode[];
  selectedIds: string[];
  viewport: Viewport;
  onViewport: (v: Viewport) => void;
  onPropChange: (id: string, key: string, value: string | number) => void;
  onContentChange: (id: string, value: string) => void;
  onDeselect: (id: string) => void;
}) {
  const [tab] = useState<Scope>("all");

  if (selectedIds.length === 0) {
    return (
      <aside className="w-72 shrink-0 bg-canvas-surface border-l border-canvas-line flex flex-col">
        <PanelHeader />
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-10 h-10 rounded-lg border border-canvas-line flex items-center justify-center mb-3 text-canvas-faint">
            <IconType size={18} />
          </div>
          <p className="text-ctrl text-canvas-sub font-medium">No selection</p>
          <p className="text-meta text-canvas-faint mt-1">
            Select an element on the canvas to edit its properties.
          </p>
        </div>
      </aside>
    );
  }

  if (selectedIds.length > 1) {
    return (
      <aside className="w-72 shrink-0 bg-canvas-surface border-l border-canvas-line flex flex-col">
        <PanelHeader />
        <div className="px-4 py-3 border-b border-canvas-line">
          <span className="text-meta uppercase tracking-wider font-semibold text-canvas-sub">
            {selectedIds.length} elements selected
          </span>
        </div>
        <div className="flex-1 overflow-y-auto scroll-thin">
          {selectedIds.map((id) => {
            const n = findNode(tree, id);
            if (!n) return null;
            return (
              <div key={id} className="flex items-center justify-between px-4 py-2 border-b border-canvas-line2 hover:bg-canvas-line2 transition-colors-fast">
                <span className="text-ctrl text-canvas-ink truncate">{n.name}</span>
                <button onClick={() => onDeselect(id)} className="text-canvas-faint hover:text-canvas-ink transition-colors-fast">
                  <IconClose size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </aside>
    );
  }

  const node = findNode(tree, selectedIds[0]);
  if (!node) return null;
  const p = node.props;

  return (
    <aside className="w-72 shrink-0 bg-canvas-surface border-l border-canvas-line flex flex-col">
      <PanelHeader />

      {/* Element title */}
      <div className="px-4 py-3 border-b border-canvas-line">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-meta uppercase tracking-wider text-canvas-faint font-semibold">Element</div>
            <div className="text-body font-semibold text-canvas-ink mt-0.5">{node.name}</div>
          </div>
          <span className="text-meta text-canvas-faint font-mono px-1.5 py-0.5 rounded bg-canvas-line2">{node.kind}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin px-4 py-3">
        {/* CONTENT */}
        {node.content !== undefined && (
          <>
            <Divider label="Content" />
            <div className="py-1.5">
              <textarea
                value={node.content}
                onChange={(e) => onContentChange(node.id, e.target.value)}
                rows={node.kind === "text" ? 2 : 1}
                className="w-full bg-canvas-paper border border-canvas-line rounded-md px-2 py-[5px] text-ctrl text-canvas-ink focus-ring hover:border-canvas-faint/60 transition-colors-base resize-none"
              />
            </div>
          </>
        )}

        {/* TYPOGRAPHY */}
        {(node.kind === "text" || node.kind === "button" || node.kind === "link") && (
          <>
            <Divider label="Typography" />
            <Field label="Font">
              <Select
                value={p.font ?? "Inter"}
                options={FONTS}
                onChange={(v) => onPropChange(node.id, "font", v)}
              />
            </Field>
            <Field label="Weight">
              <Select
                value={String(p.weight ?? 400)}
                options={WEIGHTS}
                onChange={(v) => onPropChange(node.id, "weight", Number(v))}
              />
            </Field>
            <Field label="Size">
              <NumberInput value={p.size ?? 16} suffix="px" onChange={(v) => onPropChange(node.id, "size", v)} />
            </Field>
            <Field label="Line Height">
              <NumberInput
                value={p.lineHeight ? Math.round(p.lineHeight * 100) / 100 : 150}
                suffix="%"
                min={50}
                max={300}
                onChange={(v) => onPropChange(node.id, "lineHeight", v / 100)}
              />
            </Field>
            <Field label="Align">
              <SegmentedControl
                size="sm"
                value={p.align ?? "left"}
                onChange={(v) => onPropChange(node.id, "align", v)}
                options={[
                  { label: "L", value: "left" },
                  { label: "C", value: "center" },
                  { label: "R", value: "right" },
                ]}
              />
            </Field>
          </>
        )}

        {/* COLOR */}
        {(node.kind === "text" || node.kind === "button" || node.kind === "link") && (
          <>
            <Divider label="Color" />
            <Field label="Text">
              <ColorSwatch value={p.color ?? "#18181B"} onChange={(v) => onPropChange(node.id, "color", v)} />
            </Field>
            {node.kind === "button" && (
              <Field label="Background">
                <ColorSwatch value={p.bg ?? "#18181B"} onChange={(v) => onPropChange(node.id, "bg", v)} />
              </Field>
            )}
          </>
        )}

        {/* SPACING */}
        <Divider label="Spacing" />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Margin T" inline={false}>
            <NumberInput value={p.marginTop ?? 0} suffix="px" onChange={(v) => onPropChange(node.id, "marginTop", v)} />
          </Field>
          <Field label="Margin B" inline={false}>
            <NumberInput value={p.marginBottom ?? 0} suffix="px" onChange={(v) => onPropChange(node.id, "marginBottom", v)} />
          </Field>
        </div>

        {/* SIZE */}
        <Divider label="Size" />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Width" inline={false}>
            <NumberInput value={p.width ?? 100} suffix="%" min={1} max={100} onChange={(v) => onPropChange(node.id, "width", v)} />
          </Field>
          <Field label="Height" inline={false}>
            <NumberInput value={p.height ?? 0} suffix="px" onChange={(v) => onPropChange(node.id, "height", v)} />
          </Field>
        </div>
        {(node.kind === "button" || node.kind === "image" || node.kind === "container") && (
          <Field label="Radius">
            <NumberInput value={p.radius ?? 0} suffix="px" onChange={(v) => onPropChange(node.id, "radius", v)} />
          </Field>
        )}

        {/* RESPONSIVE */}
        <Divider label="Responsive" />
        <Field label="Editing">
          <SegmentedControl
            size="sm"
            value={viewport}
            onChange={(v) => onViewport(v as Viewport)}
            options={[
              { label: "Desk", value: "desktop" },
              { label: "Tab", value: "tablet" },
              { label: "Mob", value: "mobile" },
            ]}
          />
        </Field>
        <div className="mt-2 flex items-center gap-2 text-meta text-canvas-faint">
          <span className="w-2 h-2 rounded-full bg-canvas-ok" />
          <span>Overrides apply to {tab === "all" ? "all viewports" : tab}</span>
        </div>
      </div>
    </aside>
  );
}

function PanelHeader() {
  return (
    <div className="h-9 shrink-0 flex items-center gap-2 px-3 border-b border-canvas-line">
      <IconType size={14} className="text-canvas-faint" />
      <span className="text-meta uppercase tracking-wider font-semibold text-canvas-sub">Inspector</span>
    </div>
  );
}
