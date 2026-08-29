import React, { useEffect, useMemo, useRef, useState } from "react";
import type { EditCommand, ElementNode, ElementStyleProps, TemplateModel, Viewport } from "../lib/types";
import { isPropertyOverridden } from "../lib/resolver";

interface Props {
  model: TemplateModel;
  selectedNodes: ElementNode[];
  activeViewport: Viewport;
  onCommitCommand: (command: EditCommand) => { success: boolean; error?: { message: string } };
}

const labelMap: Record<string, string> = {
  fontFamily: "Font Family",
  fontSize: "Size",
  fontWeight: "Weight",
  lineHeight: "Line Height",
  letterSpacing: "Tracking",
  textAlign: "Align",
  color: "Text Color",
  backgroundColor: "Background",
  paddingTop: "Top",
  paddingBottom: "Bottom",
  paddingLeft: "Left",
  paddingRight: "Right",
  marginTop: "Top",
  marginBottom: "Bottom",
  width: "Width",
  height: "Height",
  borderRadius: "Radius",
  borderWidth: "Border",
  borderColor: "Border Color",
  opacity: "Opacity",
  display: "Display",
  flexDirection: "Direction",
  gap: "Gap",
  alignItems: "Align Items",
  justifyContent: "Justify",
};

const common = new Set<keyof ElementStyleProps>([
  "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textAlign",
  "color", "backgroundColor", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight",
  "marginTop", "marginBottom", "width", "height", "borderRadius", "borderWidth", "borderColor",
  "opacity", "display", "flexDirection", "gap", "alignItems", "justifyContent",
]);

function allowed(kind: ElementNode["kind"], key: keyof ElementStyleProps) {
  if (kind === "text" || kind === "link") {
    return new Set([
      "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textAlign",
      "color", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "marginTop",
      "marginBottom", "opacity", "display",
    ]).has(key as string);
  }
  if (kind === "button") return common.has(key);
  if (kind === "image") {
    return new Set([
      "width", "height", "borderRadius", "borderWidth", "borderColor", "marginTop",
      "marginBottom", "opacity", "display",
    ]).has(key);
  }
  return common.has(key);
}

const SWATCH_PALETTE = [
  { label: "Dark", value: "#18181B" },
  { label: "Zinc", value: "#3F3F46" },
  { label: "Muted", value: "#71717A" },
  { label: "White", value: "#FFFFFF" },
  { label: "Cream", value: "#FAF9F6" },
  { label: "Surface", value: "#F4F4F5" },
  { label: "Accent", value: "#2563EB" },
  { label: "Emerald", value: "#059669" },
];

interface ColorControlProps {
  label: string;
  value: string;
  overridden: boolean;
  mixed: boolean;
  onReset: () => void;
  onChange: (val: string) => void;
}

