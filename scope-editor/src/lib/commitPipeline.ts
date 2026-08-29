import { EditCommandSchema, validatePropertyApplicability, isMeaningfulChange } from "./validation";
import { findNodeById, getAllNodeIds, mapNodeTree, reorderChildren } from "./treeUtils";
import type { TemplateModel, EditCommand, CommitResult, RevisionEntry, ElementNode, Viewport, ValidationError, ElementStyleProps } from "./types";

function clone<T>(value: T): T { return structuredClone(value); }
function nowMeta() { const now = new Date(); return { timestamp: now.toISOString(), displayTime: now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }; }
function kindForSource(source: EditCommand["source"]): RevisionEntry["kind"] { return source === "ai_assistant" ? "ai" : source === "history_restore" ? "restore" : "manual"; }

function styleSnapshot(node: ElementNode, scope: EditCommand["scope"]): Partial<ElementStyleProps> {
  return scope === "all" ? { ...node.baseProps } : { ...(node.overrides[scope as Viewport] ?? {}) };
}

function patchForExactStyle(before: Partial<ElementStyleProps>, after: Partial<ElementStyleProps>): Partial<ElementStyleProps> {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)] as (keyof ElementStyleProps)[]);
  const patch: Partial<ElementStyleProps> = {};
  for (const key of keys) (patch as Record<string, unknown>)[key] = key in before ? before[key] : undefined;
  return patch;
}

export function validateEditCommand(model: TemplateModel, rawCommand: unknown): { valid: true; command: EditCommand } | { valid: false; error: ValidationError } {
  const parsed = EditCommandSchema.safeParse(rawCommand);
  if (!parsed.success) return { valid: false, error: { code: "SCHEMA_VALIDATION_FAILED", message: "Command payload failed runtime schema validation.", details: parsed.error.flatten() } };
  const command = parsed.data as EditCommand;
  if (!isMeaningfulChange(command)) return { valid: false, error: { code: "NO_CHANGES", message: "Command contains no effective changes." } };
  if (command.baseRevision !== model.revision) return { valid: false, error: { code: "STALE_REVISION", message: `Command revision ${command.baseRevision} does not match current revision ${model.revision}.`, details: { currentRevision: model.revision } } };
  if (new Set(command.targetIds).size !== command.targetIds.length) return { valid: false, error: { code: "DUPLICATE_TARGET_IDS", message: "Duplicate target IDs are not permitted." } };
  const ids = getAllNodeIds(model.elements, model.templateId);
  for (const id of command.targetIds) if (!ids.has(id)) return { valid: false, error: { code: "TARGET_NOT_FOUND", message: `Target element ID "${id}" was not found.` } };
  const patchIds = command.changes.patches ? Object.keys(command.changes.patches) : [];
  if (patchIds.some((id) => !command.targetIds.includes(id))) return { valid: false, error: { code: "INVALID_COMMAND_TARGETS", message: "Patch keys must be a subset of targetIds." } };
  if (patchIds.length > 0 && patchIds.length !== command.targetIds.length) return { valid: false, error: { code: "INVALID_COMMAND_TARGETS", message: "Patch commands must provide a patch for every target." } };

  const hasContent = command.changes.content !== undefined || patchIds.some((id) => command.changes.patches?.[id]?.content !== undefined);
  if (hasContent && command.scope !== "all") return { valid: false, error: { code: "INVALID_SCOPE_FOR_CONTENT", message: "Content changes must use scope all." } };
  if (command.changes.reorder && command.scope !== "all") return { valid: false, error: { code: "INVALID_SCOPE_FOR_REORDER", message: "Structural reordering must use scope all." } };
  if (command.scope === "desktop" && command.source !== "history_restore") return { valid: false, error: { code: "SCHEMA_VALIDATION_FAILED", message: "Desktop edits use the base/all scope; desktop overrides are not supported." } };

  for (const id of command.targetIds) {
    if (id === model.templateId) continue;
    const node = findNodeById(model.elements, id); if (!node) continue;
    const props = command.changes.patches?.[id]?.styleProps ?? command.changes.styleProps;
    if (props) { const err = validatePropertyApplicability(node.kind, props); if (err) return { valid: false, error: err }; }
  }

  if (command.changes.reorder) {
    const { parentId, sourceIndex, targetIndex, order } = command.changes.reorder;
    const siblings = parentId === model.templateId ? model.elements : findNodeById(model.elements, parentId)?.children;
    if (!siblings) return { valid: false, error: { code: "INVALID_REORDER", message: "Reorder parent does not exist." } };
    if (order) {
      const existing = siblings.map((node) => node.id);
      if (order.length !== existing.length || new Set(order).size !== existing.length || order.some((id) => !existing.includes(id))) return { valid: false, error: { code: "INVALID_REORDER", message: "Exact reorder order must be a permutation of the parent's current children." } };
    } else if (sourceIndex === undefined || targetIndex === undefined || sourceIndex >= siblings.length || targetIndex >= siblings.length || sourceIndex === targetIndex) {
      return { valid: false, error: { code: "INVALID_REORDER", message: "Invalid sibling reorder indices." } };
    }
  }
  return { valid: true, command };
}

