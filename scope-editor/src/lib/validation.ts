import { z } from "zod";
import type { ElementKind, ElementNode, ElementStyleProps, TemplateModel, ValidationError } from "./types";

// ============================================================
// TIER 1: ZOD RUNTIME SCHEMA DEFINITIONS
// ============================================================

export const ViewportSchema = z.enum(["desktop", "tablet", "mobile"]);
export const ScopeSchema = z.enum(["all", "desktop", "tablet", "mobile"]);
export const EditSourceSchema = z.enum([
  "canvas",
  "inspector",
  "code_editor",
  "ai_assistant",
  "history_restore",
]);

export const ElementStylePropsSchema = z
  .object({
    fontFamily: z.string().optional(),
    fontWeight: z
      .union([
        z.literal(300),
        z.literal(400),
        z.literal(500),
        z.literal(600),
        z.literal(700),
        z.literal(800),
      ])
      .optional(),
    fontSize: z.number().min(8).max(160).optional(),
    lineHeight: z.number().min(0.5).max(3.0).optional(),
    letterSpacing: z.number().min(-5).max(20).optional(),
    textAlign: z.enum(["left", "center", "right", "justify"]).optional(),
    color: z.string().optional(),
    backgroundColor: z.string().optional(),
    marginTop: z.number().optional(),
    marginBottom: z.number().optional(),
    paddingTop: z.number().min(0).optional(),
    paddingBottom: z.number().min(0).optional(),
    paddingLeft: z.number().min(0).optional(),
    paddingRight: z.number().min(0).optional(),
    width: z.union([z.number(), z.literal("auto"), z.literal("100%")]).optional(),
    height: z.union([z.number(), z.literal("auto")]).optional(),
    borderRadius: z.number().min(0).max(100).optional(),
    borderWidth: z.number().min(0).max(20).optional(),
    borderColor: z.string().optional(),
    opacity: z.number().min(0).max(1).optional(),
    display: z.enum(["flex", "block", "grid", "none"]).optional(),
    flexDirection: z.enum(["row", "column"]).optional(),
    gap: z.number().min(0).optional(),
    alignItems: z.enum(["flex-start", "center", "flex-end", "stretch"]).optional(),
    justifyContent: z
      .enum(["flex-start", "center", "flex-end", "space-between"])
      .optional(),
  })
  .strict(); // Rejects unwhitelisted style fields at schema boundary

export const ElementPatchSchema = z
  .object({
    content: z.string().optional(),
    styleProps: ElementStylePropsSchema.optional(),
  })
  .strict();

export const EditCommandSchema = z
  .object({
    commandId: z.string().min(1),
    source: EditSourceSchema,
    targetIds: z
      .array(z.string().min(1))
      .min(1, "At least one target element ID required"),
    scope: ScopeSchema,
    baseRevision: z.number().int().nonnegative(),
    changes: z
      .object({
        content: z.string().optional(),
        styleProps: ElementStylePropsSchema.optional(),
        patches: z.record(ElementPatchSchema).optional(),
        reorder: z
          .object({
            parentId: z.string().min(1),
            sourceIndex: z.number().int().nonnegative(),
            targetIndex: z.number().int().nonnegative(),
          })
          .optional(),
      })
      .strict(),
    metadata: z
      .object({
        prompt: z.string().optional(),
        description: z.string().optional(),
      })
      .optional(),
  })
  .strict();

// ============================================================
// TIER 2: BUSINESS RULES & MODEL INTEGRITY
// ============================================================

