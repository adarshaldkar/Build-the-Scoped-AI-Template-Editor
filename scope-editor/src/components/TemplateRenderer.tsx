import React, { useState, useRef, useEffect } from "react";
import type {
  ElementNode,
  TemplateModel,
  Viewport,
  ElementStyleProps,
  EditCommand,
  ValidationError,
} from "../lib/types";
import { resolveElementProps } from "../lib/resolver";
import { IconCode, IconSparkles } from "./icons";

export interface TemplateRendererProps {
  model: TemplateModel;
  activeViewport: Viewport;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onCommitCommand: (command: EditCommand) => { success: boolean; error?: ValidationError };
  onOpenCodeEditor?: (nodeId: string) => void;
  onOpenAssistant?: (nodeId: string) => void;
}

export const TemplateRenderer: React.FC<TemplateRendererProps> = ({
  model,
  activeViewport,
  selectedNodeId,
  onSelectNode,
  onCommitCommand,
  onOpenCodeEditor,
  onOpenAssistant,
}) => {
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState<string>("");
  const editRef = useRef<HTMLElement | null>(null);

  // Auto-focus when entering inline edit mode
  useEffect(() => {
    if (editingNodeId && editRef.current) {
      editRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(editRef.current);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [editingNodeId]);

  const handleStartEditing = (node: ElementNode, e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.kind === "text" || node.kind === "button" || node.kind === "link") {
      setEditingNodeId(node.id);
      setDraftContent(node.content || "");
    }
  };

  const handleCommitInlineEdit = (node: ElementNode) => {
    if (!editingNodeId) return;

    const trimmed = draftContent.trim();
    const original = (node.content || "").trim();

    setEditingNodeId(null);

    // If unchanged, do zero commit
    if (trimmed === original || trimmed.length === 0) {
      return;
    }

    const command: EditCommand = {
      commandId: `cmd_inline_${Date.now()}`,
      source: "canvas",
      targetIds: [node.id],
      scope: "all",
      baseRevision: model.revision,
      changes: {
        patches: {
          [node.id]: { content: trimmed },
        },
      },
      metadata: { description: `Inline text edit on ${node.name}` },
    };

    onCommitCommand(command);
  };

  const handleCancelInlineEdit = () => {
    setEditingNodeId(null);
    setDraftContent("");
  };

  const handleSectionReorder = (
    sectionId: string,
    direction: "up" | "down",
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    const sections = model.elements;
    const currentIndex = sections.findIndex((s) => s.id === sectionId);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const command: EditCommand = {
      commandId: `cmd_reorder_${Date.now()}`,
      source: "canvas",
      targetIds: [model.templateId],
      scope: "all",
      baseRevision: model.revision,
      changes: {
        reorder: {
          parentId: model.templateId,
          sourceIndex: currentIndex,
          targetIndex,
        },
      },
      metadata: { description: `Move section ${sections[currentIndex].name} ${direction}` },
    };

    onCommitCommand(command);
  };

  // Convert resolved style properties to React.CSSProperties
  const propsToReactStyle = (props: ElementStyleProps): React.CSSProperties => {
    const style: React.CSSProperties = {};

    if (props.fontFamily) style.fontFamily = props.fontFamily;
    if (props.fontWeight) style.fontWeight = props.fontWeight;
    if (props.fontSize) style.fontSize = `${props.fontSize}px`;
    if (props.lineHeight) style.lineHeight = props.lineHeight;
    if (props.letterSpacing !== undefined) style.letterSpacing = `${props.letterSpacing}px`;
    if (props.textAlign) style.textAlign = props.textAlign;
    if (props.color) style.color = props.color;
    if (props.backgroundColor) style.backgroundColor = props.backgroundColor;
    if (props.marginTop !== undefined) style.marginTop = `${props.marginTop}px`;
    if (props.marginBottom !== undefined) style.marginBottom = `${props.marginBottom}px`;
    if (props.paddingTop !== undefined) style.paddingTop = `${props.paddingTop}px`;
    if (props.paddingBottom !== undefined) style.paddingBottom = `${props.paddingBottom}px`;
    if (props.paddingLeft !== undefined) style.paddingLeft = `${props.paddingLeft}px`;
    if (props.paddingRight !== undefined) style.paddingRight = `${props.paddingRight}px`;
    if (props.width !== undefined) {
      style.width = typeof props.width === "number" ? `${props.width}px` : props.width;
    }
    if (props.height !== undefined) {
      style.height = typeof props.height === "number" ? `${props.height}px` : props.height;
    }
    if (props.borderRadius !== undefined) style.borderRadius = `${props.borderRadius}px`;
    if (props.borderWidth !== undefined) style.borderWidth = `${props.borderWidth}px`;
    if (props.borderColor) style.borderColor = props.borderColor;
    if (props.borderWidth && !props.borderColor) style.borderStyle = "solid";
    if (props.opacity !== undefined) style.opacity = props.opacity;
    if (props.display) style.display = props.display;
    if (props.flexDirection) style.flexDirection = props.flexDirection;
    if (props.gap !== undefined) style.gap = `${props.gap}px`;
    if (props.alignItems) style.alignItems = props.alignItems;
    if (props.justifyContent) style.justifyContent = props.justifyContent;

    return style;
  };

  /**
   * Recursive node renderer
   */
  const renderNode = (
    node: ElementNode,
    isTopLevelSection: boolean = false,
    sectionIndex: number = 0,
    totalSections: number = 1
  ): React.ReactNode => {
    const resolvedProps = resolveElementProps(node, activeViewport);
    const reactStyle = propsToReactStyle(resolvedProps);
    const isSelected = selectedNodeId === node.id;
    const isEditing = editingNodeId === node.id;

    // Direct active selection outline
    const selectionClasses = isSelected
      ? "relative outline-2 outline-blue-600 outline-offset-1 z-20"
      : "hover:outline hover:outline-1 hover:outline-blue-400/60 hover:outline-offset-1";

    const commonClassName = `${selectionClasses} transition-all duration-150`;

    // Understated Label Badge & Action Bar
    const renderSelectionHeader = () => {
      if (!isSelected) return null;

      return (
        <div
          className="absolute -top-7 left-0 z-30 flex items-center gap-1.5 px-2 py-0.5 bg-blue-600 text-white rounded text-[11px] font-sans font-medium shadow-md pointer-events-auto select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="font-semibold">{node.name}</span>
          <span className="text-blue-200">·</span>
          <span className="text-blue-200 font-mono text-[10px] lowercase">{node.kind}</span>

          {/* Section Move Up / Move Down buttons */}
          {isTopLevelSection && (
            <div className="flex items-center gap-1 ml-1.5 border-l border-blue-500 pl-1.5">
              <button
                type="button"
                disabled={sectionIndex === 0}
                onClick={(e) => handleSectionReorder(node.id, "up", e)}
                className="px-1 py-0.2 rounded hover:bg-blue-700 text-[10px] font-mono disabled:opacity-40 disabled:hover:bg-transparent"
                title="Move Section Up"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={sectionIndex === totalSections - 1}
                onClick={(e) => handleSectionReorder(node.id, "down", e)}
                className="px-1 py-0.2 rounded hover:bg-blue-700 text-[10px] font-mono disabled:opacity-40 disabled:hover:bg-transparent"
                title="Move Section Down"
              >
                ↓
              </button>
            </div>
          )}

          {/* Quick Code & AI Shortcuts */}
          <div className="flex items-center gap-1 ml-1 border-l border-blue-500 pl-1">
            {onOpenCodeEditor && (
              <button
                type="button"
                onClick={() => onOpenCodeEditor(node.id)}
                className="p-0.5 rounded hover:bg-blue-700 text-blue-100"
                title="Open in Code Editor"
              >
                <IconCode size={12} />
              </button>
            )}
            {onOpenAssistant && (
              <button
                type="button"
                onClick={() => onOpenAssistant(node.id)}
                className="p-0.5 rounded hover:bg-blue-700 text-blue-100"
                title="Edit with AI Assistant"
              >
                <IconSparkles size={12} />
              </button>
            )}
          </div>
        </div>
      );
    };

    // Kind-specific React element mapping
    switch (node.kind) {
      case "section":
        return (
          <section
            key={node.id}
            data-node-id={node.id}
            data-node-kind={node.kind}
            style={reactStyle}
            className={commonClassName}
            onClick={(e) => {
              e.stopPropagation();
              onSelectNode(node.id);
            }}
          >
            {renderSelectionHeader()}
            {node.children?.map((child) => renderNode(child))}
          </section>
        );

      case "container":
      case "card":
        return (
          <div
            key={node.id}
            data-node-id={node.id}
            data-node-kind={node.kind}
            style={reactStyle}
            className={commonClassName}
            onClick={(e) => {
              e.stopPropagation();
              onSelectNode(node.id);
            }}
          >
            {renderSelectionHeader()}
            {node.children?.map((child) => renderNode(child))}
          </div>
        );

      case "text":
        if (isEditing) {
          return (
            <div
              key={node.id}
              ref={editRef as unknown as React.Ref<HTMLDivElement>}
              data-node-id={node.id}
              data-node-kind={node.kind}
              contentEditable
              suppressContentEditableWarning
              style={reactStyle}
              onInput={(e) => setDraftContent(e.currentTarget.textContent || "")}
              onBlur={() => handleCommitInlineEdit(node)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  handleCancelInlineEdit();
                } else if (e.key === "Enter" && !node.id.includes("desc")) {
                  e.preventDefault();
                  handleCommitInlineEdit(node);
                }
              }}
              className={`${commonClassName} bg-blue-50/20 dark:bg-blue-950/30 outline-2 outline-blue-600 rounded px-1 min-w-[20px]`}
            >
              {node.content}
            </div>
          );
        }

        if (node.id.includes("heading")) {
          return (
            <h1
              key={node.id}
              data-node-id={node.id}
              data-node-kind={node.kind}
              style={reactStyle}
              className={commonClassName}
              onClick={(e) => {
                e.stopPropagation();
                onSelectNode(node.id);
              }}
              onDoubleClick={(e) => handleStartEditing(node, e)}
            >
              {renderSelectionHeader()}
              {node.content}
            </h1>
          );
        }

        if (node.id.includes("eyebrow") || node.id.includes("logo") || node.id.includes("brand")) {
          return (
            <span
              key={node.id}
              data-node-id={node.id}
              data-node-kind={node.kind}
              style={reactStyle}
              className={commonClassName}
              onClick={(e) => {
                e.stopPropagation();
                onSelectNode(node.id);
              }}
              onDoubleClick={(e) => handleStartEditing(node, e)}
            >
              {renderSelectionHeader()}
              {node.content}
            </span>
          );
        }

        return (
          <p
            key={node.id}
            data-node-id={node.id}
            data-node-kind={node.kind}
            style={reactStyle}
            className={commonClassName}
            onClick={(e) => {
              e.stopPropagation();
              onSelectNode(node.id);
            }}
            onDoubleClick={(e) => handleStartEditing(node, e)}
          >
            {renderSelectionHeader()}
            {node.content}
          </p>
        );

      case "button":
        return (
          <button
            key={node.id}
            type="button"
            data-node-id={node.id}
            data-node-kind={node.kind}
            style={reactStyle}
            className={commonClassName}
            onClick={(e) => {
              e.stopPropagation();
              onSelectNode(node.id);
            }}
            onDoubleClick={(e) => handleStartEditing(node, e)}
          >
            {renderSelectionHeader()}
            {node.content}
          </button>
        );

      case "link":
        return (
          <a
            key={node.id}
            href="#"
            data-node-id={node.id}
            data-node-kind={node.kind}
            style={reactStyle}
            className={commonClassName}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelectNode(node.id);
            }}
            onDoubleClick={(e) => handleStartEditing(node, e)}
          >
            {renderSelectionHeader()}
            {node.content}
          </a>
        );

      case "image":
        return (
          <div key={node.id} className="relative inline-block">
            {renderSelectionHeader()}
            <img
              data-node-id={node.id}
              data-node-kind="image"
              src={node.content}
              alt={node.name}
              style={reactStyle}
              className={commonClassName}
              onClick={(e) => {
                e.stopPropagation();
                onSelectNode(node.id);
              }}
            />
          </div>
        );

      default:
        return (
          <div
            key={node.id}
            data-node-id={node.id}
            data-node-kind={node.kind}
            style={reactStyle}
            className={commonClassName}
            onClick={(e) => {
              e.stopPropagation();
              onSelectNode(node.id);
            }}
          >
            {renderSelectionHeader()}
            {node.children?.map((child) => renderNode(child))}
          </div>
        );
    }
  };

  return (
    <div
      className="canvas-frame font-sans antialiased text-zinc-900 bg-white select-text cursor-default"
      onClick={() => onSelectNode(null)}
    >
      {model.elements.map((sectionNode, idx) =>
        renderNode(sectionNode, true, idx, model.elements.length)
      )}
    </div>
  );
};
