import { describe, it, expect, beforeEach } from "vitest";
import { initialTemplateModel } from "../templateData";
import { findNodeById } from "../treeUtils";
import { resolveElementProps } from "../resolver";
import { executeCommit } from "../commitPipeline";
import { reconcileMarkupToCommand, templateToMarkup } from "../codeReconciler";
import { generateAiProposal, isProposalStale } from "../aiEngine";
import { createForwardRestoreCommand, pushUndoSnapshot } from "../historyManager";
import { saveStoredState, loadStoredState } from "../storage";
import type { TemplateModel, EditCommand, RevisionEntry } from "../types";

describe("Phase 7: End-to-End System Integration Smoke Test", () => {
  let model: TemplateModel;
  let history: RevisionEntry[];
  let undoStack: TemplateModel[];
  let redoStack: TemplateModel[];

  beforeEach(() => {
    model = JSON.parse(JSON.stringify(initialTemplateModel));
    history = [];
    undoStack = [];
    redoStack = [];
  });

  it("Executes the complete 24-step cross-feature workflow flawlessly", () => {
    // 1. Initial State
    expect(model.revision).toBe(1);
    expect(model.elements.length).toBe(6);

    // 2. Select Hero Heading
    const heroHeading = findNodeById(model.elements, "hero-heading")!;
    expect(heroHeading).toBeDefined();

    // 3. Inspector Desktop Edit (fontSize 56 -> 64)
    undoStack = pushUndoSnapshot(undoStack, model);
    redoStack = [];
    const inspectorEdit: EditCommand = {
      commandId: "cmd_insp_1",
      source: "inspector",
      targetIds: ["hero-heading"],
      scope: "all",
      baseRevision: model.revision,
      changes: { patches: { "hero-heading": { styleProps: { fontSize: 64 } } } },
    };
    const res1 = executeCommit(model, inspectorEdit);
    expect(res1.success).toBe(true);
    if (!res1.success) return;
    model = res1.model;
    history.push(...res1.historyEntries);

    expect(model.revision).toBe(2);
    expect(findNodeById(model.elements, "hero-heading")?.baseProps.fontSize).toBe(64);

    // 4. Switch to Mobile Viewport and verify base cascade
    const resolvedMobileBefore = resolveElementProps(findNodeById(model.elements, "hero-heading")!, "mobile");
    expect(resolvedMobileBefore.fontSize).toBe(34); // initial mobile override

    // 5. Mobile Override via Inspector (fontSize -> 30)
    undoStack = pushUndoSnapshot(undoStack, model);
    const mobileEdit: EditCommand = {
      commandId: "cmd_mob_override",
      source: "inspector",
      targetIds: ["hero-heading"],
      scope: "mobile",
      baseRevision: model.revision,
      changes: { patches: { "hero-heading": { styleProps: { fontSize: 30 } } } },
    };
    const res2 = executeCommit(model, mobileEdit);
    expect(res2.success).toBe(true);
    if (!res2.success) return;
    model = res2.model;
    history.push(...res2.historyEntries);

    expect(model.revision).toBe(3);
    const headingAfterMobile = findNodeById(model.elements, "hero-heading")!;
    expect(headingAfterMobile.overrides.mobile?.fontSize).toBe(30);

    // 6. Switch back to Desktop and confirm Desktop base remains 64px
    expect(headingAfterMobile.baseProps.fontSize).toBe(64);
    expect(resolveElementProps(headingAfterMobile, "desktop").fontSize).toBe(64);

    // 7. Code Editor Bidirectional Sync (Serialize -> Edit -> Reconcile -> Commit)
    const currentMarkup = templateToMarkup(headingAfterMobile, "selected");
    expect(currentMarkup).toContain('id="hero-heading"');

    const modifiedMarkup = currentMarkup.replace(
      headingAfterMobile.content || "",
      "Nova Engine Digital Craft"
    );

    const reconciled = reconcileMarkupToCommand(
      model,
      modifiedMarkup,
      model.revision,
      "selected",
      "hero-heading"
    );
    expect(reconciled.success).toBe(true);
    if (!reconciled.success) return;

    undoStack = pushUndoSnapshot(undoStack, model);
    const res3 = executeCommit(model, reconciled.command);
    expect(res3.success).toBe(true);
    if (!res3.success) return;
    model = res3.model;
    history.push(...res3.historyEntries);

    expect(model.revision).toBe(4);
    expect(findNodeById(model.elements, "hero-heading")?.content).toBe("Nova Engine Digital Craft");

    // 8. AI Assistant Workflow (Proposal -> Stale Guard -> Accept)
    const selected = findNodeById(model.elements, "hero-heading")!;
    const aiRes = generateAiProposal(model, "make it punchier", selected, "selected", "desktop");
    expect(aiRes.success).toBe(true);
    if (!aiRes.success) return;
    const proposal = aiRes.proposal;

    expect(isProposalStale(proposal, model)).toBe(false);

    // User accepts proposal
    undoStack = pushUndoSnapshot(undoStack, model);
    const res4 = executeCommit(model, proposal.command);
    expect(res4.success).toBe(true);
    if (!res4.success) return;
    model = res4.model;
    history.push(...res4.historyEntries);

    expect(model.revision).toBe(5);
    expect(history.length).toBe(4);

    // 9. History Drawer Restore: Restore Revision 1 base font size (56px)
    const rev1Entry = history[0];
    expect(rev1Entry.beforeState.props?.fontSize).toBe(56);

    const restoreCmd = createForwardRestoreCommand(rev1Entry, model);
    undoStack = pushUndoSnapshot(undoStack, model);
    const res5 = executeCommit(model, restoreCmd);
    expect(res5.success).toBe(true);
    if (!res5.success) return;
    model = res5.model;
    history.push(...res5.historyEntries);

    expect(model.revision).toBe(6);
    expect(findNodeById(model.elements, "hero-heading")?.baseProps.fontSize).toBe(56);
    expect(history[history.length - 1].kind).toBe("restore");

    // 10. Linear Undo / Redo Test
    // Undo restore: model rev 6 -> rev 5
    const undoneModel = undoStack[undoStack.length - 1];
    undoStack = undoStack.slice(0, -1);
    redoStack = [...redoStack, model];
    model = undoneModel;

    expect(model.revision).toBe(5);

    // Redo: model rev 5 -> rev 6
    const redoneModel = redoStack[redoStack.length - 1];
    redoStack = redoStack.slice(0, -1);
    undoStack = [...undoStack, model];
    model = redoneModel;

    expect(model.revision).toBe(6);

    // 11. LocalStorage Persistence Roundtrip
    saveStoredState(model, history);
    const loaded = loadStoredState();

    expect(loaded.model.revision).toBe(6);
    expect(loaded.history.length).toBe(5);
    expect(findNodeById(loaded.model.elements, "hero-heading")?.content).toBe(
      findNodeById(model.elements, "hero-heading")?.content
    );
  });
});