const ColorControl: React.FC<ColorControlProps> = ({
  label,
  value,
  overridden,
  mixed,
  onReset,
  onChange,
}) => {
  const [textVal, setTextVal] = useState(value || "#000000");
  const colorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTextVal(value || "#000000");
  }, [value]);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.trim();
    if (!input.startsWith("#") && /^[0-9a-fA-F]+$/.test(input)) {
      input = "#" + input;
    }
    setTextVal(input);
    if (/^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(input)) {
      onChange(input.toUpperCase());
    }
  };

  const handleHexBlur = () => {
    if (/^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(textVal)) {
      onChange(textVal.toUpperCase());
    } else {
      setTextVal(value || "#000000");
    }
  };

  const activeColor = value || "#000000";

  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-2.5 shadow-sm space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold text-zinc-700 flex items-center gap-1.5">
          {label}
          {overridden && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
              title="Reset viewport override"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Reset
            </button>
          )}
        </label>
        {mixed && <span className="text-[10px] text-zinc-400 font-medium">Mixed</span>}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => colorInputRef.current?.click()}
          className="relative w-8 h-8 rounded-md border border-zinc-300 shadow-inner shrink-0 overflow-hidden group focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
          style={{ backgroundColor: activeColor }}
          title="Click to open color picker"
        >
          <input
            ref={colorInputRef}
            type="color"
            value={activeColor.length === 7 ? activeColor : "#000000"}
            onChange={(e) => {
              const hex = e.target.value.toUpperCase();
              setTextVal(hex);
              onChange(hex);
            }}
            className="absolute -top-4 -left-4 w-16 h-16 opacity-0 cursor-pointer pointer-events-auto"
          />
        </button>

        <div className="relative flex-1">
          <input
            type="text"
            value={textVal}
            onChange={handleHexChange}
            onBlur={handleHexBlur}
            onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
            placeholder="#000000"
            className="w-full h-8 px-2.5 font-mono text-xs text-zinc-800 rounded-md border border-zinc-200 bg-zinc-50/50 hover:bg-white focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none uppercase tracking-wider transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5 pt-0.5">
        {SWATCH_PALETTE.map((swatch) => (
          <button
            key={swatch.value}
            type="button"
            onClick={() => {
              setTextVal(swatch.value);
              onChange(swatch.value);
            }}
            title={`${swatch.label} (${swatch.value})`}
            className={`w-4 h-4 rounded-full border transition-transform hover:scale-125 focus:outline-none ${
              activeColor.toUpperCase() === swatch.value.toUpperCase()
                ? "border-blue-600 ring-2 ring-blue-400 ring-offset-1 scale-110"
                : "border-zinc-300 hover:border-zinc-500"
            }`}
            style={{ backgroundColor: swatch.value }}
          />
        ))}
      </div>
    </div>
  );
};

