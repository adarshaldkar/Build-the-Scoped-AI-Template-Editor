import { describe, it, expect, beforeEach } from "vitest";
import { initialTemplateModel } from "../templateData";
import { resolveElementProps } from "../resolver";
import { executeCommit } from "../commitPipeline";
import { findNodeById } from "../treeUtils";
import { validateTemplateModel } from "../validation";
import { saveStoredState, loadStoredState, clearStoredState } from "../storage";
import type { TemplateModel, EditCommand } from "../types";

describe("Phase 0: Canonical Model, Persistence, and Resolution", () => {
  it("[ACCEPT] canonical template model is JSON-serializable and roundtrips losslessly", () => {
    const serialized = JSON.stringify(initialTemplateModel);
    const deserialized: TemplateModel = JSON.parse(serialized);

    expect(deserialized.templateId).toBe("nova-studio-landing");
    expect(deserialized.schemaVersion).toBe("1.0.0");
    expect(deserialized.elements.length).toBeGreaterThan(0);
    expect(deserialized).toEqual(initialTemplateModel);
  });

  it("[ACCEPT] validateTemplateModel passes on initial canonical model", () => {
    const error = validateTemplateModel(initialTemplateModel);
    expect(error).toBeNull();
  });

  it("[REJECT] validateTemplateModel detects duplicate element IDs across tree", () => {
    const duplicateModel: TemplateModel = JSON.parse(JSON.stringify(initialTemplateModel));
    // Invalidate by duplicating an ID
    duplicateModel.elements[0].children![0].children = [
      {
        id: "hero-heading", // duplicate of existing hero-heading!
        name: "Cloned Heading",
        kind: "text",
        icon: "text",
        version: 1,
        baseProps: {},
        overrides: {},
      },
    ];

    const error = validateTemplateModel(duplicateModel);
    expect(error).not.toBeNull();
    expect(error?.code).toBe("INVALID_TEMPLATE_MODEL");
    expect(error?.message).toContain("Duplicate element ID");
  });

  it("[REJECT] validateTemplateModel rejects unsupported schemaVersion", () => {
    const invalidModel: TemplateModel = {
      ...initialTemplateModel,
      schemaVersion: "2.0.0", // Unsupported
    };

    const error = validateTemplateModel(invalidModel);
    expect(error).not.toBeNull();
    expect(error?.code).toBe("INVALID_TEMPLATE_MODEL");
  });

  it("[ACCEPT] resolveElementProps resolves base props when no viewport override exists", () => {
    const heroHeading = findNodeById(initialTemplateModel.elements, "hero-heading")!;
    const resolvedDesktop = resolveElementProps(heroHeading, "desktop");

    expect(resolvedDesktop.fontSize).toBe(56);
    expect(resolvedDesktop.color).toBe("#18181B");
    expect(resolvedDesktop.fontFamily).toBe("Inter");
  });

  it("[ACCEPT] resolveElementProps correctly cascades to viewport override", () => {
    const heroHeading = findNodeById(initialTemplateModel.elements, "hero-heading")!;
    const resolvedMobile = resolveElementProps(heroHeading, "mobile");
    const resolvedTablet = resolveElementProps(heroHeading, "tablet");

    expect(resolvedMobile.fontSize).toBe(34);
    expect(resolvedMobile.color).toBe("#18181B"); // Inherited from base
    expect(resolvedTablet.fontSize).toBe(44);
  });

  it("[ACCEPT] storage persists and restores valid template model and history", () => {
    clearStoredState();
    const customModel: TemplateModel = {
      ...initialTemplateModel,
      revision: 42,
    };
    saveStoredState(customModel, []);
    const loaded = loadStoredState();

    expect(loaded.model.revision).toBe(42);
    expect(loaded.model.templateId).toBe("nova-studio-landing");
  });

  it("[ACCEPT] storage falls back to initial template data on corrupted or wrong-version data", () => {
    clearStoredState();
    const corruptedModel = {
      templateId: "corrupted",
      schemaVersion: "9.9.9", // Unknown version
      elements: "not-an-array",
    } as unknown as TemplateModel;

    saveStoredState(corruptedModel, []);
    const loaded = loadStoredState();

    expect(loaded.model.templateId).toBe("nova-studio-landing");
    expect(loaded.model.schemaVersion).toBe("1.0.0");
    expect(loaded.model.revision).toBe(1);
  });
});