const ALLOWED_PROPERTIES_BY_KIND: Record<ElementKind, (keyof ElementStyleProps)[]> = {
  text: [
    "fontFamily",
    "fontWeight",
    "fontSize",
    "lineHeight",
    "letterSpacing",
    "textAlign",
    "color",
    "backgroundColor",
    "marginTop",
    "marginBottom",
    "paddingTop",
    "paddingBottom",
    "paddingLeft",
    "paddingRight",
    "opacity",
    "display",
  ],
  button: [
    "fontFamily",
    "fontWeight",
    "fontSize",
    "lineHeight",
    "letterSpacing",
    "textAlign",
    "color",
    "backgroundColor",
    "borderRadius",
    "borderWidth",
    "borderColor",
    "marginTop",
    "marginBottom",
    "paddingTop",
    "paddingBottom",
    "paddingLeft",
    "paddingRight",
    "width",
    "height",
    "opacity",
    "display",
  ],
  link: [
    "fontFamily",
    "fontWeight",
    "fontSize",
    "lineHeight",
    "letterSpacing",
    "textAlign",
    "color",
    "backgroundColor",
    "marginTop",
    "marginBottom",
    "paddingTop",
    "paddingBottom",
    "paddingLeft",
    "paddingRight",
    "opacity",
    "display",
  ],
  image: [
    "width",
    "height",
    "borderRadius",
    "borderWidth",
    "borderColor",
    "marginTop",
    "marginBottom",
    "opacity",
    "display",
  ],
  container: [
    "display",
    "flexDirection",
    "gap",
    "alignItems",
    "justifyContent",
    "backgroundColor",
    "borderRadius",
    "borderWidth",
    "borderColor",
    "marginTop",
    "marginBottom",
    "paddingTop",
    "paddingBottom",
    "paddingLeft",
    "paddingRight",
    "width",
    "height",
    "opacity",
  ],
  section: [
    "backgroundColor",
    "paddingTop",
    "paddingBottom",
    "paddingLeft",
    "paddingRight",
    "marginTop",
    "marginBottom",
    "borderWidth",
    "borderColor",
    "display",
    "flexDirection",
    "gap",
    "alignItems",
    "justifyContent",
    "textAlign",
  ],
  card: [
    "backgroundColor",
    "borderRadius",
    "borderWidth",
    "borderColor",
    "paddingTop",
    "paddingBottom",
    "paddingLeft",
    "paddingRight",
    "marginTop",
    "marginBottom",
    "width",
    "height",
    "display",
    "flexDirection",
    "gap",
    "opacity",
  ],
  input: [
    "fontFamily",
    "fontSize",
    "color",
    "backgroundColor",
    "borderRadius",
    "borderWidth",
    "borderColor",
    "paddingTop",
    "paddingBottom",
    "paddingLeft",
    "paddingRight",
    "marginTop",
    "marginBottom",
    "width",
    "height",
  ],
};

/**
 * Validates that all style properties in styleProps are applicable for the given element kind.
 */
export function validatePropertyApplicability(
  kind: ElementKind,
  styleProps?: Partial<ElementStyleProps>
): ValidationError | null {
  if (!styleProps) return null;

  const allowed = new Set(ALLOWED_PROPERTIES_BY_KIND[kind] || []);
  const attemptedKeys = Object.keys(styleProps) as (keyof ElementStyleProps)[];

  for (const key of attemptedKeys) {
    if (styleProps[key] !== undefined && !allowed.has(key)) {
      return {
        code: "INCOMPATIBLE_PROPERTY_FOR_ELEMENT",
        message: `Property "${key}" is not applicable to element of kind "${kind}".`,
        details: { kind, invalidProperty: key, allowedProperties: Array.from(allowed) },
      };
    }
  }

  return null;
}

/**
 * Validates the structural integrity of a TemplateModel, ensuring unique element IDs and schema compliance.
 */
export function validateTemplateModel(model: TemplateModel): ValidationError | null {
  if (!model || typeof model !== "object") {
    return {
      code: "INVALID_TEMPLATE_MODEL",
      message: "Template model must be a non-null object.",
    };
  }

  if (model.schemaVersion !== "1.0.0") {
    return {
      code: "INVALID_TEMPLATE_MODEL",
      message: `Unsupported schemaVersion "${model.schemaVersion}". Expected "1.0.0".`,
    };
  }

  if (!Array.isArray(model.elements) || model.elements.length === 0) {
    return {
      code: "INVALID_TEMPLATE_MODEL",
      message: "Template model must contain a non-empty elements array.",
    };
  }

  const seenIds = new Set<string>();
  let duplicateId: string | null = null;

  function traverse(nodes: ElementNode[]) {
    for (const node of nodes) {
      if (!node.id || typeof node.id !== "string") {
        return;
      }
      if (seenIds.has(node.id)) {
        duplicateId = node.id;
        return;
      }
      seenIds.add(node.id);
      if (node.children && Array.isArray(node.children)) {
        traverse(node.children);
      }
    }
  }

  traverse(model.elements);

  if (duplicateId) {
    return {
      code: "INVALID_TEMPLATE_MODEL",
      message: `Duplicate element ID "${duplicateId}" detected in template model. Element IDs must be globally unique.`,
      details: { duplicateId },
    };
  }

  return null;
}
