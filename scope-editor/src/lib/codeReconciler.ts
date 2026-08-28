import type {
  ElementNode,
  TemplateModel,
  ElementStyleProps,
  EditCommand,
  ValidationError,
} from "./types";
import { findNodeById, getAllNodeIds } from "./treeUtils";

// ============================================================
// 1. HTML ESCAPING UTILITIES
// ============================================================

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function unescapeHtml(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

// ============================================================
// 2. SERIALIZER: Canonical Base Layer -> Controlled HTML
// ============================================================

/**
 * Maps typed ElementStyleProps into inline style="..." CSS string.
 */
export function stylePropsToCssString(props: ElementStyleProps): string {
  const declarations: string[] = [];

  if (props.fontFamily) declarations.push(`font-family: ${props.fontFamily}`);
  if (props.fontWeight) declarations.push(`font-weight: ${props.fontWeight}`);
  if (props.fontSize) declarations.push(`font-size: ${props.fontSize}px`);
  if (props.lineHeight) declarations.push(`line-height: ${props.lineHeight}`);
  if (props.letterSpacing !== undefined) declarations.push(`letter-spacing: ${props.letterSpacing}px`);
  if (props.textAlign) declarations.push(`text-align: ${props.textAlign}`);
  if (props.color) declarations.push(`color: ${props.color}`);
  if (props.backgroundColor) declarations.push(`background-color: ${props.backgroundColor}`);
  if (props.marginTop !== undefined) declarations.push(`margin-top: ${props.marginTop}px`);
  if (props.marginBottom !== undefined) declarations.push(`margin-bottom: ${props.marginBottom}px`);
  if (props.paddingTop !== undefined) declarations.push(`padding-top: ${props.paddingTop}px`);
  if (props.paddingBottom !== undefined) declarations.push(`padding-bottom: ${props.paddingBottom}px`);
  if (props.paddingLeft !== undefined) declarations.push(`padding-left: ${props.paddingLeft}px`);
  if (props.paddingRight !== undefined) declarations.push(`padding-right: ${props.paddingRight}px`);
  if (props.width !== undefined) {
    declarations.push(`width: ${typeof props.width === "number" ? `${props.width}px` : props.width}`);
  }
  if (props.height !== undefined) {
    declarations.push(`height: ${typeof props.height === "number" ? `${props.height}px` : props.height}`);
  }
  if (props.borderRadius !== undefined) declarations.push(`border-radius: ${props.borderRadius}px`);
  if (props.borderWidth !== undefined) declarations.push(`border-width: ${props.borderWidth}px`);
  if (props.borderColor) declarations.push(`border-color: ${props.borderColor}`);
  if (props.opacity !== undefined) declarations.push(`opacity: ${props.opacity}`);
  if (props.display) declarations.push(`display: ${props.display}`);
  if (props.flexDirection) declarations.push(`flex-direction: ${props.flexDirection}`);
  if (props.gap !== undefined) declarations.push(`gap: ${props.gap}px`);
  if (props.alignItems) declarations.push(`align-items: ${props.alignItems}`);
  if (props.justifyContent) declarations.push(`justify-content: ${props.justifyContent}`);

  return declarations.join("; ");
}

/**
 * Maps element kind and ID to an appropriate semantic HTML tag.
 */
function getHtmlTagForNode(node: ElementNode): string {
  if (node.kind === "section") return "section";
  if (node.kind === "button") return "button";
  if (node.kind === "link") return "a";
  if (node.kind === "image") return "img";
  if (node.kind === "text") {
    if (node.id.includes("heading")) return "h1";
    if (node.id.includes("eyebrow")) return "span";
    if (node.id.includes("brand") || node.id.includes("logo")) return "span";
    return "p";
  }
  return "div";
}

/**
 * Recursively serializes an ElementNode to formatted HTML.
 */
function serializeNode(node: ElementNode, depth: number): string {
  const indent = "  ".repeat(depth);
  const tag = getHtmlTagForNode(node);
  const styleStr = stylePropsToCssString(node.baseProps);
  const styleAttr = styleStr ? ` style="${styleStr}"` : "";
  const idAttr = ` id="${node.id}"`;

  // Self-closing image tag
  if (node.kind === "image") {
    const srcAttr = node.content ? ` src="${escapeHtml(node.content)}"` : "";
    return `${indent}<${tag}${idAttr}${srcAttr} alt="${escapeHtml(node.name)}"${styleAttr} />`;
  }

  // Children or content
  if (node.children && node.children.length > 0) {
    const childrenStr = node.children.map((c) => serializeNode(c, depth + 1)).join("\n");
    return `${indent}<${tag}${idAttr}${styleAttr}>\n${childrenStr}\n${indent}</${tag}>`;
  }

  const content = node.content ? escapeHtml(node.content) : "";
  if (content.includes("\n")) {
    const formattedLines = content
      .split("\n")
      .map((l) => `${indent}  ${l}`)
      .join("\n");
    return `${indent}<${tag}${idAttr}${styleAttr}>\n${formattedLines}\n${indent}</${tag}>`;
  }

  return `${indent}<${tag}${idAttr}${styleAttr}>${content}</${tag}>`;
}

/**
 * Serializes an element or full template model to clean controlled HTML markup.
 */
export function templateToMarkup(
  target: ElementNode | TemplateModel,
  mode: "selected" | "full" = "selected"
): string {
  if (mode === "selected" && "id" in target) {
    return serializeNode(target as ElementNode, 0);
  }

  const model = "elements" in target ? (target as TemplateModel) : null;
  if (!model) {
    return serializeNode(target as ElementNode, 0);
  }

  const inner = model.elements.map((el) => serializeNode(el, 1)).join("\n");
  return `<main id="${model.templateId}">\n${inner}\n</main>`;
}

// ============================================================
// 3. STYLE PARSER & RANGE VALIDATOR: CSS String -> ElementStyleProps
// ============================================================

const CSS_PROPERTY_MAP: Record<string, keyof ElementStyleProps> = {
  "font-family": "fontFamily",
  "font-weight": "fontWeight",
  "font-size": "fontSize",
  "line-height": "lineHeight",
  "letter-spacing": "letterSpacing",
  "text-align": "textAlign",
  color: "color",
  "background-color": "backgroundColor",
  "margin-top": "marginTop",
  "margin-bottom": "marginBottom",
  "padding-top": "paddingTop",
  "padding-bottom": "paddingBottom",
  "padding-left": "paddingLeft",
  "padding-right": "paddingRight",
  width: "width",
  height: "height",
  "border-radius": "borderRadius",
  "border-width": "borderWidth",
  "border-color": "borderColor",
  opacity: "opacity",
  display: "display",
  "flex-direction": "flexDirection",
  gap: "gap",
  "align-items": "alignItems",
  "justify-content": "justifyContent",
};

/**
 * Parses inline style="..." string into typed ElementStyleProps.
 * Rejects unwhitelisted properties or out-of-bounds/invalid values explicitly.
 */
export function parseStyleString(
  styleStr: string
): { valid: true; props: Partial<ElementStyleProps> } | { valid: false; error: string; invalidProperty: string } {
  const result: Partial<ElementStyleProps> = {};
  const declarations = styleStr.split(";").map((s) => s.trim()).filter(Boolean);

  for (const decl of declarations) {
    const colonIdx = decl.indexOf(":");
    if (colonIdx === -1) continue;

    const property = decl.substring(0, colonIdx).trim().toLowerCase();
    const rawValue = decl.substring(colonIdx + 1).trim();

    const typedKey = CSS_PROPERTY_MAP[property];
    if (!typedKey) {
      return {
        valid: false,
        error: `Unsupported CSS property "${property}". Only whitelisted layout and typography properties are allowed.`,
        invalidProperty: property,
      };
    }

    // Strict value parsing and range enforcement
    if (typedKey === "fontSize") {
      const num = parseFloat(rawValue);
      if (isNaN(num) || num < 8 || num > 160) {
        return {
          valid: false,
          error: `Invalid value for font-size: "${rawValue}". Expected a number between 8 and 160.`,
          invalidProperty: property,
        };
      }
      result.fontSize = num;
    } else if (typedKey === "fontWeight") {
      const num = parseInt(rawValue, 10);
      const validWeights = [300, 400, 500, 600, 700, 800];
      if (isNaN(num) || !validWeights.includes(num)) {
        return {
          valid: false,
          error: `Invalid value for font-weight: "${rawValue}". Expected one of: ${validWeights.join(", ")}.`,
          invalidProperty: property,
        };
      }
      result.fontWeight = num as 300 | 400 | 500 | 600 | 700 | 800;
    } else if (typedKey === "lineHeight") {
      const num = parseFloat(rawValue);
      if (isNaN(num) || num < 0.5 || num > 3.0) {
        return {
          valid: false,
          error: `Invalid value for line-height: "${rawValue}". Expected a number between 0.5 and 3.0.`,
          invalidProperty: property,
        };
      }
      result.lineHeight = num;
    } else if (typedKey === "letterSpacing") {
      const num = parseFloat(rawValue);
      if (isNaN(num) || num < -5 || num > 20) {
        return {
          valid: false,
          error: `Invalid value for letter-spacing: "${rawValue}". Expected a number between -5 and 20.`,
          invalidProperty: property,
        };
      }
      result.letterSpacing = num;
    } else if (typedKey === "borderRadius") {
      const num = parseFloat(rawValue);
      if (isNaN(num) || num < 0 || num > 100) {
        return {
          valid: false,
          error: `Invalid value for border-radius: "${rawValue}". Expected a number between 0 and 100.`,
          invalidProperty: property,
        };
      }
      result.borderRadius = num;
    } else if (typedKey === "borderWidth") {
      const num = parseFloat(rawValue);
      if (isNaN(num) || num < 0 || num > 20) {
        return {
          valid: false,
          error: `Invalid value for border-width: "${rawValue}". Expected a number between 0 and 20.`,
          invalidProperty: property,
        };
      }
      result.borderWidth = num;
    } else if (typedKey === "opacity") {
      const num = parseFloat(rawValue);
      if (isNaN(num) || num < 0 || num > 1) {
        return {
          valid: false,
          error: `Invalid value for opacity: "${rawValue}". Expected a number between 0 and 1.`,
          invalidProperty: property,
        };
      }
      result.opacity = num;
    } else if (typedKey === "gap" || typedKey === "marginTop" || typedKey === "marginBottom" || typedKey === "paddingTop" || typedKey === "paddingBottom" || typedKey === "paddingLeft" || typedKey === "paddingRight") {
      const num = parseFloat(rawValue);
      if (isNaN(num)) {
        return {
          valid: false,
          error: `Invalid numeric value for "${property}": "${rawValue}".`,
          invalidProperty: property,
        };
      }
      (result as Record<string, unknown>)[typedKey] = num;
    } else if (typedKey === "width" || typedKey === "height") {
      if (rawValue === "auto" || rawValue === "100%") {
        (result as Record<string, unknown>)[typedKey] = rawValue;
      } else {
        const num = parseFloat(rawValue);
        if (isNaN(num)) {
          return {
            valid: false,
            error: `Invalid value for ${property}: "${rawValue}". Expected "auto", "100%", or numeric pixel value.`,
            invalidProperty: property,
          };
        }
        (result as Record<string, unknown>)[typedKey] = num;
      }
    } else {
      (result as Record<string, unknown>)[typedKey] = rawValue;
    }
  }

  return { valid: true, props: result };
}

// ============================================================
// 4. RECURSIVE AST PARSER FOR CONTROLLED HTML SUBSET
// ============================================================

export interface AstNode {
  tag: string;
  id?: string;
  attributes: Record<string, string>;
  styleProps: Partial<ElementStyleProps>;
  children: (AstNode | string)[];
  line: number;
}

export interface AstParseResult {
  valid: boolean;
  ast?: AstNode[];
  error?: string;
  line?: number;
}

/**
 * Parses raw HTML string into a structured AST tree.
 * Validates tag balance, self-closing tags, and rejects dynamic JS expressions.
 */
export function parseMarkupToAst(markup: string): AstParseResult {
  const lines = markup.split("\n");

  // Check 1: Reject dynamic JS expressions outside quotes
  let inDoubleQuotes = false;
  let inSingleQuotes = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"' && !inSingleQuotes) inDoubleQuotes = !inDoubleQuotes;
      if (char === "'" && !inDoubleQuotes) inSingleQuotes = !inSingleQuotes;

      if (!inDoubleQuotes && !inSingleQuotes) {
        if (char === "{" || char === "}") {
          return {
            valid: false,
            error: "Dynamic JavaScript expressions are not supported. Code editor supports standard HTML markup only.",
            line: i + 1,
          };
        }
      }
    }
  }

  // Tokenize markup into tags and text chunks
  const rootNodes: AstNode[] = [];
  const nodeStack: AstNode[] = [];

  const tagTokenRegex = /(<!--[\s\S]*?-->)|(<(?:\/)?([a-zA-Z0-9]+)([^>]*?)(\/?)>)|([^<]+)/g;
  let match: RegExpExecArray | null;

  while ((match = tagTokenRegex.exec(markup)) !== null) {
    const fullMatch = match[0];
    const isComment = match[1] !== undefined;
    const isTag = match[2] !== undefined;
    const textChunk = match[6];

    const currentLine = markup.substring(0, match.index).split("\n").length;

    if (isComment) {
      continue;
    }

    if (textChunk) {
      const trimmed = textChunk.trim();
      if (trimmed.length > 0) {
        const unescaped = unescapeHtml(trimmed);
        if (nodeStack.length > 0) {
          nodeStack[nodeStack.length - 1].children.push(unescaped);
        }
      }
      continue;
    }

    if (isTag) {
      const isClosing = fullMatch.startsWith("</");
      const tagName = match[3].toLowerCase();
      const rawAttrs = match[4] || "";
      const isSelfClosing = match[5] === "/" || tagName === "img" || tagName === "input" || tagName === "br" || tagName === "hr";

      if (isClosing) {
        if (nodeStack.length === 0) {
          return {
            valid: false,
            error: `Unexpected closing tag </${tagName}> at line ${currentLine} with no matching open tag.`,
            line: currentLine,
          };
        }

        const top = nodeStack.pop()!;
        if (top.tag !== tagName) {
          return {
            valid: false,
            error: `Tag mismatch: Expected closing tag </${top.tag}> (opened at line ${top.line}) but found </${tagName}> at line ${currentLine}.`,
            line: currentLine,
          };
        }
        continue;
      }

      // Parse attributes
      const attributes: Record<string, string> = {};
      const attrRegex = /([a-zA-Z0-9_-]+)(?:=["']([^"']*)["'])?/g;
      let attrMatch: RegExpExecArray | null;
      while ((attrMatch = attrRegex.exec(rawAttrs)) !== null) {
        const attrName = attrMatch[1].toLowerCase();
        const attrVal = attrMatch[2] !== undefined ? unescapeHtml(attrMatch[2]) : "";
        attributes[attrName] = attrVal;
      }

      const id = attributes["id"];

      // Parse inline styles if present
      let styleProps: Partial<ElementStyleProps> = {};
      if (attributes["style"]) {
        const parsedStyle = parseStyleString(attributes["style"]);
        if (!parsedStyle.valid) {
          return {
            valid: false,
            error: `Line ${currentLine}: ${parsedStyle.error}`,
            line: currentLine,
          };
        }
        styleProps = parsedStyle.props;
      }

      const node: AstNode = {
        tag: tagName,
        id,
        attributes,
        styleProps,
        children: [],
        line: currentLine,
      };

      if (isSelfClosing) {
        if (nodeStack.length > 0) {
          nodeStack[nodeStack.length - 1].children.push(node);
        } else {
          rootNodes.push(node);
        }
      } else {
        if (nodeStack.length > 0) {
          nodeStack[nodeStack.length - 1].children.push(node);
        } else {
          rootNodes.push(node);
        }
        nodeStack.push(node);
      }
    }
  }

  if (nodeStack.length > 0) {
    const unclosed = nodeStack[nodeStack.length - 1];
    return {
      valid: false,
      error: `Unclosed tag <${unclosed.tag}> opened at line ${unclosed.line}.`,
      line: unclosed.line,
    };
  }

  return {
    valid: true,
    ast: rootNodes,
  };
}

