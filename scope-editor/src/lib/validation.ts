import { z } from "zod";
import type { ElementKind, ElementNode, ElementStyleProps, TemplateModel, ValidationError, EditCommand } from "./types";

export const ViewportSchema = z.enum(["desktop", "tablet", "mobile"]);
export const ScopeSchema = z.enum(["all", "desktop", "tablet", "mobile"]);
export const EditSourceSchema = z.enum(["canvas", "inspector", "code_editor", "ai_assistant", "history_restore"]);

export const ElementStylePropsSchema = z.object({
  fontFamily: z.string().min(1).optional(),
  fontWeight: z.union([z.literal(300), z.literal(400), z.literal(500), z.literal(600), z.literal(700), z.literal(800)]).optional(),
  fontSize: z.number().finite().min(8).max(160).optional(),
  lineHeight: z.number().finite().min(0.5).max(3).optional(),
  letterSpacing: z.number().finite().min(-5).max(20).optional(),
  textAlign: z.enum(["left", "center", "right", "justify"]).optional(),
  color: z.string().regex(/^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/).optional(),
  backgroundColor: z.string().regex(/^(?:transparent|#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8}))$/).optional(),
  marginTop: z.number().finite().min(-1000).max(1000).optional(),
  marginBottom: z.number().finite().min(-1000).max(1000).optional(),
  paddingTop: z.number().finite().min(0).max(1000).optional(),
  paddingBottom: z.number().finite().min(0).max(1000).optional(),
  paddingLeft: z.number().finite().min(0).max(1000).optional(),
  paddingRight: z.number().finite().min(0).max(1000).optional(),
  width: z.union([z.number().finite().min(0).max(100), z.literal("auto"), z.literal("100%")]).optional(),
  height: z.union([z.number().finite().min(0).max(2000), z.literal("auto")]).optional(),
  borderRadius: z.number().finite().min(0).max(100).optional(),
  borderWidth: z.number().finite().min(0).max(20).optional(),
  borderColor: z.string().regex(/^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/).optional(),
  opacity: z.number().finite().min(0).max(1).optional(),
  display: z.enum(["flex", "block", "grid", "none"]).optional(),
  flexDirection: z.enum(["row", "column"]).optional(),
  gap: z.number().finite().min(0).max(500).optional(),
  alignItems: z.enum(["flex-start", "center", "flex-end", "stretch"]).optional(),
  justifyContent: z.enum(["flex-start", "center", "flex-end", "space-between"]).optional(),
}).strict();

export const ElementPatchSchema = z.object({ content: z.string().optional(), styleProps: ElementStylePropsSchema.optional() }).strict();

export const EditCommandSchema = z.object({
  commandId: z.string().min(1), source: EditSourceSchema, targetIds: z.array(z.string().min(1)).min(1),
  scope: ScopeSchema, baseRevision: z.number().int().nonnegative(),
  changes: z.object({
    content: z.string().optional(), styleProps: ElementStylePropsSchema.optional(),
    patches: z.record(ElementPatchSchema).optional(),
    reorder: z.object({ parentId: z.string().min(1), sourceIndex: z.number().int().nonnegative().optional(), targetIndex: z.number().int().nonnegative().optional(), order: z.array(z.string().min(1)).optional() }).strict().optional(),
  }).strict(),
  metadata: z.object({ prompt: z.string().optional(), description: z.string().optional() }).optional(),
}).strict();

const COMMON_TEXT = ["fontFamily", "fontWeight", "fontSize", "lineHeight", "letterSpacing", "textAlign", "color", "marginTop", "marginBottom", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "opacity", "display"] as const;
const LAYOUT = ["display", "flexDirection", "gap", "alignItems", "justifyContent", "backgroundColor", "borderRadius", "borderWidth", "borderColor", "marginTop", "marginBottom", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "width", "height", "opacity", "textAlign"] as const;
const BUTTON = [...COMMON_TEXT, "backgroundColor", "borderRadius", "borderWidth", "borderColor", "width", "height"] as const;
const IMAGE = ["width", "height", "borderRadius", "borderWidth", "borderColor", "marginTop", "marginBottom", "opacity", "display"] as const;

const ALLOWED_PROPERTIES_BY_KIND: Record<ElementKind, readonly (keyof ElementStyleProps)[]> = {
  text: COMMON_TEXT,
  link: COMMON_TEXT,
  button: BUTTON,
  image: IMAGE,
  section: LAYOUT,
  container: LAYOUT,
  card: LAYOUT,
  input: BUTTON,
};

export function validatePropertyApplicability(kind: ElementKind, styleProps: Partial<ElementStyleProps>): ValidationError | null {
  const allowed = new Set(ALLOWED_PROPERTIES_BY_KIND[kind] ?? []);
  const invalid = Object.keys(styleProps).filter((key) => !allowed.has(key as keyof ElementStyleProps));
  if (invalid.length === 0) return null;
  return { code: "INCOMPATIBLE_PROPERTY_FOR_ELEMENT", message: `Property ${invalid.join(", ")} is not allowed on element kind ${kind}.`, details: { kind, invalid } };
}

function collectNodes(nodes: ElementNode[], out: ElementNode[] = []): ElementNode[] {
  for (const node of nodes) { out.push(node); if (node.children) collectNodes(node.children, out); }
  return out;
}

export function validateTemplateModel(model: TemplateModel): ValidationError | null {
  if (!model || typeof model !== "object" || !model.templateId || !model.templateName || !model.schemaVersion || !Array.isArray(model.elements)) {
    return { code: "INVALID_TEMPLATE_MODEL", message: "TemplateModel is missing required fields." };
  }
  if (model.schemaVersion !== "1.0.0") return { code: "INVALID_TEMPLATE_MODEL", message: `Unsupported schemaVersion ${model.schemaVersion}.` };
  if (!Number.isInteger(model.revision) || model.revision < 0) return { code: "INVALID_TEMPLATE_MODEL", message: "Model revision must be a non-negative integer." };
  const nodes = collectNodes(model.elements);
  const ids = new Set<string>();
  for (const node of nodes) {
    if (!node.id || ids.has(node.id)) return { code: "INVALID_TEMPLATE_MODEL", message: `Element ID "${node.id}" is missing or duplicated.` };
    ids.add(node.id);
    if (!ALLOWED_PROPERTIES_BY_KIND[node.kind]) return { code: "INVALID_TEMPLATE_MODEL", message: `Unsupported element kind "${node.kind}".` };
    const parsed = ElementStylePropsSchema.safeParse(node.baseProps);
    if (!parsed.success) return { code: "INVALID_TEMPLATE_MODEL", message: `Invalid baseProps for ${node.id}.`, details: parsed.error.flatten() };
    for (const vp of ["desktop", "tablet", "mobile"] as const) {
      const props = node.overrides?.[vp];
      if (props) {
        const result = ElementStylePropsSchema.safeParse(props);
        if (!result.success) return { code: "INVALID_TEMPLATE_MODEL", message: `Invalid ${vp} overrides for ${node.id}.`, details: result.error.flatten() };
        const applicability = validatePropertyApplicability(node.kind, props);
        if (applicability) return { code: "INVALID_TEMPLATE_MODEL", message: applicability.message };
      }
    }
  }
  return null;
}

export function isMeaningfulChange(command: EditCommand): boolean {
  const c = command.changes;
  if (c.content !== undefined) return true;
  if (c.styleProps && Object.keys(c.styleProps).length > 0) return true;
  if (c.patches && Object.values(c.patches).some((p) => p.content !== undefined || (p.styleProps && Object.keys(p.styleProps).length > 0))) return true;
  if (c.reorder) return Array.isArray(c.reorder.order) ? c.reorder.order.length > 0 : c.reorder.sourceIndex !== undefined && c.reorder.targetIndex !== undefined && c.reorder.sourceIndex !== c.reorder.targetIndex;
  return false;
}
