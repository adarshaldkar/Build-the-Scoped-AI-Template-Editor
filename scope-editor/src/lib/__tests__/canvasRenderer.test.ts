import { describe, it, expect, beforeEach } from "vitest";
import { initialTemplateModel } from "../templateData";
import { findNodeById } from "../treeUtils";
import { resolveElementProps } from "../resolver";
import { executeCommit } from "../commitPipeline";
import { VIEWPORT_WIDTHS, type TemplateModel, type EditCommand } from "../types";

describe("Phase 4: Visual Canvas, Viewport Resolution & Reordering Invariants", () => {
  let model: TemplateModel;

  beforeEach(() => {
    model = JSON.parse(JSON.stringify(initialTemplateModel));
  });

  // ============================================================
  // 1. VIEWPORT RESOLUTION TESTS
  // ============================================================
  it("[ACCEPT] resolves desktop baseProps for heading", () => {
    const heroHeading = findNodeById(model.elements, "hero-heading")!;
    const resolvedDesktop = resolveElementProps(heroHeading, "desktop");

    expect(resolvedDesktop.fontSize).toBe(56);
    expect(resolvedDesktop.color).toBe("#18181B");
    expect(resolvedDesktop.fontFamily).toBe("Inter");
  });

  it("[ACCEPT] resolves mobile overrides when active viewport is mobile", () => {
    const heroHeading = findNodeById(model.elements, "hero-heading")!;
    const resolvedMobile = resolveElementProps(heroHeading, "mobile");

    expect(resolvedMobile.fontSize).toBe(34); // Mobile override
    expect(resolvedMobile.color).toBe("#18181B"); // Base prop inherited
  });

  it("[ACCEPT] resolves tablet overrides when active viewport is tablet", () => {
    const heroHeading = findNodeById(model.elements, "hero-heading")!;
    const resolvedTablet = resolveElementProps(heroHeading, "tablet");

    expect(resolvedTablet.fontSize).toBe(44); // Tablet override
  });

  it("[ACCEPT] verifies canonical viewport widths", () => {
    expect(VIEWPORT_WIDTHS.desktop).toBe(1440);
    expect(VIEWPORT_WIDTHS.tablet).toBe(768);
    expect(VIEWPORT_WIDTHS.mobile).toBe(375);
  });

  // ============================================================
  // 2. INLINE TEXT EDIT COMMIT INTEGRATION
  // ============================================================
  it("[ACCEPT] commits inline text change through Phase 1 pipeline with scope: all", () => {
    const heroHeading = findNodeById(model.elements, "hero-heading")!;
    const newText = "Directly Edited Headline on Canvas";

    const inlineCommand: EditCommand = {
      commandId: "cmd_inline_test",
      source: "canvas",
      targetIds: [heroHeading.id],
      scope: "all",
      baseRevision: model.revision,
      changes: {
        patches: {
          [heroHeading.id]: { content: newText },
        },
      },
      metadata: { description: `Inline text edit on ${heroHeading.name}` },
    };

    const result = executeCommit(model, inlineCommand);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.model.revision).toBe(2);
      const updated = findNodeById(result.model.elements, "hero-heading")!;
      expect(updated.content).toBe("Directly Edited Headline on Canvas");
      expect(result.historyEntries[0].source).toBe("canvas");
    }
  });

  // ============================================================
  // 3. SECTION MOVE UP / DOWN REORDER TESTS
  // ============================================================
  it("[ACCEPT] section Move Down reorders sibling sections and increments revision", () => {
    // Current sections: nav (0), hero (1), services (2), about (3), cta (4), footer (5)
    const command: EditCommand = {
      commandId: "cmd_move_down",
      source: "canvas",
      targetIds: [model.templateId],
      scope: "all",
      baseRevision: model.revision,
      changes: {
        reorder: {
          parentId: model.templateId,
          sourceIndex: 1, // Move hero down to index 2
          targetIndex: 2,
        },
      },
    };

    const result = executeCommit(model, command);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.model.revision).toBe(2);
      const sectionIds = result.model.elements.map((s) => s.id);
      expect(sectionIds).toEqual(["nav", "services", "hero", "about", "cta", "footer"]);
      expect(result.historyEntries[0].propertyKey).toBe("structure");
    }
  });

  it("[REJECT] rejects out-of-bounds reorder (moving first section up)", () => {
    const invalidCommand: EditCommand = {
      commandId: "cmd_move_up_invalid",
      source: "canvas",
      targetIds: [model.templateId],
      scope: "all",
      baseRevision: model.revision,
      changes: {
        reorder: {
          parentId: model.templateId,
          sourceIndex: 0,
          targetIndex: -1, // Invalid index!
        },
      },
    };

    const result = executeCommit(model, invalidCommand);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("SCHEMA_VALIDATION_FAILED");
    }
  });
});