/**
 * Public syntax validator for live UI feedback.
 */
export function validateMarkupSyntax(markup: string): { valid: boolean; error?: string; line?: number } {
  const result = parseMarkupToAst(markup);
  if (!result.valid) {
    return {
      valid: false,
      error: result.error,
      line: result.line,
    };
  }
  return { valid: true };
}

// ============================================================
// 5. DIFF RECONCILER: AST -> Typed EditCommand
// ============================================================

/**
 * Flattens all AST element nodes across the tree.
 */
function collectAstElements(nodes: (AstNode | string)[]): AstNode[] {
  const elements: AstNode[] = [];

  for (const node of nodes) {
    if (typeof node !== "string") {
      elements.push(node);
      if (node.children.length > 0) {
        elements.push(...collectAstElements(node.children));
      }
    }
  }

  return elements;
}

/**
 * Extracts leaf text content from an AST node's string children.
 */
function extractLeafTextContent(node: AstNode): string {
  return node.children
    .filter((c): c is string => typeof c === "string")
    .join(" ")
    .trim();
}

/**
 * Hardened reconciler: validates AST, verifies ID presence, checks deleted IDs in full mode,
 * enforces selected-component scope, and generates precise per-target patches.
 */
export function reconcileMarkupToCommand(
  model: TemplateModel,
  markup: string,
  baseRevision: number,
  mode: "selected" | "full" = "selected",
  selectedId?: string
): { success: true; command: EditCommand } | { success: false; error: ValidationError } {
  // Step 1: Parse AST with full syntax, tag, and style verification
  const parseResult = parseMarkupToAst(markup);
  if (!parseResult.valid || !parseResult.ast) {
    return {
      success: false,
      error: {
        code: "SCHEMA_VALIDATION_FAILED",
        message: parseResult.error ?? "Invalid markup syntax.",
        details: { line: parseResult.line },
      },
    };
  }

  const allAstElements = collectAstElements(parseResult.ast);
  if (allAstElements.length === 0) {
    return {
      success: false,
      error: {
        code: "NO_CHANGES",
        message: "No HTML elements found in markup.",
      },
    };
  }

  // Step 2: Enforce that EVERY element has an ID
  for (const el of allAstElements) {
    if (!el.id) {
      return {
        success: false,
        error: {
          code: "SCHEMA_VALIDATION_FAILED",
          message: `Element <${el.tag}> at line ${el.line} is missing a required 'id' attribute. Element IDs must not be removed.`,
          details: { tag: el.tag, line: el.line },
        },
      };
    }
  }

  // Step 3: Validate IDs against canonical tree
  const existingNodeIds = getAllNodeIds(model.elements);
  const astElementIds = new Set<string>();

  for (const el of allAstElements) {
    const id = el.id!;
    // Skip root template ID wrapper in full mode
    if (id === model.templateId) {
      continue;
    }

    if (!existingNodeIds.has(id)) {
      return {
        success: false,
        error: {
          code: "TARGET_NOT_FOUND",
          message: `Unknown element ID "${id}" at line ${el.line}. Code editor only supports editing existing canonical elements.`,
          details: { unknownId: id, line: el.line },
        },
      };
    }

    astElementIds.add(id);
  }

  // Step 4: Enforce Scope Constraints
  if (mode === "selected" && selectedId) {
    const rootAst = parseResult.ast[0];
    if (rootAst.id !== selectedId) {
      return {
        success: false,
        error: {
          code: "INVALID_SCOPE_SELECTION",
          message: `Selected-component mode only permits editing the selected element "${selectedId}". Found root element "${rootAst.id}".`,
          details: { expectedId: selectedId, actualId: rootAst.id },
        },
      };
    }
  } else if (mode === "full") {
    // In full mode, verify that NO required canonical IDs have been deleted
    for (const requiredId of existingNodeIds) {
      if (!astElementIds.has(requiredId)) {
        return {
          success: false,
          error: {
            code: "DELETED_REQUIRED_ID",
            message: `Required canonical element ID "${requiredId}" was removed from the markup. In Full Template mode, all elements must retain their IDs.`,
            details: { missingId: requiredId },
          },
        };
      }
    }
  }

  // Step 5: Calculate Precise Per-Target Diffs
  const changedTargetIds: string[] = [];
  const targetPatches: Record<string, { content?: string; styleProps?: Partial<ElementStyleProps> }> = {};

  for (const el of allAstElements) {
    const id = el.id!;
    if (id === model.templateId) continue;

    const node = findNodeById(model.elements, id)!;
    let nodeChanged = false;
    const patch: { content?: string; styleProps?: Partial<ElementStyleProps> } = {};

    // Check content change (for leaf text/button/link/image elements)
    if (node.kind === "text" || node.kind === "button" || node.kind === "link") {
      const parsedText = extractLeafTextContent(el);
      if (parsedText && parsedText !== (node.content ?? "")) {
        patch.content = parsedText;
        nodeChanged = true;
      }
    } else if (node.kind === "image" && el.attributes["src"]) {
      if (el.attributes["src"] !== (node.content ?? "")) {
        patch.content = el.attributes["src"];
        nodeChanged = true;
      }
    }

    // Check style property differences against baseProps
    const styleDiff: Partial<ElementStyleProps> = {};
    for (const [key, val] of Object.entries(el.styleProps)) {
      const typedKey = key as keyof ElementStyleProps;
      if (node.baseProps[typedKey] !== val) {
        (styleDiff as Record<string, unknown>)[typedKey] = val;
        nodeChanged = true;
      }
    }

    if (Object.keys(styleDiff).length > 0) {
      patch.styleProps = styleDiff;
    }

    if (nodeChanged) {
      changedTargetIds.push(id);
      targetPatches[id] = patch;
    }
  }

  if (changedTargetIds.length === 0) {
    return {
      success: false,
      error: {
        code: "NO_CHANGES",
        message: "Markup is identical to canonical state. No modifications detected.",
      },
    };
  }

  // Construct typed EditCommand with granular patches
  const command: EditCommand = {
    commandId: `cmd_code_${Date.now()}`,
    source: "code_editor",
    targetIds: changedTargetIds,
    scope: "all",
    baseRevision,
    changes: {
      patches: targetPatches,
    },
    metadata: {
      description: `Code editor reconciliation for ${changedTargetIds.join(", ")}`,
    },
  };

  return {
    success: true,
    command,
  };
}
