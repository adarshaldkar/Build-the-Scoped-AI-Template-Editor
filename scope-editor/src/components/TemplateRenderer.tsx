import React, { useEffect, useRef, useState } from "react";
import type { EditCommand, ElementNode, ElementStyleProps, TemplateModel, Viewport } from "../lib/types";

import { resolveElementProps } from "../lib/resolver";


interface Props {
  model: TemplateModel;
  activeViewport: Viewport;
  selectedNodeIds: string[];
  onSelectNode: (id: string, additive: boolean) => void;
  onCommitCommand: (command: EditCommand) => { success: boolean; error?: { message: string } };
}

function toCss(style: ElementStyleProps): React.CSSProperties {
  return {
    fontFamily: style.fontFamily,
    fontWeight: style.fontWeight,
    fontSize: style.fontSize ? `${style.fontSize}px` : undefined,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing !== undefined ? `${style.letterSpacing}px` : undefined,
    textAlign: style.textAlign,
    color: style.color,
    backgroundColor: style.backgroundColor,
    marginTop: style.marginTop,
    marginBottom: style.marginBottom,
    paddingTop: style.paddingTop,
    paddingBottom: style.paddingBottom,
    paddingLeft: style.paddingLeft,
    paddingRight: style.paddingRight,
    width: typeof style.width === "number" ? `${style.width}%` : style.width,
    height: typeof style.height === "number" ? `${style.height}px` : style.height,
    borderRadius: style.borderRadius,
    borderWidth: style.borderWidth,
    borderColor: style.borderColor,
    borderStyle: style.borderWidth ? "solid" : undefined,
    opacity: style.opacity,
    display: style.display,
    flexDirection: style.flexDirection,
    gap: style.gap,
    alignItems: style.alignItems,
    justifyContent: style.justifyContent,
    boxSizing: "border-box",
  };
}

export const TemplateRenderer: React.FC<Props> = ({ model, activeViewport, selectedNodeIds, onSelectNode, onCommitCommand }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (!editingId) return;
    const element = editRefs.current[editingId];
    if (!element) return;
    element.focus();
    const range = document.createRange(); range.selectNodeContents(element); range.collapse(false);
    const sel = window.getSelection(); sel?.removeAllRanges(); sel?.addRange(range);
  }, [editingId]);


  const startEdit = (node: ElementNode) => {
    if (!node.content || !["text", "button", "link"].includes(node.kind)) return;
    setEditingId(node.id);
    onSelectNode(node.id, false);
  };

  const commitText = (node: ElementNode, value: string) => {
    setEditingId(null);
    if (value === (node.content ?? "")) return;
    const command: EditCommand = {
      commandId: `canvas-text-${model.revision}-${node.id}`,
      source: "canvas", targetIds: [node.id], scope: "all", baseRevision: model.revision,
      changes: { patches: { [node.id]: { content: value } } },
      metadata: { description: `Inline edit: ${node.name}` },
    };
    const result = onCommitCommand(command);
    if (!result.success) window.setTimeout(() => setEditingId(node.id), 0);
  };


  const renderNode = (node: ElementNode): React.ReactNode => {
    const style = resolveElementProps(node, activeViewport);
    const selected = selectedNodeIds.includes(node.id);
    const editing = editingId === node.id;
    const tag = node.tag ?? (node.kind === "section" ? "section" : node.kind === "button" ? "button" : node.kind === "link" ? "a" : node.kind === "image" ? "img" : node.kind === "input" ? "input" : node.kind === "text" ? (/heading/i.test(node.name) ? "h1" : "p") : "div");
    const commonProps = {
      "data-node-id": node.id,
      "data-node-kind": node.kind,
      style: { ...toCss(style), ...(selected ? { outline: "2px solid #2563eb", outlineOffset: 2 } : {}) },
      onClick: (e: React.MouseEvent) => { e.stopPropagation(); onSelectNode(node.id, e.shiftKey || e.metaKey || e.ctrlKey); },
      onDoubleClick: (e: React.MouseEvent) => { e.stopPropagation(); startEdit(node); },
    };
    const editableProps = editing ? { contentEditable: true, suppressContentEditableWarning: true, ref: (el: HTMLElement | null) => { editRefs.current[node.id] = el; }, onInput: () => {}, onBlur: (e: React.FocusEvent<HTMLElement>) => commitText(node, e.currentTarget.innerText), onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => { if (e.key === "Escape") { setEditingId(null); e.preventDefault(); } else if (e.key === "Enter" && (node.kind === "button" || node.tag === "h1" || node.tag === "h2" || node.tag === "h3")) { e.preventDefault(); e.currentTarget.blur(); } } } : {};

    let element: React.ReactNode;
    if (node.kind === "image") element = React.createElement("img", { ...commonProps, src: node.content ?? "", alt: node.name });
    else if (node.kind === "input") element = React.createElement("input", { ...commonProps, type: "text", value: node.content ?? "", readOnly: true, onChange: () => undefined });
    else if (node.children?.length) {
      element = React.createElement(tag, commonProps, node.children.map(renderNode));
    } else {
      const content = editing ? (node.content ?? "") : (node.content ?? "");
      element = React.createElement(tag, { ...commonProps, ...(node.kind === "link" ? { href: "#", onMouseDown: (e: React.MouseEvent) => e.preventDefault() } : {}), ...editableProps }, content);
    }


    return element;
  };

  return <div className="min-h-full" data-testid="template-canvas">{model.elements.map(renderNode)}</div>;
};
