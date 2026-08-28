import React from "react";
import type {
  ElementNode,
  TemplateModel,
  Viewport,
  ElementStyleProps,
  EditCommand,
  ValidationError,
} from "../lib/types";
import { resolveElementProps } from "../lib/resolver";

export interface InspectorProps {
  model: TemplateModel;
  selectedNode: ElementNode | null;
  activeViewport: Viewport;
  onCommitCommand: (command: EditCommand) => { success: boolean; error?: ValidationError };
}

export const Inspector: React.FC<InspectorProps> = ({
  model,
  selectedNode,
  activeViewport,
  onCommitCommand,
}) => {
  if (!selectedNode) {
    return (
      <aside className="w-80 bg-zinc-950 border-l border-zinc-800/80 p-6 flex flex-col justify-center items-center text-center select-none font-sans text-zinc-400">
        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-3 font-mono text-sm">
          --
        </div>
        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1">
          No Element Selected
        </div>
        <div className="text-[11px] text-zinc-500 max-w-[200px]">
          Select any element on the visual canvas to inspect and adjust its properties.
        </div>
      </aside>
    );
  }

  // Resolve current computed props for display
  const resolvedProps = resolveElementProps(selectedNode, activeViewport);

  // Check if a specific property is overridden on the active viewport
  const isOverridden = (propKey: keyof ElementStyleProps): boolean => {
    if (activeViewport === "desktop") return false;
    return selectedNode.overrides[activeViewport]?.[propKey] !== undefined;
  };

  // Helper to commit a property change
  const handlePropertyChange = (
    propKey: keyof ElementStyleProps,
    value: string | number | undefined
  ) => {
    const scope = activeViewport === "desktop" ? "all" : activeViewport;

    const command: EditCommand = {
      commandId: `cmd_inspect_${Date.now()}`,
      source: "inspector",
      targetIds: [selectedNode.id],
      scope,
      baseRevision: model.revision,
      changes: {
        patches: {
          [selectedNode.id]: {
            styleProps: {
              [propKey]: value,
            },
          },
        },
      },
      metadata: {
        description: `Set ${propKey} on ${selectedNode.name} (${activeViewport})`,
      },
    };

    onCommitCommand(command);
  };

  // Helper to reset a specific property override on the active viewport
  const handleResetOverride = (propKey: keyof ElementStyleProps) => {
    if (activeViewport === "desktop") return;

    const command: EditCommand = {
      commandId: `cmd_reset_override_${Date.now()}`,
      source: "inspector",
      targetIds: [selectedNode.id],
      scope: activeViewport,
      baseRevision: model.revision,
      changes: {
        patches: {
          [selectedNode.id]: {
            styleProps: {
              [propKey]: undefined, // Explicit override deletion
            },
          },
        },
      },
      metadata: {
        description: `Reset ${propKey} override on ${selectedNode.name} (${activeViewport})`,
      },
    };

    onCommitCommand(command);
  };

  const isTextElement = selectedNode.kind === "text" || selectedNode.kind === "button" || selectedNode.kind === "link";
  const isContainerElement = selectedNode.kind === "container" || selectedNode.kind === "section" || selectedNode.kind === "card";

  return (
    <aside className="w-80 bg-zinc-950 border-l border-zinc-800/80 flex flex-col h-full overflow-y-auto select-none font-sans text-zinc-100 divide-y divide-zinc-850">
      {/* Element Header */}
      <div className="p-4 bg-zinc-950/60 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
            {selectedNode.name}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono lowercase bg-zinc-900 border border-zinc-800 text-zinc-400">
            {selectedNode.kind}
          </span>
        </div>

        {/* Viewport Scope Status Banner */}
        <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between text-[11px]">
          <span className="text-zinc-400">Scope</span>
          <span className="font-mono text-[10px] text-zinc-300 font-medium">
            {activeViewport === "desktop" ? "Base Styles (All Views)" : `${activeViewport.toUpperCase()} Override`}
          </span>
        </div>
      </div>

      {/* Group 1: Typography (text, button, link) */}
      {isTextElement && (
        <div className="p-4 space-y-3.5">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-400">
            Typography
          </div>

          {/* Font Size */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label className="text-zinc-400 flex items-center gap-1.5">
                <span>Font Size</span>
                {isOverridden("fontSize") && (
                  <button
                    type="button"
                    onClick={() => handleResetOverride("fontSize")}
                    className="w-2 h-2 rounded-full bg-amber-400 hover:scale-125 transition-transform"
                    title="Active Viewport Override. Click to Reset."
                  />
                )}
              </label>
              <span className="font-mono text-zinc-300 text-[11px]">
                {resolvedProps.fontSize || 16}px
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="10"
                max="96"
                value={resolvedProps.fontSize || 16}
                onChange={(e) => handlePropertyChange("fontSize", Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              />
            </div>
          </div>

          {/* Font Weight */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label className="text-zinc-400 flex items-center gap-1.5">
                <span>Font Weight</span>
                {isOverridden("fontWeight") && (
                  <button
                    type="button"
                    onClick={() => handleResetOverride("fontWeight")}
                    className="w-2 h-2 rounded-full bg-amber-400 hover:scale-125 transition-transform"
                    title="Active Viewport Override. Click to Reset."
                  />
                )}
              </label>
            </div>
            <select
              value={resolvedProps.fontWeight || 400}
              onChange={(e) => handlePropertyChange("fontWeight", Number(e.target.value))}
              className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
            >
              <option value={400}>400 - Normal</option>
              <option value={500}>500 - Medium</option>
              <option value={600}>600 - SemiBold</option>
              <option value={700}>700 - Bold</option>
              <option value={800}>800 - ExtraBold</option>
            </select>
          </div>

          {/* Text Align */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label className="text-zinc-400 flex items-center gap-1.5">
                <span>Text Align</span>
                {isOverridden("textAlign") && (
                  <button
                    type="button"
                    onClick={() => handleResetOverride("textAlign")}
                    className="w-2 h-2 rounded-full bg-amber-400 hover:scale-125 transition-transform"
                    title="Active Viewport Override. Click to Reset."
                  />
                )}
              </label>
            </div>
            <div className="grid grid-cols-3 gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 text-xs">
              {(["left", "center", "right"] as const).map((align) => (
                <button
                  key={align}
                  type="button"
                  onClick={() => handlePropertyChange("textAlign", align)}
                  className={`py-1 rounded capitalize font-medium transition-colors ${
                    resolvedProps.textAlign === align
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>

          {/* Text Color */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label className="text-zinc-400 flex items-center gap-1.5">
                <span>Text Color</span>
                {isOverridden("color") && (
                  <button
                    type="button"
                    onClick={() => handleResetOverride("color")}
                    className="w-2 h-2 rounded-full bg-amber-400 hover:scale-125 transition-transform"
                    title="Active Viewport Override. Click to Reset."
                  />
                )}
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={resolvedProps.color || "#18181B"}
                onChange={(e) => handlePropertyChange("color", e.target.value)}
                className="w-7 h-7 rounded border border-zinc-800 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={resolvedProps.color || "#18181B"}
                onChange={(e) => handlePropertyChange("color", e.target.value)}
                className="flex-1 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* Group 2: Flex Layout (containers, sections, cards) */}
      {isContainerElement && (
        <div className="p-4 space-y-3.5">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-400">
            Flex Layout
          </div>

          {/* Direction */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label className="text-zinc-400 flex items-center gap-1.5">
                <span>Direction</span>
                {isOverridden("flexDirection") && (
                  <button
                    type="button"
                    onClick={() => handleResetOverride("flexDirection")}
                    className="w-2 h-2 rounded-full bg-amber-400 hover:scale-125 transition-transform"
                    title="Active Viewport Override. Click to Reset."
                  />
                )}
              </label>
            </div>
            <div className="grid grid-cols-2 gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 text-xs">
              {(["row", "column"] as const).map((dir) => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => handlePropertyChange("flexDirection", dir)}
                  className={`py-1 rounded capitalize font-medium transition-colors ${
                    resolvedProps.flexDirection === dir
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {dir}
                </button>
              ))}
            </div>
          </div>

          {/* Gap */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label className="text-zinc-400 flex items-center gap-1.5">
                <span>Gap</span>
                {isOverridden("gap") && (
                  <button
                    type="button"
                    onClick={() => handleResetOverride("gap")}
                    className="w-2 h-2 rounded-full bg-amber-400 hover:scale-125 transition-transform"
                    title="Active Viewport Override. Click to Reset."
                  />
                )}
              </label>
              <span className="font-mono text-zinc-300 text-[11px]">
                {resolvedProps.gap || 0}px
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="64"
              value={resolvedProps.gap || 0}
              onChange={(e) => handlePropertyChange("gap", Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Group 3: Spacing & Dimensions (All Elements) */}
      <div className="p-4 space-y-3.5">
        <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-400">
          Spacing & Radius
        </div>

        {/* Padding */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <label className="text-zinc-400 flex items-center gap-1.5">
              <span>Padding (Top / Bottom)</span>
              {(isOverridden("paddingTop") || isOverridden("paddingBottom")) && (
                <button
                  type="button"
                  onClick={() => {
                    handleResetOverride("paddingTop");
                    handleResetOverride("paddingBottom");
                  }}
                  className="w-2 h-2 rounded-full bg-amber-400 hover:scale-125 transition-transform"
                  title="Active Viewport Override. Click to Reset."
                />
              )}
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              value={resolvedProps.paddingTop ?? 0}
              onChange={(e) => handlePropertyChange("paddingTop", Number(e.target.value))}
              placeholder="Top"
              className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-200"
            />
            <input
              type="number"
              value={resolvedProps.paddingBottom ?? 0}
              onChange={(e) => handlePropertyChange("paddingBottom", Number(e.target.value))}
              placeholder="Bottom"
              className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-200"
            />
          </div>
        </div>

        {/* Border Radius */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <label className="text-zinc-400 flex items-center gap-1.5">
              <span>Corner Radius</span>
              {isOverridden("borderRadius") && (
                <button
                  type="button"
                  onClick={() => handleResetOverride("borderRadius")}
                  className="w-2 h-2 rounded-full bg-amber-400 hover:scale-125 transition-transform"
                  title="Active Viewport Override. Click to Reset."
                />
              )}
            </label>
            <span className="font-mono text-zinc-300 text-[11px]">
              {resolvedProps.borderRadius || 0}px
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="32"
            value={resolvedProps.borderRadius || 0}
            onChange={(e) => handlePropertyChange("borderRadius", Number(e.target.value))}
            className="w-full accent-blue-600 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
          />
        </div>

        {/* Background Color */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <label className="text-zinc-400 flex items-center gap-1.5">
              <span>Background</span>
              {isOverridden("backgroundColor") && (
                <button
                  type="button"
                  onClick={() => handleResetOverride("backgroundColor")}
                  className="w-2 h-2 rounded-full bg-amber-400 hover:scale-125 transition-transform"
                  title="Active Viewport Override. Click to Reset."
                />
              )}
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={resolvedProps.backgroundColor || "#FFFFFF"}
              onChange={(e) => handlePropertyChange("backgroundColor", e.target.value)}
              className="w-7 h-7 rounded border border-zinc-800 bg-transparent cursor-pointer"
            />
            <input
              type="text"
              value={resolvedProps.backgroundColor || ""}
              placeholder="transparent"
              onChange={(e) => handlePropertyChange("backgroundColor", e.target.value || undefined)}
              className="flex-1 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-200"
            />
          </div>
        </div>
      </div>
    </aside>
  );
};
