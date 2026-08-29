import type { EditCommand, ElementNode, ElementStyleProps, TemplateModel, ValidationError } from "./types";
import { findNodeById, getAllNodeIds, getDescendantIds, getAllNodes } from "./treeUtils";
import { ElementStylePropsSchema } from "./validation";

const TAGS = new Set(["main", "section", "div", "h1", "h2", "h3", "p", "span", "button", "a", "img", "input"]);
const VOID_TAGS = new Set(["img", "input"]);
const CSS_PROPERTY_MAP: Record<string, keyof ElementStyleProps> = {
  "font-family": "fontFamily", "font-weight": "fontWeight", "font-size": "fontSize", "line-height": "lineHeight",
  "letter-spacing": "letterSpacing", "text-align": "textAlign", color: "color", "background-color": "backgroundColor",
  "margin-top": "marginTop", "margin-bottom": "marginBottom", "padding-top": "paddingTop", "padding-bottom": "paddingBottom",
  "padding-left": "paddingLeft", "padding-right": "paddingRight", width: "width", height: "height", "border-radius": "borderRadius",
  "border-width": "borderWidth", "border-color": "borderColor", opacity: "opacity", display: "display", "flex-direction": "flexDirection",
  gap: "gap", "align-items": "alignItems", "justify-content": "justifyContent",
};
const CSS_NAME_MAP: Record<string, string> = Object.fromEntries(Object.entries(CSS_PROPERTY_MAP).map(([css, key]) => [key, css]));

export interface SyntaxValidationResult { valid: boolean; error?: string; line?: number; }
export interface MarkupAstNode { tag: string; id: string; attrs: Record<string, string>; content: string; children: MarkupAstNode[]; line: number; }

