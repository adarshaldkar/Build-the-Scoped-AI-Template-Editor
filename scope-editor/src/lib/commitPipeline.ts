import { EditCommandSchema, validatePropertyApplicability } from "./validation";
import { findNodeById, mapNodeTree, getAllNodeIds, reorderChildren } from "./treeUtils";
import type {
  TemplateModel,
  EditCommand,
  CommitResult,
  RevisionEntry,
  ElementNode,
  Viewport,
  ValidationError,
} from "./types";

/**
 * Validates a raw edit command against Tier 1 Zod schema and Tier 2 Business Rules.
 * Pure function: does NOT modify state.
 */
export function validateEditCommand(
  model: TemplateModel,
  rawCommand: unknown
): { valid: true; command: EditCommand } | { valid: false; error: ValidationError } {
  // ------------------------------------------------------------
  // TIER 1: ZOD RUNTIME SCHEMA VALIDATION
  // ------------------------------------------------------------
  const parseResult = EditCommandSchema.safeParse(rawCommand);
  if (!parseResult.success) {
    return {
      valid: false,
      error: {
        code: "SCHEMA_VALIDATION_FAILED",
        message: "Command payload failed runtime schema validation.",
        details: parseResult.error.flatten(),
      },
    };
  }

  const command = parseResult.data as EditCommand;

  // ------------------------------------------------------------
  // TIER 2: BUSINESS RULES VALIDATION
  // ------------------------------------------------------------

  // 1. Empty / No-op Command Check
  const hasGlobalContent = command.changes.content !== undefined;
  const hasGlobalStyleProps =
    command.changes.styleProps !== undefined &&
    Object.keys(command.changes.styleProps).length > 0;
  const hasPatches =
    command.changes.patches !== undefined &&
    Object.keys(command.changes.patches).length > 0;
  const hasReorder = command.changes.reorder !== undefined;

  if (!hasGlobalContent && !hasGlobalStyleProps && !hasPatches && !hasReorder) {
    return {
      valid: false,
      error: {
        code: "NO_CHANGES",
        message: "Command contains no property, content, or structural changes.",
      },
    };
  }

  // 2. Base Revision Check (Stale Revision Guard)
  if (command.baseRevision !== model.revision) {
    return {
      valid: false,
      error: {
        code: "STALE_REVISION",
        message: `Command baseRevision (${command.baseRevision}) does not match current model revision (${model.revision}).`,
        details: { currentRevision: model.revision, commandRevision: command.baseRevision },
      },
    };
  }

  // 3. Duplicate Target IDs Rejection
  const uniqueTargets = new Set(command.targetIds);
  if (uniqueTargets.size !== command.targetIds.length) {
    return {
      valid: false,
      error: {
        code: "DUPLICATE_TARGET_IDS",
        message: "Duplicate target element IDs in a single command are not permitted.",
        details: { targetIds: command.targetIds },
      },
    };
  }

  // 4. Content Scope Rule: Content changes are template-wide and require scope: "all"
  const anyContentChange =
    hasGlobalContent ||
    (hasPatches &&
      Object.values(command.changes.patches!).some((p) => p.content !== undefined));

  if (anyContentChange && command.scope !== "all") {
    return {
      valid: false,
      error: {
        code: "INVALID_SCOPE_FOR_CONTENT",
        message: `Content edits must have scope "all". Single-viewport scope "${command.scope}" is not permitted for content.`,
        details: { attemptedScope: command.scope },
      },
    };
  }

  // 5. Reorder Scope Rule: Reorder structural changes are template-wide and require scope: "all"
  if (hasReorder && command.scope !== "all") {
    return {
      valid: false,
      error: {
        code: "INVALID_SCOPE_FOR_REORDER",
        message: `Structural reorder edits must have scope "all". Single-viewport scope "${command.scope}" is not permitted for reorder.`,
        details: { attemptedScope: command.scope },
      },
    };
  }

  // 6. Target Existence (Atomicity Guard: All targets must exist)
  const existingNodeIds = getAllNodeIds(model.elements, model.templateId);

  for (const targetId of command.targetIds) {
    if (!existingNodeIds.has(targetId)) {
      return {
        valid: false,
        error: {
          code: "TARGET_NOT_FOUND",
          message: `Target element ID "${targetId}" was not found in the template model.`,
          details: { missingId: targetId },
        },
      };
    }
  }

  // 7. Element Property Applicability Check
  for (const targetId of command.targetIds) {
    if (targetId === model.templateId) continue;
    const node = findNodeById(model.elements, targetId);
    if (!node) continue;
    const targetStyleProps = command.changes.patches?.[targetId]?.styleProps ?? command.changes.styleProps;
    if (targetStyleProps) {
      const applicabilityError = validatePropertyApplicability(node.kind, targetStyleProps);
      if (applicabilityError) {
        return {
          valid: false,
          error: applicabilityError,
        };
      }
    }
  }

  // 8. Reorder Bounds Check
  if (hasReorder && command.changes.reorder) {
    const { parentId, sourceIndex, targetIndex } = command.changes.reorder;
    let count = 0;

    if (parentId === model.templateId) {
      count = model.elements.length;
    } else {
      const parentNode = findNodeById(model.elements, parentId);
      if (!parentNode || !parentNode.children || parentNode.children.length === 0) {
        return {
          valid: false,
          error: {
            code: "INVALID_REORDER",
            message: `Reorder parent container "${parentId}" does not exist or has no children.`,
          },
        };
      }
      count = parentNode.children.length;
    }

    if (sourceIndex < 0 || sourceIndex >= count || targetIndex < 0 || targetIndex >= count) {
      return {
        valid: false,
        error: {
          code: "INVALID_REORDER",
          message: `Reorder index out of bounds: sourceIndex ${sourceIndex}, targetIndex ${targetIndex}, total children ${count}.`,
        },
      };
    }
  }

  return {
    valid: true,
    command,
  };
}

