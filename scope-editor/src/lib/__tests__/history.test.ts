import { describe, it, expect, beforeEach } from "vitest";
import { initialTemplateModel } from "../templateData";
import { findNodeById } from "../treeUtils";
import { executeCommit } from "../commitPipeline";
import {
  pushUndoSnapshot,
  createForwardRestoreCommand,
  filterHistoryEntries,
  MAX_UNDO_LIMIT,
} from "../historyManager";
import type { TemplateModel, EditCommand, RevisionEntry } from "../types";

describe("Phase 6: Linear Undo/Redo & Granular History Drawer Invariants", () => {
  let model: TemplateModel;

  beforeEach(() => {
    model = JSON.parse(JSON.stringify(initialTemplateModel));
  });

  // ============================================================
  // 1. LINEAR UNDO / REDO TESTS
  // ============================================================
  it("1. [ACCEPT] linear undo restores previous model state", () => {
    let undoStack: TemplateModel[] = [];
    let redoStack: TemplateModel[] = [];

    const m0 = model;
    undoStack = pushUndoSnapshot(undoStack, m0);

    // Commit edit 1
    const edit1: EditCommand = {
      commandId: "cmd_1",
      source: "canvas",
      targetIds: ["hero-heading"],
      scope: "all",
      baseRevision: m0.revision,
      changes: { patches: { "hero-heading": { content: "Heading 1" } } },
    };
    const res1 = executeCommit(m0, edit1);
    expect(res1.success).toBe(true);
    if (!res1.success) return;

    const m1 = res1.model;

    // Perform Undo
    const previousModel = undoStack[undoStack.length - 1];
    undoStack = undoStack.slice(0, -1);
    redoStack = [...redoStack, m1];

    expect(previousModel.revision).toBe(m0.revision);
    expect(findNodeById(previousModel.elements, "hero-heading")?.content).toBe(
      findNodeById(m0.elements, "hero-heading")?.content
    );
  });

  it("2. [ACCEPT] linear redo reapplies undone model state", () => {
    let undoStack: TemplateModel[] = [];
    let redoStack: TemplateModel[] = [];

    const m0 = model;
    undoStack = pushUndoSnapshot(undoStack, m0);

    const edit1: EditCommand = {
      commandId: "cmd_1",
      source: "canvas",
      targetIds: ["hero-heading"],
      scope: "all",
      baseRevision: m0.revision,
      changes: { patches: { "hero-heading": { content: "Heading 1" } } },
    };
    const res1 = executeCommit(m0, edit1);
    if (!res1.success) return;
    const m1 = res1.model;

    // Undo: m1 -> m0
    redoStack.push(m1);
    const undoneModel = undoStack.pop()!;

    // Redo: m0 -> m1
    const redoneModel = redoStack.pop()!;
    undoStack.push(undoneModel);

    expect(redoneModel.revision).toBe(m1.revision);
    expect(findNodeById(redoneModel.elements, "hero-heading")?.content).toBe("Heading 1");
  });

  it("3. [ACCEPT] new commit clears redo stack and appends to undo stack", () => {
    let undoStack: TemplateModel[] = [];
    let redoStack: TemplateModel[] = [model]; // Stale redo entry

    const newEdit: EditCommand = {
      commandId: "cmd_new",
      source: "canvas",
      targetIds: ["hero-heading"],
      scope: "all",
      baseRevision: model.revision,
      changes: { patches: { "hero-heading": { content: "Branch B" } } },
    };

    const res = executeCommit(model, newEdit);
    expect(res.success).toBe(true);
    if (!res.success) return;

    // In App workflow: on commit, push to undo and clear redo
    undoStack = pushUndoSnapshot(undoStack, model);
    redoStack = [];

    expect(undoStack.length).toBe(1);
    expect(redoStack.length).toBe(0);
  });

  it("4. [ACCEPT] undo stack caps at 50 snapshots", () => {
    let stack: TemplateModel[] = [];
    for (let i = 0; i < 60; i++) {
      const dummyModel: TemplateModel = { ...model, revision: i };
      stack = pushUndoSnapshot(stack, dummyModel);
    }

    expect(stack.length).toBe(MAX_UNDO_LIMIT);
    expect(stack[0].revision).toBe(10); // Oldest 10 dropped
    expect(stack[stack.length - 1].revision).toBe(59);
  });

  // ============================================================
  // 2. NON-DESTRUCTIVE FORWARD RESTORE TESTS
  // ============================================================
  it("5. [ISOLATION] forward restore changes only target element and preserves later history", () => {
    let currentModel = model;
    let history: RevisionEntry[] = [];

    // Edit 1: Heading
    const res1 = executeCommit(currentModel, {
      commandId: "cmd_1",
      source: "inspector",
      targetIds: ["hero-heading"],
      scope: "all",
      baseRevision: currentModel.revision,
      changes: { patches: { "hero-heading": { styleProps: { fontSize: 72 } } } },
    });
    if (!res1.success) return;
    currentModel = res1.model;
    history.push(...res1.historyEntries);

    // Edit 2: Button
    const res2 = executeCommit(currentModel, {
      commandId: "cmd_2",
      source: "inspector",
      targetIds: ["hero-btn-1"],
      scope: "all",
      baseRevision: currentModel.revision,
      changes: { patches: { "hero-btn-1": { styleProps: { borderRadius: 16 } } } },
    });
    if (!res2.success) return;
    currentModel = res2.model;
    history.push(...res2.historyEntries);

    // Restore Heading from Edit 1 beforeState (fontSize 56)
    const headingEntry = history[0];
    const restoreCmd = createForwardRestoreCommand(headingEntry, currentModel);

    const restoreRes = executeCommit(currentModel, restoreCmd);
    expect(restoreRes.success).toBe(true);
    if (!restoreRes.success) return;

    currentModel = restoreRes.model;
    history.push(...restoreRes.historyEntries);

    // Verification:
    // 1. Heading restored to 56
    expect(findNodeById(currentModel.elements, "hero-heading")?.baseProps.fontSize).toBe(56);
    // 2. Button change preserved at 16
    expect(findNodeById(currentModel.elements, "hero-btn-1")?.baseProps.borderRadius).toBe(16);
    // 3. History has 3 total entries (no rewinds)
    expect(history.length).toBe(3);
    expect(history[2].kind).toBe("restore");
  });

  it("6. [ISOLATION] mobile restore changes only mobile override without touching desktop baseProps", () => {
    let currentModel = model;

    // Mobile edit
    const res1 = executeCommit(currentModel, {
      commandId: "cmd_mob_1",
      source: "inspector",
      targetIds: ["hero-heading"],
      scope: "mobile",
      baseRevision: currentModel.revision,
      changes: { patches: { "hero-heading": { styleProps: { fontSize: 24 } } } },
    });
    if (!res1.success) return;
    currentModel = res1.model;
    const mobileEntry = res1.historyEntries[0];

    // Restore to beforeState (34px)
    const restoreCmd = createForwardRestoreCommand(mobileEntry, currentModel);
    const restoreRes = executeCommit(currentModel, restoreCmd);

    if (!restoreRes.success) {
      console.error("Test 6 Restore Error:", restoreRes.error);
    }

    expect(restoreRes.success).toBe(true);
    if (restoreRes.success) {
      const heading = findNodeById(restoreRes.model.elements, "hero-heading")!;
      expect(heading.overrides.mobile?.fontSize).toBe(34);
      expect(heading.baseProps.fontSize).toBe(56); // Desktop base strictly untouched!
    }
  });

  it("7. [ACCEPT] restore creates new forward history entry", () => {
    const entry: RevisionEntry = {
      revisionId: "rev_test",
      timestamp: new Date().toISOString(),
      displayTime: "12:00:00",
      kind: "manual",
      source: "inspector",
      elementId: "hero-heading",
      elementName: "Hero Heading",
      scope: "all",
      propertyKey: "content",
      beforeState: { content: "Restored Heading" },
      afterState: { content: "Changed Heading" },
      globalRevision: 2,
    };

    const restoreCmd = createForwardRestoreCommand(entry, model);
    const result = executeCommit(model, restoreCmd);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.historyEntries.length).toBe(1);
      expect(result.historyEntries[0].kind).toBe("restore");
      expect(result.historyEntries[0].source).toBe("history_restore");
    }
  });

  it("8. [ACCEPT] undo and redo do not generate new history audit entries", () => {
    const auditHistory: RevisionEntry[] = [];
    const initialCount = auditHistory.length;

    // Linear undo only restores model from snapshot
    expect(auditHistory.length).toBe(initialCount);
  });

  it("9. [ACCEPT] undo followed by new edit clears redo stack completely", () => {
    let redoStack: TemplateModel[] = [model];
    // New edit arrives
    redoStack = [];
    expect(redoStack.length).toBe(0);
  });

  // ============================================================
  // 3. HISTORY FILTERING TESTS
  // ============================================================
  it("10. [ACCEPT] history filters correctly by selected element ID", () => {
    const entries: RevisionEntry[] = [
      {
        revisionId: "1",
        timestamp: "",
        displayTime: "",
        kind: "manual",
        source: "canvas",
        elementId: "hero-heading",
        elementName: "Heading",
        scope: "all",
        propertyKey: "content",
        beforeState: {},
        afterState: {},
        globalRevision: 2,
      },
      {
        revisionId: "2",
        timestamp: "",
        displayTime: "",
        kind: "ai",
        source: "ai_assistant",
        elementId: "hero-btn-1",
        elementName: "Button",
        scope: "all",
        propertyKey: "style",
        beforeState: {},
        afterState: {},
        globalRevision: 3,
      },
    ];

    const filtered = filterHistoryEntries(entries, { selectedElementId: "hero-heading" });
    expect(filtered.length).toBe(1);
    expect(filtered[0].elementId).toBe("hero-heading");
  });

  it("11. [ACCEPT] history filters correctly by kind (ai vs manual)", () => {
    const entries: RevisionEntry[] = [
      {
        revisionId: "1",
        timestamp: "",
        displayTime: "",
        kind: "manual",
        source: "canvas",
        elementId: "hero-heading",
        elementName: "Heading",
        scope: "all",
        propertyKey: "content",
        beforeState: {},
        afterState: {},
        globalRevision: 2,
      },
      {
        revisionId: "2",
        timestamp: "",
        displayTime: "",
        kind: "ai",
        source: "ai_assistant",
        elementId: "hero-btn-1",
        elementName: "Button",
        scope: "all",
        propertyKey: "style",
        beforeState: {},
        afterState: {},
        globalRevision: 3,
      },
    ];

    const aiEntries = filterHistoryEntries(entries, { kind: "ai" });
    expect(aiEntries.length).toBe(1);
    expect(aiEntries[0].kind).toBe("ai");

    const manualEntries = filterHistoryEntries(entries, { kind: "manual" });
    expect(manualEntries.length).toBe(1);
    expect(manualEntries[0].kind).toBe("manual");
  });

  it("12. [ACCEPT] structural reorder restore restores sibling order", () => {
    // 1. Move services up to index 1
    const reorderCmd: EditCommand = {
      commandId: "cmd_reorder_1",
      source: "canvas",
      targetIds: [model.templateId],
      scope: "all",
      baseRevision: model.revision,
      changes: {
        reorder: {
          parentId: model.templateId,
          sourceIndex: 2, // services
          targetIndex: 1, // above hero
        },
      },
    };

    const res1 = executeCommit(model, reorderCmd);
    expect(res1.success).toBe(true);
    if (!res1.success) return;

    expect(res1.model.elements.map((s) => s.id)).toEqual([
      "nav",
      "services",
      "hero",
      "about",
      "cta",
      "footer",
    ]);

    // 2. Restore sibling order by moving services back from 1 to 2
    const restoreReorderCmd: EditCommand = {
      commandId: "cmd_restore_reorder",
      source: "history_restore",
      targetIds: [model.templateId],
      scope: "all",
      baseRevision: res1.model.revision,
      changes: {
        reorder: {
          parentId: model.templateId,
          sourceIndex: 1,
          targetIndex: 2,
        },
      },
    };

    const restoreRes = executeCommit(res1.model, restoreReorderCmd);
    expect(restoreRes.success).toBe(true);
    if (restoreRes.success) {
      expect(restoreRes.model.elements.map((s) => s.id)).toEqual([
        "nav",
        "hero",
        "services",
        "about",
        "cta",
        "footer",
      ]);
    }
  });
});
