export type Viewport = "desktop" | "tablet" | "mobile";
export type Scope = "all" | Viewport;
export type EditSource = "canvas" | "inspector" | "code_editor" | "ai_assistant" | "history_restore";

export interface ElementStyleProps {
  fontFamily?: string;
  fontWeight?: 300 | 400 | 500 | 600 | 700 | 800;
  fontSize?: number;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: "left" | "center" | "right" | "justify";
  color?: string;
  backgroundColor?: string;
  marginTop?: number;
  marginBottom?: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  width?: number | "auto" | "100%";
  height?: number | "auto";
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  opacity?: number;
  display?: "flex" | "block" | "grid" | "none";
  flexDirection?: "row" | "column";
  gap?: number;
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch";
  justifyContent?: "flex-start" | "center" | "flex-end" | "space-between";
}

export interface ViewportOverrides {
  tablet?: Partial<ElementStyleProps>;
  mobile?: Partial<ElementStyleProps>;
  desktop?: Partial<ElementStyleProps>;
}

export type ElementKind = "section" | "container" | "text" | "button" | "image" | "link" | "input" | "card";

export interface ElementNode {
  readonly id: string;
  name: string;
  kind: ElementKind;
  icon: string;
  content?: string;
  baseProps: ElementStyleProps;
  overrides: ViewportOverrides;
  children?: ElementNode[];
  version: number;
  /** Semantic tag is part of the model; rendering does not infer meaning from ID names. */
  tag?: "section" | "div" | "h1" | "h2" | "h3" | "p" | "span" | "button" | "a" | "img" | "input";
  /** Optional presentation hints for editor UX; never used as identity. */
  editable?: boolean;
}

export interface TemplateModel {
  templateId: string;
  templateName: string;
  schemaVersion: string;
  revision: number;
  updatedAt: string;
  elements: ElementNode[];
}

export interface ElementPatch {
  content?: string;
  styleProps?: Partial<ElementStyleProps>;
}

export interface ReorderChange {
  parentId: string;
  sourceIndex?: number;
  targetIndex?: number;
  /** Exact sibling order used by granular history restore. */
  order?: string[];
}

export interface EditCommand {
  commandId: string;
  source: EditSource;
  targetIds: string[];
  scope: Scope;
  baseRevision: number;
  changes: {
    content?: string;
    styleProps?: Partial<ElementStyleProps>;
    patches?: Record<string, ElementPatch>;
    reorder?: ReorderChange;
  };
  metadata?: {
    prompt?: string;
    description?: string;
  };
}

export interface RevisionEntry {
  revisionId: string;
  timestamp: string;
  displayTime: string;
  kind: "manual" | "ai" | "restore";
  source: EditSource;
  elementId: string;
  elementName: string;
  scope: Scope;
  propertyKey: "content" | "style" | "structure" | "all";
  beforeState: {
    content?: string;
    props?: Partial<ElementStyleProps>;
  };
  afterState: {
    content?: string;
    props?: Partial<ElementStyleProps>;
  };
  globalRevision: number;
  structure?: {
    parentId: string;
    movedElementId: string;
    beforeOrder: string[];
    afterOrder: string[];
    beforeIndex: number;
    afterIndex: number;
  };
}

export type ValidationErrorCode =
  | "SCHEMA_VALIDATION_FAILED"
  | "TARGET_NOT_FOUND"
  | "DUPLICATE_TARGET_IDS"
  | "STALE_REVISION"
  | "NO_CHANGES"
  | "INVALID_SCOPE_FOR_CONTENT"
  | "INVALID_SCOPE_FOR_REORDER"
  | "INCOMPATIBLE_PROPERTY_FOR_ELEMENT"
  | "INVALID_REORDER"
  | "INVALID_TEMPLATE_MODEL"
  | "DELETED_REQUIRED_ID"
  | "INVALID_SCOPE_SELECTION"
  | "INVALID_COMMAND_TARGETS"
  | "NO_SELECTION";

export interface ValidationError {
  code: ValidationErrorCode;
  message: string;
  details?: unknown;
}

export type CommitResult =
  | { success: true; model: TemplateModel; historyEntries: RevisionEntry[] }
  | { success: false; error: ValidationError };

export interface ProposalDiff {
  elementId: string;
  elementName: string;
  beforeContent?: string;
  afterContent?: string;
  beforeProps?: Partial<ElementStyleProps>;
  afterProps?: Partial<ElementStyleProps>;
}

export interface Proposal {
  id: string;
  commandId: string;
  baseRevision: number;
  targetIds: string[];
  scope: Scope;
  prompt: string;
  description: string;
  status: "pending" | "accepted" | "rejected";
  stale: boolean;
  diffs: ProposalDiff[];
  command: EditCommand;
}

export const VIEWPORT_WIDTHS: Record<Viewport, number> = { desktop: 1440, tablet: 768, mobile: 375 };
export const VIEWPORT_LABELS: Record<Viewport, string> = { desktop: "Desktop", tablet: "Tablet", mobile: "Mobile" };