function lineAt(source: string, index: number): number { return source.slice(0, index).split("\n").length; }
function escapeHtml(value: string): string { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;"); }
function unescapeHtml(value: string): string { return value.replace(/&quot;/g, '"').replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&"); }

function expectedTag(node: ElementNode): string {
  if (node.tag) return node.tag;
  switch (node.kind) {
    case "section": return "section";
    case "container":
    case "card": return "div";
    case "button": return "button";
    case "link": return "a";
    case "image": return "img";
    case "input": return "input";
    case "text": return /heading/i.test(node.name) ? "h1" : /eyebrow|logo|brand/i.test(node.name) ? "span" : "p";
  }
}

function styleValueToCss(key: keyof ElementStyleProps, value: unknown): string {
  if (typeof value === "number") {
    if (key === "lineHeight" || key === "opacity") return String(value);
    if (key === "width") return `${value}%`;
    if (key === "fontWeight") return String(value);
    return `${value}px`;
  }
  return String(value);
}

export function stylePropsToCssString(props: ElementStyleProps): string {
  const ordered = Object.keys(props) as (keyof ElementStyleProps)[];
  return ordered.map((key) => props[key] === undefined ? "" : `${CSS_NAME_MAP[key]}: ${styleValueToCss(key, props[key])}`).filter(Boolean).join("; ");
}

function serializeNode(node: ElementNode, depth: number): string {
  const indent = "  ".repeat(depth);
  const tag = expectedTag(node);
  const style = stylePropsToCssString(node.baseProps);
  const styleAttr = style ? ` style="${escapeHtml(style)}"` : "";
  const idAttr = ` id="${escapeHtml(node.id)}"`;
  if (node.kind === "image") {
    return `${indent}<${tag}${idAttr} src="${escapeHtml(node.content ?? "")}" alt="${escapeHtml(node.name)}"${styleAttr} />`;
  }
  if (node.kind === "input") return `${indent}<${tag}${idAttr}${styleAttr} />`;
  if (node.children?.length) {
    return `${indent}<${tag}${idAttr}${styleAttr}>\n${node.children.map((child) => serializeNode(child, depth + 1)).join("\n")}\n${indent}</${tag}>`;
  }
  return `${indent}<${tag}${idAttr}${styleAttr}>${escapeHtml(node.content ?? "")}</${tag}>`;
}

export function templateToMarkup(target: ElementNode | TemplateModel, mode: "selected" | "full" = "selected"): string {
  if (mode === "selected" && "id" in target) return serializeNode(target, 0);
  if (!("elements" in target)) return serializeNode(target, 0);
  return `<main id="${escapeHtml(target.templateId)}">\n${target.elements.map((el) => serializeNode(el, 1)).join("\n")}\n</main>`;
}

function readTag(source: string, start: number): { end: number; raw: string } | SyntaxValidationResult {
  let quote: "'" | '"' | null = null;
  for (let i = start + 1; i < source.length; i++) {
    const c = source[i];
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === "'" || c === '"') { quote = c; continue; }
    if (c === ">") return { end: i, raw: source.slice(start, i + 1) };
  }
  return { valid: false, error: `Unclosed tag at line ${lineAt(source, start)}.`, line: lineAt(source, start) };
}

function parseAttributes(raw: string, line: number): { valid: true; attrs: Record<string, string>; selfClosing: boolean } | { valid: false; error: string; line: number } {
  let body = raw.trim().slice(1, -1).trim();
  const selfClosing = /\/$/.test(body);
  if (selfClosing) body = body.slice(0, -1).trim();
  const nameMatch = /^([A-Za-z0-9-]+)/.exec(body);
  if (!nameMatch) return { valid: false, error: `Invalid tag at line ${line}.`, line };
  body = body.slice(nameMatch[0].length).trim();
  const attrs: Record<string, string> = {};
  let i = 0;
  while (i < body.length) {
    while (/\s/.test(body[i] ?? "")) i++;
    if (i >= body.length) break;
    const name = /^[A-Za-z_:][-A-Za-z0-9_:.]*/.exec(body.slice(i));
    if (!name) return { valid: false, error: `Invalid attribute near line ${line}.`, line };
    const attrName = name[0].toLowerCase(); i += name[0].length;
    while (/\s/.test(body[i] ?? "")) i++;
    if (body[i] !== "=") return { valid: false, error: `Attribute ${attrName} must have a value at line ${line}.`, line };
    i++; while (/\s/.test(body[i] ?? "")) i++;
    const q = body[i];
    if (q !== '"' && q !== "'") return { valid: false, error: `Attribute ${attrName} must use quotes at line ${line}.`, line };
    i++; let value = ""; let closed = false;
    while (i < body.length) { if (body[i] === q) { closed = true; i++; break; } value += body[i++]; }
    if (!closed) return { valid: false, error: `Unclosed attribute ${attrName} at line ${line}.`, line };
    if (!["id", "style", "src", "alt", "href", "type"].includes(attrName)) return { valid: false, error: `Unsupported attribute ${attrName} at line ${line}.`, line };
    attrs[attrName] = unescapeHtml(value);
  }
  return { valid: true, attrs, selfClosing };
}

export function parseMarkupToAst(markup: string): { success: true; root: MarkupAstNode } | { success: false; error: ValidationError } {
  const root: MarkupAstNode = { tag: "__root__", id: "__root__", attrs: {}, content: "", children: [], line: 1 };
  const stack: MarkupAstNode[] = [root];
  let pos = 0;
  while (pos < markup.length) {
    if (markup.startsWith("<!--", pos)) { const end = markup.indexOf("-->", pos + 4); if (end < 0) return { success: false, error: { code: "SCHEMA_VALIDATION_FAILED", message: `Unclosed comment at line ${lineAt(markup, pos)}.` } }; pos = end + 3; continue; }
    if (markup[pos] !== "<") {
      const next = markup.indexOf("<", pos); const text = (next < 0 ? markup.slice(pos) : markup.slice(pos, next));
      if (stack.length > 1) stack[stack.length - 1].content += unescapeHtml(text);
      pos = next < 0 ? markup.length : next; continue;
    }
    const tagRead = readTag(markup, pos); if ("valid" in tagRead && !tagRead.valid) return { success: false, error: { code: "SCHEMA_VALIDATION_FAILED", message: tagRead.error!, details: { line: tagRead.line } } };
    if (!('raw' in tagRead)) throw new Error("unreachable");
    const raw = tagRead.raw; const line = lineAt(markup, pos); pos = tagRead.end + 1;
    const closing = /^<\/(?:\s*)?([A-Za-z0-9-]+)\s*>$/.exec(raw);
    if (closing) {
      const actual = closing[1].toLowerCase(); const open = stack[stack.length - 1];
      if (open.tag !== actual) return { success: false, error: { code: "SCHEMA_VALIDATION_FAILED", message: `Tag mismatch: Expected </${open.tag}> but found </${actual}> at line ${line}.`, details: { line } } };
      stack.pop(); continue;
    }
    const name = /^<([A-Za-z0-9-]+)/.exec(raw)?.[1]?.toLowerCase();
    if (!name || !TAGS.has(name)) return { success: false, error: { code: "SCHEMA_VALIDATION_FAILED", message: `Unsupported tag at line ${line}.`, details: { line } } };
    const attrsParsed = parseAttributes(raw, line); if (!attrsParsed.valid) return { success: false, error: { code: "SCHEMA_VALIDATION_FAILED", message: attrsParsed.error!, details: { line } } };
    const id = attrsParsed.attrs.id;
    if (!id) return { success: false, error: { code: "SCHEMA_VALIDATION_FAILED", message: `Every editable tag requires an id attribute at line ${line}.`, details: { line } } };
    const node: MarkupAstNode = { tag: name, id, attrs: attrsParsed.attrs, content: "", children: [], line };
    stack[stack.length - 1].children.push(node);
    if (!attrsParsed.selfClosing && !VOID_TAGS.has(name)) stack.push(node);
  }
  if (stack.length !== 1) { const open = stack[stack.length - 1]; return { success: false, error: { code: "SCHEMA_VALIDATION_FAILED", message: `Unclosed tag <${open.tag}> opened at line ${open.line}.`, details: { line: open.line } } }; }
  return { success: true, root };
}

export function validateMarkupSyntax(markup: string): SyntaxValidationResult {
  if (!markup.trim()) return { valid: false, error: "Code cannot be empty.", line: 1 };
  const js = /(^|[^\\])\{[^}]*\}/m.exec(markup); if (js) return { valid: false, error: "Dynamic JavaScript expressions are not supported. Use controlled HTML only.", line: lineAt(markup, js.index) };
  const parsed = parseMarkupToAst(markup); return parsed.success ? { valid: true } : { valid: false, error: parsed.error.message, line: typeof parsed.error.details === "object" && parsed.error.details && "line" in parsed.error.details ? Number((parsed.error.details as {line:number}).line) : 1 };
}

