import { describe, it, expect, beforeEach } from "vitest";
import { initialTemplateModel } from "../templateData";
import { findNodeById } from "../treeUtils";
import {
  generateAiProposal,
  isProposalStale,
  getContextualQuickChips,
} from "../aiEngine";
import { executeCommit } from "../commitPipeline";
import type { TemplateModel } from "../types";

describe("Phase 3: Deterministic AI Assistant & Proposal Pipeline", () => {
  let model: TemplateModel;

  beforeEach(() => {
    model = JSON.parse(JSON.stringify(initialTemplateModel));
  });

  // ============================================================
  // 1. GUARD & SELECTION TESTS
  // ============================================================
  it("[REJECT] returns INVALID_SCOPE_SELECTION when target mode is selected but selectedNode is null", () => {
    const result = generateAiProposal(model, "Make it punchier", null, "selected", "desktop");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("INVALID_SCOPE_SELECTION");
    }
  });

  it("[ACCEPT] generates context-aware quick chips based on element kind and viewport", () => {
    const heroHeading = findNodeById(model.elements, "hero-heading")!;
    const desktopChips = getContextualQuickChips(heroHeading, "selected", "desktop");
    expect(desktopChips).toContain("Make it Punchier");
    expect(desktopChips).toContain("Bolder Hierarchy");

    const heroCta = findNodeById(model.elements, "hero-cta")!;
    const mobileChips = getContextualQuickChips(heroCta, "selected", "mobile");
    expect(mobileChips).toContain("Stack Buttons Vertically");
  });

  // ============================================================
  // 2. SCENARIO TESTS
  // ============================================================
  it("[ACCEPT] generates punchy copywriting proposal for selected heading", () => {
    const heroHeading = findNodeById(model.elements, "hero-heading")!;
    const result = generateAiProposal(model, "Make heading punchier", heroHeading, "selected", "desktop");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.proposal.scope).toBe("all");
      expect(result.proposal.targetIds).toEqual(["hero-heading"]);
      expect(result.proposal.diffs[0].afterContent).toBe("Digital products built to lead.");
      expect(result.proposal.command.source).toBe("ai_assistant");
    }
  });

  it("[ACCEPT] generates enterprise B2B copywriting proposal for selected paragraph", () => {
    const heroDesc = findNodeById(model.elements, "hero-desc")!;
    const result = generateAiProposal(model, "More corporate enterprise B2B tone", heroDesc, "selected", "desktop");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.proposal.diffs[0].afterContent).toContain("Partnering with global organizations");
    }
  });

  it("[ACCEPT] generates visual hierarchy typography proposal (fontSize, fontWeight)", () => {
    const heroHeading = findNodeById(model.elements, "hero-heading")!;
    const result = generateAiProposal(model, "Increase visual hierarchy make bolder", heroHeading, "selected", "desktop");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.proposal.diffs[0].afterProps?.fontSize).toBe(64);
      expect(result.proposal.diffs[0].afterProps?.fontWeight).toBe(800);
    }
  });

  it("[ACCEPT] generates dark luxury color theme proposal across full template", () => {
    const result = generateAiProposal(model, "Apply dark luxury theme", null, "full", "desktop");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.proposal.targetIds).toContain("hero");
      expect(result.proposal.targetIds).toContain("hero-heading");
      expect(result.proposal.diffs.find((d) => d.elementId === "hero")?.afterProps?.backgroundColor).toBe("#09090B");
    }
  });

  it("[ACCEPT] generates mobile-isolated layout proposal (overrides.mobile only) when mobile viewport active", () => {
    const heroCta = findNodeById(model.elements, "hero-cta")!;
    const result = generateAiProposal(model, "Stack buttons vertically for mobile", heroCta, "selected", "mobile");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.proposal.scope).toBe("mobile");
      expect(result.proposal.targetIds).toContain("hero-cta");

      // Commit through Phase 1 transactional pipeline
      const commitResult = executeCommit(model, result.proposal.command);
      expect(commitResult.success).toBe(true);
      if (commitResult.success) {
        const updatedCta = findNodeById(commitResult.model.elements, "hero-cta")!;
        expect(updatedCta.overrides.mobile?.flexDirection).toBe("column");
        expect(updatedCta.baseProps.flexDirection).toBe("row"); // Base layer strictly preserved as "row"!
      }
    }
  });

  it("[ACCEPT] generates multi-element synchronized proposal for all CTA buttons using patches", () => {
    const result = generateAiProposal(model, "Polish all CTA buttons", null, "full", "desktop");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.proposal.targetIds.length).toBeGreaterThanOrEqual(2);
      expect(result.proposal.command.changes.patches).toBeDefined();

      const commitResult = executeCommit(model, result.proposal.command);
      expect(commitResult.success).toBe(true);
      if (commitResult.success) {
        const btn1 = findNodeById(commitResult.model.elements, "hero-btn-1")!;
        expect(btn1.baseProps.borderRadius).toBe(8);
        expect(btn1.baseProps.fontWeight).toBe(600);
      }
    }
  });

  it("[ACCEPT] generates structural reorder proposal with before/after structure diff", () => {
    const result = generateAiProposal(model, "Move services above about", null, "full", "desktop");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.proposal.command.changes.reorder).toBeDefined();
      expect(result.proposal.diffs[0].beforeStructure).toBeDefined();
      expect(result.proposal.diffs[0].afterStructure).toBeDefined();
    }
  });

  // ============================================================
  // 3. STALE GUARD & LIFECYCLE TESTS
  // ============================================================
  it("[STALE] detects proposal as stale when model revision changes before acceptance", () => {
    const heroHeading = findNodeById(model.elements, "hero-heading")!;
    const result = generateAiProposal(model, "Make heading punchier", heroHeading, "selected", "desktop");

    expect(result.success).toBe(true);
    if (result.success) {
      const proposal = result.proposal;
      expect(isProposalStale(proposal, model)).toBe(false);

      // Model revision increments (e.g. manual edit on canvas)
      const modifiedModel: TemplateModel = {
        ...model,
        revision: model.revision + 1,
      };

      expect(isProposalStale(proposal, modifiedModel)).toBe(true);

      // Stale commit attempt through Phase 1 fails atomically
      const staleCommitResult = executeCommit(modifiedModel, proposal.command);
      expect(staleCommitResult.success).toBe(false);
      if (!staleCommitResult.success) {
        expect(staleCommitResult.error.code).toBe("STALE_REVISION");
      }
    }
  });

  it("[ACCEPT] committing accepted proposal increments model revision and logs AI history delta", () => {
    const heroHeading = findNodeById(model.elements, "hero-heading")!;
    const result = generateAiProposal(model, "Make heading punchier", heroHeading, "selected", "desktop");

    expect(result.success).toBe(true);
    if (result.success) {
      const commitResult = executeCommit(model, result.proposal.command);
      expect(commitResult.success).toBe(true);
      if (commitResult.success) {
        expect(commitResult.model.revision).toBe(2);
        expect(commitResult.historyEntries.length).toBe(1);
        expect(commitResult.historyEntries[0].kind).toBe("ai");
        expect(commitResult.historyEntries[0].source).toBe("ai_assistant");
      }
    }
  });

  it("[IMMUTABILITY] rejecting proposal leaves template model strictly unmodified", () => {
    const originalRevision = model.revision;
    const heroHeading = findNodeById(model.elements, "hero-heading")!;
    const result = generateAiProposal(model, "Make heading punchier", heroHeading, "selected", "desktop");

    expect(result.success).toBe(true);
    // User rejects proposal -> no commit called
    expect(model.revision).toBe(originalRevision);
  });
});