export function applyEditCommand(model: TemplateModel, command: EditCommand): { nextModel: TemplateModel; historyEntries: RevisionEntry[] } {
  const { timestamp, displayTime } = nowMeta();
  const nextRevision = model.revision + 1;
  let nextElements = model.elements;
  const entries: RevisionEntry[] = [];

  for (const id of command.targetIds) {
    if (id === model.templateId) continue;
    const node = findNodeById(nextElements, id); if (!node) continue;
    const patch = command.changes.patches?.[id];
    const content = patch?.content !== undefined ? patch.content : command.changes.content;
    const styleProps = patch?.styleProps ?? command.changes.styleProps;
    if (content === undefined && (!styleProps || Object.keys(styleProps).length === 0)) continue;
    const beforeContent = node.content;
    const beforeProps = styleSnapshot(node, command.scope);
    nextElements = mapNodeTree(nextElements, id, (current) => {
      const updated: ElementNode = { ...current, version: current.version + 1 };
      if (content !== undefined) updated.content = content;
      if (styleProps && Object.keys(styleProps).length) {
        if (command.scope === "all") {
          const next = { ...updated.baseProps } as Record<string, unknown>;
          for (const [key, value] of Object.entries(styleProps)) { if (value === undefined) delete next[key]; else next[key] = value; }
          updated.baseProps = next as ElementStyleProps;
        } else {
          const vp = command.scope as Viewport;
          const currentOverride = { ...(updated.overrides[vp] ?? {}) } as Record<string, unknown>;
          for (const [key, value] of Object.entries(styleProps)) { if (value === undefined) delete currentOverride[key]; else currentOverride[key] = value; }
          updated.overrides = { ...updated.overrides, [vp]: currentOverride };
        }
      }
      return updated;
    });
    const afterNode = findNodeById(nextElements, id)!;
    const afterContent = afterNode.content;
    const afterProps = styleSnapshot(afterNode, command.scope);
    const hasStyleChange = !!styleProps && Object.keys(styleProps).length > 0;
    const propertyKey = content !== undefined && hasStyleChange ? "all" : content !== undefined ? "content" : "style";
    entries.push({
      revisionId: `${nextRevision}-${id}-${entries.length}`,
      timestamp, displayTime, kind: kindForSource(command.source), source: command.source,
      elementId: id, elementName: node.name, scope: command.scope, propertyKey,
      beforeState: { content: beforeContent, props: beforeProps },
      afterState: { content: afterContent, props: afterProps }, globalRevision: nextRevision,
    });
  }

  if (command.changes.reorder) {
    const { parentId, sourceIndex, targetIndex, order } = command.changes.reorder;
    const siblings = parentId === model.templateId ? model.elements : findNodeById(model.elements, parentId)?.children ?? [];
    const beforeOrder = siblings.map((n) => n.id);
    const movedElementId = sourceIndex !== undefined ? (siblings[sourceIndex]?.id ?? "") : "";
    if (order) {
      const reorderToExactOrder = (nodes: ElementNode[]): ElementNode[] => {
        if (parentId === model.templateId) { const byId = new Map(nodes.map((n) => [n.id, n])); return order.map((id) => byId.get(id)!).filter(Boolean); }
        return mapNodeTree(nodes, parentId, (parent) => { const byId = new Map((parent.children ?? []).map((n) => [n.id, n])); return { ...parent, children: order.map((id) => byId.get(id)!).filter(Boolean) }; });
      };
      nextElements = reorderToExactOrder(nextElements);
    } else {
      nextElements = reorderChildren(nextElements, parentId, sourceIndex!, targetIndex!);
    }
    const nextSiblings = parentId === model.templateId ? nextElements : findNodeById(nextElements, parentId)?.children ?? [];
    const afterOrder = nextSiblings.map((n) => n.id);
    const afterIndex = movedElementId ? afterOrder.indexOf(movedElementId) : (targetIndex ?? 0);
    entries.push({ revisionId: `${nextRevision}-structure`, timestamp, displayTime, kind: kindForSource(command.source), source: command.source, elementId: parentId, elementName: parentId === model.templateId ? model.templateName : (findNodeById(model.elements, parentId)?.name ?? "Container"), scope: "all", propertyKey: "structure", beforeState: {}, afterState: {}, globalRevision: nextRevision, structure: { parentId, movedElementId, beforeOrder, afterOrder, beforeIndex: sourceIndex ?? beforeOrder.indexOf(movedElementId), afterIndex, } });
  }

  if (entries.length === 0) return { nextModel: model, historyEntries: [] };
  const nextModel: TemplateModel = { ...model, revision: nextRevision, updatedAt: timestamp, elements: nextElements };
  return { nextModel, historyEntries: entries };
}

export function executeCommit(model: TemplateModel, rawCommand: unknown): CommitResult {
  const validated = validateEditCommand(model, rawCommand);
  if (!validated.valid) return { success: false, error: validated.error };
  const { nextModel, historyEntries } = applyEditCommand(model, validated.command);
  if (historyEntries.length === 0) return { success: false, error: { code: "NO_CHANGES", message: "Command produced no state changes." } };
  return { success: true, model: clone(nextModel), historyEntries: clone(historyEntries) };
}

export function createPropertyRestorePatch(before: Partial<ElementStyleProps>, current: Partial<ElementStyleProps>): Partial<ElementStyleProps> {
  return patchForExactStyle(before, current);
}