function parseCssNumeric(raw: string, key: keyof ElementStyleProps): number | string | null {
  const plain = raw.trim();
  if (key === "width") {
    if (plain === "auto" || plain === "100%") return plain;
    const m = /^(\d+(?:\.\d+)?)%$/.exec(plain);
    return m ? parseFloat(m[1]) : null;
  }
  if (key === "height") {
    if (plain === "auto") return plain;
    const m = /^(\d+(?:\.\d+)?)px$/.exec(plain);
    return m ? parseFloat(m[1]) : null;
  }
  if (key === "lineHeight" || key === "opacity") {
    const m = /^-?\d+(?:\.\d+)?$/.exec(plain);
    return m ? parseFloat(m[0]) : null;
  }
  if (key === "fontWeight") {
    const m = /^\d+$/.exec(plain);
    return m ? parseInt(m[0], 10) : null;
  }
  const m = /^-?\d+(?:\.\d+)?px$/.exec(plain);
  return m ? parseFloat(plain) : null;
}

export function parseStyleString(styleStr: string): { valid: true; props: Partial<ElementStyleProps> } | { valid: false; error: string; invalidProperty: string } {
  const result: Partial<ElementStyleProps> = {};
  if (!styleStr.trim()) return { valid: true, props: result };
  for (const declaration of styleStr.split(";")) {
    if (!declaration.trim()) continue;
    const colon = declaration.indexOf(":"); if (colon < 1) return { valid: false, error: "Malformed CSS declaration.", invalidProperty: declaration.trim() };
    const property = declaration.slice(0, colon).trim().toLowerCase(); const rawValue = declaration.slice(colon + 1).trim();
    const key = CSS_PROPERTY_MAP[property]; if (!key) return { valid: false, error: `Unsupported CSS property "${property}".`, invalidProperty: property };
    let value: unknown = rawValue;
    if (["fontSize","fontWeight","borderRadius","borderWidth","gap","marginTop","marginBottom","paddingTop","paddingBottom","paddingLeft","paddingRight","letterSpacing","lineHeight","opacity","width","height"].includes(key)) {
      const parsed = parseCssNumeric(rawValue, key);
      if (parsed === null) return { valid: false, error: `Invalid value "${rawValue}" for ${property}.`, invalidProperty: property };
      value = parsed;
    }
    (result as Record<string, unknown>)[key] = value;
  }
  const checked = ElementStylePropsSchema.safeParse(result);
  if (!checked.success) {
    return { valid: false, error: "One or more style values are outside the supported range.", invalidProperty: "style" };
  }
  return { valid: true, props: result };
}

function flattenAst(nodes: MarkupAstNode[], out: MarkupAstNode[] = []): MarkupAstNode[] { for (const n of nodes) { out.push(n); flattenAst(n.children, out); } return out; }
function stylePatchForDifference(node: ElementNode, parsed: Partial<ElementStyleProps>): Partial<ElementStyleProps> {
  const patch: Partial<ElementStyleProps> = {};
  const keys = new Set([...Object.keys(node.baseProps), ...Object.keys(parsed)] as (keyof ElementStyleProps)[]);
  for (const key of keys) if (node.baseProps[key] !== parsed[key]) (patch as Record<string, unknown>)[key] = parsed[key];
  return patch;
}