export const Inspector: React.FC<Props> = ({
  model,
  selectedNodes,
  activeViewport,
  onCommitCommand,
}) => {
  const node = selectedNodes[0];
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setDrafts({});
  }, [node?.id, activeViewport]);

  const scope: "all" | "tablet" | "mobile" =
    activeViewport === "desktop" ? "all" : activeViewport;

  const getValue = (n: ElementNode, key: keyof ElementStyleProps): unknown =>
    (scope === "all" ? n.baseProps[key] : n.overrides[scope as "tablet" | "mobile"]?.[key]) ??
    n.baseProps[key];

  const mixed = (key: keyof ElementStyleProps) =>
    selectedNodes.some((n) => getValue(n, key) !== getValue(selectedNodes[0], key));

  const commit = (key: keyof ElementStyleProps, value: unknown) => {
    const patches: Record<string, { styleProps: Partial<ElementStyleProps> }> = {};
    selectedNodes.forEach((n) => {
      if (allowed(n.kind, key)) {
        patches[n.id] = {
          styleProps: { [key]: value } as Partial<ElementStyleProps>,
        };
      }
    });
    const ids = Object.keys(patches);
    if (!ids.length) return;
    const command: EditCommand = {
      commandId: `inspector-${model.revision}-${ids.join("-")}-${String(key)}`,
      source: "inspector",
      targetIds: ids,
      scope,
      baseRevision: model.revision,
      changes: { patches },
      metadata: { description: `Inspector: ${labelMap[key] ?? String(key)}` },
    };
    onCommitCommand(command);
    setDrafts((d) => {
      const next = { ...d };
      delete next[String(key)];
      return next;
    });
  };

  const reset = (key: keyof ElementStyleProps) => commit(key, undefined);

  const fields = useMemo(() => {
    if (!node) return [];
    const allKeys = [
      "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textAlign",
      "color", "backgroundColor", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight",
      "marginTop", "marginBottom", "width", "height", "borderRadius", "borderWidth", "borderColor",
      "opacity", "display", "flexDirection", "gap", "alignItems", "justifyContent",
    ] as (keyof ElementStyleProps)[];
    return allKeys.filter((k) => selectedNodes.every((n) => allowed(n.kind, k)));
  }, [node, selectedNodes]);

  if (!node) {
    return (
      <aside className="w-[300px] shrink-0 border-l border-zinc-200 bg-[#fbfbfa] p-5 text-zinc-400">
        <div className="text-[11px] tracking-[0.16em] uppercase font-semibold text-zinc-500">
          Inspector
        </div>
        <div className="mt-16 text-center text-xs text-zinc-400">
          Select an element on canvas or layers panel to edit properties.
        </div>
      </aside>
    );
  }

  const colorFields = fields.filter((k) => k === "color" || k === "backgroundColor" || k === "borderColor");
  const typographyFields = fields.filter((k) =>
    ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textAlign"].includes(k)
  );
  const layoutAndSizingFields = fields.filter((k) =>
    ["width", "height", "display", "flexDirection", "gap", "alignItems", "justifyContent", "borderRadius", "borderWidth", "opacity"].includes(k)
  );
  const paddingFields = fields.filter((k) => k.startsWith("padding"));
  const marginFields = fields.filter((k) => k.startsWith("margin"));

  const renderSingleField = (key: keyof ElementStyleProps) => {
    const value = mixed(key) ? "" : getValue(node, key);
    const overridden =
      activeViewport !== "desktop" &&
      selectedNodes.length === 1 &&
      isPropertyOverridden(node, activeViewport, key);
    const draft = drafts[String(key)] ?? (value === undefined ? "" : String(value));

    if (key === "color" || key === "backgroundColor" || key === "borderColor") {
      return (
        <ColorControl
          key={String(key)}
          label={labelMap[key] ?? String(key)}
          value={draft}
          overridden={overridden}
          mixed={mixed(key)}
          onReset={() => reset(key)}
          onChange={(hex) => commit(key, hex)}
        />
      );
    }

    const isSelect =
      key === "fontWeight" ||
      key === "display" ||
      key === "flexDirection" ||
      key === "textAlign" ||
      key === "alignItems" ||
      key === "justifyContent" ||
      key === "fontFamily";

    const hasSlider = ["fontSize", "borderRadius", "gap", "opacity"].includes(key);

    return (
      <div key={String(key)} className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium text-zinc-600 flex items-center gap-1.5">
            {labelMap[key] ?? String(key)}
            {overridden && (
              <button
                type="button"
                onClick={() => reset(key)}
                className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                title="Reset override"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Reset
              </button>
            )}
          </label>
          {mixed(key) && <span className="text-[10px] text-zinc-400">Mixed</span>}
        </div>

        {isSelect ? (
          <select
            value={draft}
            onChange={(e) => commit(key, isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))}
            className="w-full h-8 px-2.5 rounded-md border border-zinc-200 bg-white text-xs text-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none shadow-sm transition-colors"
          >
            {key === "fontFamily"
              ? ["Inter", "system-ui", "monospace"].map((x) => <option key={x}>{x}</option>)
              : key === "fontWeight"
              ? [300, 400, 500, 600, 700, 800].map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))
              : key === "display"
              ? ["block", "flex", "grid", "none"].map((x) => <option key={x}>{x}</option>)
              : key === "flexDirection"
              ? ["row", "column"].map((x) => <option key={x}>{x}</option>)
              : key === "textAlign"
              ? ["left", "center", "right", "justify"].map((x) => <option key={x}>{x}</option>)
              : key === "alignItems"
              ? ["flex-start", "center", "flex-end", "stretch"].map((x) => <option key={x}>{x}</option>)
              : ["flex-start", "center", "flex-end", "space-between"].map((x) => <option key={x}>{x}</option>)}
          </select>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDrafts((d) => ({ ...d, [String(key)]: e.target.value }))}
              onBlur={() => {
                if (key === "width" && (draft === "auto" || draft === "100%")) {
                  commit(key, draft);
                  return;
                }
                const numeric = [
                  "fontSize", "lineHeight", "letterSpacing", "paddingTop", "paddingBottom",
                  "paddingLeft", "paddingRight", "marginTop", "marginBottom", "width", "height",
                  "borderRadius", "borderWidth", "opacity", "gap", "fontWeight",
                ].includes(key);
                if (numeric) {
                  if (draft.trim() === "") return;
                  const numberValue = Number(draft);
                  if (!Number.isFinite(numberValue)) return;
                  commit(key, numberValue);
                } else {
                  commit(key, draft);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
              }}
              className="flex-1 min-w-0 h-8 px-2.5 rounded-md border border-zinc-200 bg-white text-xs text-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none shadow-sm transition-colors"
            />
            {hasSlider && (
              <input
                type="range"
                min={key === "opacity" ? 0 : 0}
                max={key === "opacity" ? 1 : key === "fontSize" ? 120 : key === "borderRadius" ? 64 : 64}
                step={key === "opacity" ? 0.01 : 1}
                value={Number(draft) || 0}
                onChange={(e) => setDrafts((d) => ({ ...d, [String(key)]: e.target.value }))}
                onMouseUp={(e) => commit(key, Number(e.currentTarget.value))}
                className="w-20 shrink-0 accent-zinc-800"
              />
            )}
          </div>
        )}
      </div>
    );
  };

  const renderDirectionalBox = (title: string, groupKeys: (keyof ElementStyleProps)[]) => {
    return (
      <div className="bg-white rounded-lg border border-zinc-200 p-2.5 shadow-sm space-y-2">
        <div className="text-[11px] font-semibold text-zinc-700">
          {title}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {groupKeys.map((key) => {
            const value = mixed(key) ? "" : getValue(node, key);
            const overridden =
              activeViewport !== "desktop" &&
              selectedNodes.length === 1 &&
              isPropertyOverridden(node, activeViewport, key);
            const draft = drafts[String(key)] ?? (value === undefined ? "" : String(value));

            return (
              <div key={String(key)} className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium">
                  <span>{labelMap[key]}</span>
                  {overridden && (
                    <button
                      type="button"
                      onClick={() => reset(key)}
                      className="text-amber-600 font-bold"
                      title="Reset"
                    >
                      ●
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDrafts((d) => ({ ...d, [String(key)]: e.target.value }))}
                    onBlur={() => {
                      if (draft.trim() === "") return;
                      const num = Number(draft);
                      if (Number.isFinite(num)) commit(key, num);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
                    className="w-full h-7 px-2 pr-6 rounded border border-zinc-200 bg-zinc-50/50 hover:bg-white focus:bg-white text-xs text-zinc-800 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                  <span className="absolute right-2 top-1.5 text-[10px] text-zinc-400 font-mono pointer-events-none select-none">
                    px
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <aside className="w-[300px] shrink-0 border-l border-zinc-200 bg-[#fbfbfa] text-zinc-900 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="h-11 px-4 border-b border-zinc-200 flex items-center justify-between shrink-0 bg-white/60 backdrop-blur-sm">
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-zinc-400">
            Inspector
          </div>
          <div className="text-xs font-semibold text-zinc-800 mt-0.5 truncate max-w-[170px]">
            {selectedNodes.length > 1 ? `${selectedNodes.length} elements selected` : node.name}
          </div>
        </div>
        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
          {activeViewport}
        </span>
      </div>

      {/* Scrollable Fields Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
        {selectedNodes.length > 1 && (
          <div className="text-[10px] text-zinc-500 border border-zinc-200 bg-white rounded-md px-2.5 py-2">
            Changes apply to properties shared by all selected elements.
          </div>
        )}

        {/* Color Controls */}
        {colorFields.length > 0 && (
          <div className="space-y-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-0.5">
              Colors & Surface
            </div>
            {colorFields.map(renderSingleField)}
          </div>
        )}

        {/* Typography */}
        {typographyFields.length > 0 && (
          <div className="space-y-2.5 pt-2 border-t border-zinc-200/60">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-0.5">
              Typography
            </div>
            {typographyFields.map(renderSingleField)}
          </div>
        )}

        {/* Layout & Appearance */}
        {layoutAndSizingFields.length > 0 && (
          <div className="space-y-2.5 pt-2 border-t border-zinc-200/60">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-0.5">
              Layout & Appearance
            </div>
            {layoutAndSizingFields.map(renderSingleField)}
          </div>
        )}

        {/* Spacing (Padding & Margin) */}
        {(paddingFields.length > 0 || marginFields.length > 0) && (
          <div className="space-y-2.5 pt-2 border-t border-zinc-200/60">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-0.5">
              Spacing & Box Model
            </div>
            {paddingFields.length > 0 && renderDirectionalBox("Padding", paddingFields)}
            {marginFields.length > 0 && renderDirectionalBox("Margin", marginFields)}
          </div>
        )}
      </div>
    </aside>
  );
};