describe("Phase 1: Validation Engine & Transactional Commit Invariants", () => {
  let model: TemplateModel;

  beforeEach(() => {
    model = JSON.parse(JSON.stringify(initialTemplateModel));
  });

  it("[ACCEPT] valid command modifies state, bumps element version, and increments template revision", () => {
    const command: EditCommand = {
      commandId: "cmd-1",
      source: "canvas",
      targetIds: ["hero-heading"],
      scope: "all",
      baseRevision: 1,
      changes: {
        content: "New Transformed Headline",
        styleProps: {
          color: "#000000",
        },
      },
    };

    const result = executeCommit(model, command);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.model.revision).toBe(2);
      const updatedNode = findNodeById(result.model.elements, "hero-heading")!;
      expect(updatedNode.content).toBe("New Transformed Headline");
      expect(updatedNode.baseProps.color).toBe("#000000");
      expect(updatedNode.version).toBe(2);
      expect(result.historyEntries.length).toBe(1);
      expect(result.historyEntries[0].elementId).toBe("hero-heading");
      expect(result.historyEntries[0].beforeState.content).toBe(
        "Designing digital experiences that move businesses forward."
      );
      expect(result.historyEntries[0].afterState.content).toBe("New Transformed Headline");
    }
  });

  it("[REJECT] unknown target ID returns TARGET_NOT_FOUND and leaves state untouched", () => {
    const command: EditCommand = {
      commandId: "cmd-2",
      source: "canvas",
      targetIds: ["non-existent-element-id"],
      scope: "all",
      baseRevision: 1,
      changes: {
        content: "Should not apply",
      },
    };

    const result = executeCommit(model, command);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("TARGET_NOT_FOUND");
    }
    expect(model.revision).toBe(1);
  });

  it("[REJECT] duplicate target IDs in single command returns DUPLICATE_TARGET_IDS", () => {
    const command: EditCommand = {
      commandId: "cmd-dup",
      source: "inspector",
      targetIds: ["hero-heading", "hero-heading"], // Duplicate!
      scope: "all",
      baseRevision: 1,
      changes: {
        content: "Duplicate target test",
      },
    };

    const result = executeCommit(model, command);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("DUPLICATE_TARGET_IDS");
    }
    expect(model.revision).toBe(1);
  });

  it("[REJECT] stale baseRevision returns STALE_REVISION and leaves state untouched", () => {
    const command: EditCommand = {
      commandId: "cmd-3",
      source: "ai_assistant",
      targetIds: ["hero-heading"],
      scope: "all",
      baseRevision: 999, // Stale! Current is 1
      changes: {
        content: "Stale update",
      },
    };

    const result = executeCommit(model, command);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("STALE_REVISION");
    }
    expect(model.revision).toBe(1);
  });

  it("[REJECT] empty command with no changes returns NO_CHANGES", () => {
    const command: EditCommand = {
      commandId: "cmd-4",
      source: "inspector",
      targetIds: ["hero-heading"],
      scope: "all",
      baseRevision: 1,
      changes: {},
    };

    const result = executeCommit(model, command);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NO_CHANGES");
    }
  });

  it("[REJECT] unknown/unwhitelisted style property returns SCHEMA_VALIDATION_FAILED", () => {
    const rawCommand = {
      commandId: "cmd-5",
      source: "inspector",
      targetIds: ["hero-heading"],
      scope: "all",
      baseRevision: 1,
      changes: {
        styleProps: {
          bananaColor: "red", // Unwhitelisted!
        },
      },
    };

    const result = executeCommit(model, rawCommand);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("SCHEMA_VALIDATION_FAILED");
    }
  });

  it("[REJECT] incompatible property on element kind returns INCOMPATIBLE_PROPERTY_FOR_ELEMENT", () => {
    const command: EditCommand = {
      commandId: "cmd-6",
      source: "inspector",
      targetIds: ["hero-heading"], // "text" kind
      scope: "all",
      baseRevision: 1,
      changes: {
        styleProps: {
          flexDirection: "row", // Incompatible with text kind!
        },
      },
    };

    const result = executeCommit(model, command);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("INCOMPATIBLE_PROPERTY_FOR_ELEMENT");
    }
  });

  it("[REJECT] content edit with single-viewport scope returns INVALID_SCOPE_FOR_CONTENT", () => {
    const command: EditCommand = {
      commandId: "cmd-7",
      source: "inspector",
      targetIds: ["hero-heading"],
      scope: "mobile", // Content cannot be scoped to mobile only!
      baseRevision: 1,
      changes: {
        content: "Mobile-only content attempt",
      },
    };

    const result = executeCommit(model, command);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("INVALID_SCOPE_FOR_CONTENT");
    }
  });

  it("[ISOLATION] scope: mobile writes exclusively to overrides.mobile without mutating desktop or base", () => {
    const command: EditCommand = {
      commandId: "cmd-8",
      source: "inspector",
      targetIds: ["hero-heading"],
      scope: "mobile",
      baseRevision: 1,
      changes: {
        styleProps: {
          fontSize: 28,
        },
      },
    };

    const result = executeCommit(model, command);

    expect(result.success).toBe(true);
    if (result.success) {
      const updatedNode = findNodeById(result.model.elements, "hero-heading")!;
      expect(updatedNode.overrides.mobile?.fontSize).toBe(28);
      expect(updatedNode.baseProps.fontSize).toBe(56); // Base unchanged
      expect(updatedNode.overrides.tablet?.fontSize).toBe(44); // Tablet unchanged
      expect(resolveElementProps(updatedNode, "desktop").fontSize).toBe(56);
      expect(resolveElementProps(updatedNode, "mobile").fontSize).toBe(28);
    }
  });

  it("[ISOLATION] scope: desktop writes exclusively to overrides.desktop", () => {
    const command: EditCommand = {
      commandId: "cmd-9",
      source: "inspector",
      targetIds: ["hero-heading"],
      scope: "desktop",
      baseRevision: 1,
      changes: {
        styleProps: {
          fontSize: 64,
        },
      },
    };

    const result = executeCommit(model, command);

    expect(result.success).toBe(true);
    if (result.success) {
      const updatedNode = findNodeById(result.model.elements, "hero-heading")!;
      expect(updatedNode.overrides.desktop?.fontSize).toBe(64);
      expect(resolveElementProps(updatedNode, "desktop").fontSize).toBe(64);
      expect(resolveElementProps(updatedNode, "mobile").fontSize).toBe(34); // Mobile unchanged
    }
  });

  it("[ATOMICITY] multi-target edit with one invalid target fails atomically", () => {
    const command: EditCommand = {
      commandId: "cmd-10",
      source: "ai_assistant",
      targetIds: ["hero-heading", "invalid-ghost-id"],
      scope: "all",
      baseRevision: 1,
      changes: {
        content: "Batch rewrite",
      },
    };

    const result = executeCommit(model, command);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("TARGET_NOT_FOUND");
    }

    // Verify hero-heading was NOT mutated
    const heroHeading = findNodeById(model.elements, "hero-heading")!;
    expect(heroHeading.content).toBe(
      "Designing digital experiences that move businesses forward."
    );
    expect(model.revision).toBe(1);
  });

  it("[IMMUTABILITY] original model remains strictly unmodified after commit", () => {
    const originalRevision = model.revision;
    const originalHeadingContent = findNodeById(model.elements, "hero-heading")!.content;

    const command: EditCommand = {
      commandId: "cmd-11",
      source: "canvas",
      targetIds: ["hero-heading"],
      scope: "all",
      baseRevision: 1,
      changes: {
        content: "Brand New Heading",
      },
    };

    const result = executeCommit(model, command);

    expect(result.success).toBe(true);
    expect(model.revision).toBe(originalRevision);
    expect(findNodeById(model.elements, "hero-heading")!.content).toBe(originalHeadingContent);
  });

  it("[ACCEPT] valid structural reorder modifies sibling order, increments version and revision", () => {
    // Reorder nav links inside "nav-links" container (4 links: nav-1, nav-2, nav-3, nav-4)
    const command: EditCommand = {
      commandId: "cmd-reorder-1",
      source: "canvas",
      targetIds: ["nav-links"],
      scope: "all",
      baseRevision: 1,
      changes: {
        reorder: {
          parentId: "nav-links",
          sourceIndex: 0, // "Work"
          targetIndex: 2, // move to index 2
        },
      },
    };

    const result = executeCommit(model, command);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.model.revision).toBe(2);
      const navLinksNode = findNodeById(result.model.elements, "nav-links")!;
      const childrenIds = navLinksNode.children!.map((c) => c.id);
      expect(childrenIds).toEqual(["nav-2", "nav-3", "nav-1", "nav-4"]);
      expect(navLinksNode.version).toBe(2);
      expect(result.historyEntries.length).toBe(1);
      expect(result.historyEntries[0].propertyKey).toBe("structure");
    }
  });

  it("[REJECT] reorder with single-viewport scope returns INVALID_SCOPE_FOR_REORDER", () => {
    const command: EditCommand = {
      commandId: "cmd-reorder-scope",
      source: "inspector",
      targetIds: ["nav-links"],
      scope: "mobile", // Reordering structure cannot be mobile-only!
      baseRevision: 1,
      changes: {
        reorder: {
          parentId: "nav-links",
          sourceIndex: 0,
          targetIndex: 1,
        },
      },
    };

    const result = executeCommit(model, command);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("INVALID_SCOPE_FOR_REORDER");
    }
  });

  it("[REJECT] reorder with out-of-bounds indices returns INVALID_REORDER", () => {
    const command: EditCommand = {
      commandId: "cmd-reorder-bounds",
      source: "canvas",
      targetIds: ["nav-links"],
      scope: "all",
      baseRevision: 1,
      changes: {
        reorder: {
          parentId: "nav-links",
          sourceIndex: 0,
          targetIndex: 99, // Out of bounds!
        },
      },
    };

    const result = executeCommit(model, command);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("INVALID_REORDER");
    }
  });

  it("[REJECT] reorder with non-existent parentId returns INVALID_REORDER", () => {
    const command: EditCommand = {
      commandId: "cmd-reorder-parent",
      source: "canvas",
      targetIds: ["hero-heading"],
      scope: "all",
      baseRevision: 1,
      changes: {
        reorder: {
          parentId: "ghost-parent-container",
          sourceIndex: 0,
          targetIndex: 1,
        },
      },
    };

    const result = executeCommit(model, command);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("INVALID_REORDER");
    }
  });
});