export function reconcileMarkupToCommand(
  model: TemplateModel,
  markup: string,
  baseRevision: number,
  mode: "selected" | "full" = "selected",
  selectedId?: string,
): { success: true; command: EditCommand } | { success: false; error: ValidationError } {
  const parsed = parseMarkupToAst(markup); if (!parsed.success) return parsed;
  const editable = parsed.root.children;
  if (mode === "full") {
    if (editable.length !== 1 || editable[0].tag !== "main" || editable[0].id !== model.templateId) return { success: false, error: { code: "SCHEMA_VALIDATION_FAILED", message: "Full Template mode must contain exactly one main root with the canonical template ID." } };
  }
  const flat = flattenAst(parsed.root.children);
  const editableWithoutRoot = flat.filter((n) => n.id !== model.templateId);
  const existingIds = getAllNodeIds(model.elements, model.templateId);
  const seen = new Set<string>();
  for (const n of editableWithoutRoot) {
    if (seen.has(n.id)) return { success: false, error: { code: "SCHEMA_VALIDATION_FAILED", message: `Duplicate element ID "${n.id}" in markup.` } };
    seen.add(n.id);
    if (!existingIds.has(n.id)) return { success: false, error: { code: "TARGET_NOT_FOUND", message: `Unknown element ID "${n.id}" in markup.` } };
    const canonical = findNodeById(model.elements, n.id)!;
    if (expectedTag(canonical) !== n.tag) return { success: false, error: { code: "SCHEMA_VALIDATION_FAILED", message: `Tag <${n.tag}> is incompatible with canonical element ${n.id}; expected <${expectedTag(canonical)}>.` } };
    const style = n.attrs.style ? parseStyleString(n.attrs.style) : { valid: true as const, props: {} };
    if (!style.valid) return { success: false, error: { code: "SCHEMA_VALIDATION_FAILED", message: style.error, details: { invalidProperty: style.invalidProperty, line: n.line } } };
    if (canonical.kind === "image" && n.attrs.src === undefined) return { success: false, error: { code: "SCHEMA_VALIDATION_FAILED", message: `Image ${n.id} must preserve its src attribute.`, details: { line: n.line } } };
  }
  if (mode === "selected") {
    if (!selectedId) return { success: false, error: { code: "NO_SELECTION", message: "Select an element before editing scoped code." } };
    const selectedIds = new Set(getDescendantIds(findNodeById(model.elements, selectedId)!));
    if (editableWithoutRoot.length === 0 || !selectedIds.has(editableWithoutRoot[0].id) || editableWithoutRoot.some((n) => !selectedIds.has(n.id))) return { success: false, error: { code: "INVALID_SCOPE_SELECTION", message: "Scoped code may only edit the selected element and its descendants." } };
  } else {
    const canonicalIds = new Set(getAllNodes(model.elements).map((n) => n.id));
    const submittedIds = new Set(editableWithoutRoot.map((n) => n.id));
    const missing = [...canonicalIds].filter((id) => !submittedIds.has(id));
    if (missing.length) return { success: false, error: { code: "DELETED_REQUIRED_ID", message: `Required element IDs were removed: ${missing.join(", ")}.` } };
  }

  const patches: Record<string, { content?: string; styleProps?: Partial<ElementStyleProps> }> = {};
  for (const n of editableWithoutRoot) {
    const canonical = findNodeById(model.elements, n.id)!;
    const styleResult = n.attrs.style ? parseStyleString(n.attrs.style) : { valid: true as const, props: {} };
    const styleProps = styleResult.valid ? stylePatchForDifference(canonical, styleResult.props) : {};
    const content = canonical.kind === "image" ? n.attrs.src ?? "" : n.children.length ? undefined : n.content;
    const patch: { content?: string; styleProps?: Partial<ElementStyleProps> } = {};
    if (content !== undefined && content !== (canonical.content ?? "")) patch.content = content;
    if (styleProps && Object.keys(styleProps).length > 0) patch.styleProps = styleProps;
    if (patch.content !== undefined || patch.styleProps !== undefined) patches[n.id] = patch;
  }
  const targetIds = Object.keys(patches);
  if (!targetIds.length) return { success: false, error: { code: "NO_CHANGES", message: "Markup is identical to the canonical state." } };
  const command: EditCommand = { commandId: `code-${baseRevision}-${targetIds.join("-")}`, source: "code_editor", targetIds, scope: "all", baseRevision, changes: { patches }, metadata: { description: "Code editor reconciliation" } };
  return { success: true, command };
}
