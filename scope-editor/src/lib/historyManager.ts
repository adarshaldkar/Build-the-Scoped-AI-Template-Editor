import type { EditCommand, RevisionEntry, TemplateModel, ElementStyleProps } from "./types";
import { createPropertyRestorePatch } from "./commitPipeline";
import { findNodeById } from "./treeUtils";

export const MAX_UNDO_LIMIT = 50;
export function pushUndoSnapshot(stack: TemplateModel[], model: TemplateModel): TemplateModel[] {
  const next = [...stack, structuredClone(model)];
  return next.length > MAX_UNDO_LIMIT ? next.slice(next.length - MAX_UNDO_LIMIT) : next;
}
export function createForwardRestoreCommand(entry: RevisionEntry, currentModel: TemplateModel): EditCommand {
  if (entry.propertyKey === "structure" && entry.structure) {
    return { commandId: `restore-${currentModel.revision}-${entry.revisionId}`, source: "history_restore", targetIds: [entry.structure.parentId], scope: "all", baseRevision: currentModel.revision, changes: { reorder: { parentId: entry.structure.parentId, order: [...entry.structure.beforeOrder] } }, metadata: { description: `Restore ${entry.elementName} structure` } };
  }
  const target = findNodeById(currentModel.elements, entry.elementId);
  if (!target) throw new Error("Cannot restore missing target element.");
  const patch: { content?: string; styleProps?: Partial<ElementStyleProps> } = {};
  if (entry.propertyKey === "content" || entry.propertyKey === "all") patch.content = entry.beforeState.content ?? "";
  if (entry.propertyKey === "style" || entry.propertyKey === "all") patch.styleProps = createPropertyRestorePatch(entry.beforeState.props ?? {}, entry.scope === "all" ? target.baseProps : (target.overrides[entry.scope] ?? {}));
  return { commandId: `restore-${currentModel.revision}-${entry.revisionId}`, source: "history_restore", targetIds: [entry.elementId], scope: entry.scope, baseRevision: currentModel.revision, changes: { patches: { [entry.elementId]: patch } }, metadata: { description: `Restore ${entry.elementName} (${entry.propertyKey})` } };
}

export function filterHistoryEntries(entries: RevisionEntry[], filter: { selectedElementId?: string; kind?: "all" | "ai" | "manual"; scope?: "all" | "desktop" | "tablet" | "mobile" }): RevisionEntry[] {
  return entries.filter((entry) => (!filter.selectedElementId || entry.elementId === filter.selectedElementId) && (!filter.kind || filter.kind === "all" || entry.kind === filter.kind) && (!filter.scope || filter.scope === "all" || entry.scope === filter.scope));
}
