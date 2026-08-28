import type {
  TemplateModel,
  RevisionEntry,
  EditCommand,
  ElementStyleProps,
} from "./types";

export const MAX_UNDO_LIMIT = 50;

/**
 * Pushes a snapshot to the undo stack, maintaining a maximum limit of 50 items.
 */
export function pushUndoSnapshot(
  stack: TemplateModel[],
  model: TemplateModel
): TemplateModel[] {
  const next = [...stack, model];
  if (next.length > MAX_UNDO_LIMIT) {
    return next.slice(next.length - MAX_UNDO_LIMIT);
  }
  return next;
}

/**
 * Constructs a non-destructive forward EditCommand to restore a historical state on a specific element.
 */
export function createForwardRestoreCommand(
  entry: RevisionEntry,
  currentModel: TemplateModel
): EditCommand {
  // Content can only be restored when scope is "all"
  const isContent =
    entry.scope === "all" &&
    (entry.propertyKey === "content" ||
      entry.propertyKey === "all" ||
      (entry.beforeState.content !== undefined && entry.propertyKey !== "style"));

  const isStyle =
    entry.propertyKey === "style" ||
    entry.propertyKey === "all" ||
    entry.beforeState.props !== undefined;

  return {
    commandId: `cmd_restore_${Date.now()}_${entry.elementId}`,
    source: "history_restore",
    targetIds: [entry.elementId],
    scope: entry.scope,
    baseRevision: currentModel.revision,
    changes: {
      patches: {
        [entry.elementId]: {
          content: isContent ? entry.beforeState.content : undefined,
          styleProps: isStyle ? (entry.beforeState.props as Partial<ElementStyleProps>) : undefined,
        },
      },
    },
    metadata: {
      description: `Restore ${entry.elementName} (${entry.propertyKey}) to revision ${entry.globalRevision - 1}`,
    },
  };
}

export interface HistoryFilterOptions {
  selectedElementId?: string | null;
  kind?: "all" | "ai" | "manual" | "restore";
  scope?: "all" | "desktop" | "tablet" | "mobile";
}

/**
 * Pure filter helper for audit history entries.
 */
export function filterHistoryEntries(
  entries: RevisionEntry[],
  options: HistoryFilterOptions
): RevisionEntry[] {
  return entries.filter((entry) => {
    if (options.selectedElementId && entry.elementId !== options.selectedElementId) {
      return false;
    }
    if (options.kind && options.kind !== "all" && entry.kind !== options.kind) {
      return false;
    }
    if (options.scope && options.scope !== "all" && entry.scope !== options.scope) {
      return false;
    }
    return true;
  });
}