/**
 * Applies a pre-validated EditCommand immutably and returns the next TemplateModel and RevisionEntries.
 * Assumes command has already passed validateEditCommand.
 */
export function applyEditCommand(
  model: TemplateModel,
  command: EditCommand
): { nextModel: TemplateModel; historyEntries: RevisionEntry[] } {
  let nextElements = model.elements;
  const historyEntries: RevisionEntry[] = [];
  const nextRevision = model.revision + 1;
  const now = new Date();
  const timestamp = now.toISOString();
  const displayTime = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const hasGlobalContent = command.changes.content !== undefined;
  const hasGlobalStyleProps =
    command.changes.styleProps !== undefined &&
    Object.keys(command.changes.styleProps).length > 0;
  const hasPatches =
    command.changes.patches !== undefined &&
    Object.keys(command.changes.patches).length > 0;

  // 1. Handle Content and Style Property Modifications on Targets
  if (hasGlobalContent || hasGlobalStyleProps || hasPatches) {
    for (const targetId of command.targetIds) {
      if (targetId === model.templateId) continue;
      const existingNode = findNodeById(model.elements, targetId);
      if (!existingNode) continue;

      const targetPatch = command.changes.patches?.[targetId];
      const targetContent = targetPatch?.content !== undefined ? targetPatch.content : command.changes.content;
      const targetStyleProps = targetPatch?.styleProps !== undefined ? targetPatch.styleProps : command.changes.styleProps;

      // Skip if this specific target has no changes
      if (targetContent === undefined && (!targetStyleProps || Object.keys(targetStyleProps).length === 0)) {
        continue;
      }

      // Capture before state for history delta
      const beforeState = {
        content: existingNode.content,
        props:
          command.scope === "all"
            ? { ...existingNode.baseProps }
            : { ...(existingNode.overrides[command.scope as Viewport] || {}) },
      };

      // Apply transformation immutably
      nextElements = mapNodeTree(nextElements, targetId, (node) => {
        const updatedNode: ElementNode = {
          ...node,
          version: node.version + 1,
        };

        // Content change (template-wide)
        if (targetContent !== undefined) {
          updatedNode.content = targetContent;
        }

        // Style property changes according to scope
        if (targetStyleProps && Object.keys(targetStyleProps).length > 0) {
          if (command.scope === "all") {
            updatedNode.baseProps = {
              ...updatedNode.baseProps,
              ...targetStyleProps,
            };
          } else {
            const vp = command.scope as Viewport;
            updatedNode.overrides = {
              ...updatedNode.overrides,
              [vp]: {
                ...(updatedNode.overrides[vp] || {}),
                ...targetStyleProps,
              },
            };
          }
        }

        return updatedNode;
      });

      const updatedNode = findNodeById(nextElements, targetId)!;
      const afterState = {
        content: updatedNode.content,
        props:
          command.scope === "all"
            ? { ...updatedNode.baseProps }
            : { ...(updatedNode.overrides[command.scope as Viewport] || {}) },
      };

      historyEntries.push({
        revisionId: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${targetId}`,
        timestamp,
        displayTime,
        kind:
          command.source === "ai_assistant"
            ? "ai"
            : command.source === "history_restore"
            ? "restore"
            : "manual",
        source: command.source,
        elementId: targetId,
        elementName: existingNode.name,
        scope: command.scope,
        propertyKey:
          targetContent !== undefined && targetStyleProps !== undefined
            ? "all"
            : targetContent !== undefined
            ? "content"
            : "style",
        beforeState,
        afterState,
        globalRevision: nextRevision,
      });
    }
  }

  // 2. Handle Structural Reordering if requested
  if (command.changes.reorder) {
    const { parentId, sourceIndex, targetIndex } = command.changes.reorder;
    const parentName = parentId === model.templateId ? model.templateName : findNodeById(nextElements, parentId)?.name || parentId;

    nextElements = reorderChildren(nextElements, parentId, sourceIndex, targetIndex, model.templateId);

    historyEntries.push({
      revisionId: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${parentId}`,
      timestamp,
      displayTime,
      kind:
        command.source === "ai_assistant"
          ? "ai"
          : command.source === "history_restore"
          ? "restore"
          : "manual",
      source: command.source,
      elementId: parentId,
      elementName: parentName,
      scope: command.scope,
      propertyKey: "structure",
      beforeState: {},
      afterState: {},
      globalRevision: nextRevision,
    });
  }

  const nextModel: TemplateModel = {
    ...model,
    revision: nextRevision,
    updatedAt: timestamp,
    elements: nextElements,
  };

  return { nextModel, historyEntries };
}

/**
 * MASTER TRANSACTION ENTRYPOINT:
 * Validates, calculates next state and history atomically, and returns a CommitResult.
 */
export function executeCommit(
  model: TemplateModel,
  rawCommand: unknown
): CommitResult {
  const validation = validateEditCommand(model, rawCommand);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
    };
  }

  const { nextModel, historyEntries } = applyEditCommand(model, validation.command);

  return {
    success: true,
    model: nextModel,
    historyEntries,
  };
}
