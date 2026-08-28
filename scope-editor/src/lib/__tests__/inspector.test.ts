import { describe, it, expect, beforeEach } from "vitest";
import { initialTemplateModel } from "../templateData";
import { findNodeById } from "../treeUtils";
import { resolveElementProps } from "../resolver";
import { executeCommit } from "../commitPipeline";
import type { TemplateModel, EditCommand } from "../types";

describe("Phase 5: Inspector Panel & Viewport Overrides Invariants", () => {
  let model: TemplateModel;

  beforeEach(() => {
    model = JSON.parse(JSON.stringify(initialTemplateModel));
  });

  // ============================================================
  // 1. SCOPE ROUTING TESTS
  // ============================================================
  it("[ACCEPT] modifying style on Desktop viewport writes to baseProps (scope: all)", () => {
    const heroHeading = findNodeById(model.elements, "hero-heading")!;

    const command: EditCommand = {
      commandId: "cmd_desktop_edit",
      source: "inspector",
      targetIds: [heroHeading.id],
      scope: "all",
      baseRevision: model.revision,
      changes: {
        patches: {
          [heroHeading.id]: {
            styleProps: { fontSize: 60 },
          },
        },
      },
    };

    const result = executeCommit(model, command);

    expect(result.success).toBe(true);
    if (result.success) {
      const updated = findNodeById(result.model.elements, "hero-heading")!;
      expect(updated.baseProps.fontSize).toBe(60);
      expect(updated.overrides.mobile?.fontSize).toBe(34); // Preserved mobile override
    }
  });

  it("[ISOLATION] modifying style on Mobile viewport writes strictly to overrides.mobile (scope: mobile)", () => {
    const heroHeading = findNodeById(model.elements, "hero-heading")!;

    const command: EditCommand = {
      commandId: "cmd_mobile_override",
      source: "inspector",
      targetIds: [heroHeading.id],
      scope: "mobile",
      baseRevision: model.revision,
      changes: {
        patches: {
          [heroHeading.id]: {
            styleProps: { fontSize: 28 },
          },
        },
      },
    };

    const result = executeCommit(model, command);

    expect(result.success).toBe(true);
    if (result.success) {
      const updated = findNodeById(result.model.elements, "hero-heading")!;
      expect(updated.overrides.mobile?.fontSize).toBe(28);
      expect(updated.baseProps.fontSize).toBe(56); // Base props strictly untouched!
      expect(resolveElementProps(updated, "desktop").fontSize).toBe(56);
      expect(resolveElementProps(updated, "mobile").fontSize).toBe(28);
    }
  });

  it("[ISOLATION] modifying style on Tablet viewport writes strictly to overrides.tablet (scope: tablet)", () => {
    const heroHeading = findNodeById(model.elements, "hero-heading")!;

    const command: EditCommand = {
      commandId: "cmd_tablet_override",
      source: "inspector",
      targetIds: [heroHeading.id],
      scope: "tablet",
      baseRevision: model.revision,
      changes: {
        patches: {
          [heroHeading.id]: {
            styleProps: { fontSize: 40 },
          },
        },
      },
    };

    const result = executeCommit(model, command);

    expect(result.success).toBe(true);
    if (result.success) {
      const updated = findNodeById(result.model.elements, "hero-heading")!;
      expect(updated.overrides.tablet?.fontSize).toBe(40);
      expect(updated.baseProps.fontSize).toBe(56);
    }
  });

  // ============================================================
  // 2. OVERRIDE RESET & PROPERTY-LEVEL DELETION TESTS
  // ============================================================
  it("[ACCEPT] resetting viewport override deletes key from overrides and falls back to baseProps", () => {
    const heroHeading = findNodeById(model.elements, "hero-heading")!;
    expect(heroHeading.overrides.mobile?.fontSize).toBe(34);

    // Reset mobile fontSize override
    const resetCommand: EditCommand = {
      commandId: "cmd_reset_mobile_fontsize",
      source: "inspector",
      targetIds: [heroHeading.id],
      scope: "mobile",
      baseRevision: model.revision,
      changes: {
        patches: {
          [heroHeading.id]: {
            styleProps: {
              fontSize: undefined, // Explicit override deletion
            },
          },
        },
      },
    };

    const result = executeCommit(model, resetCommand);

    expect(result.success).toBe(true);
    if (result.success) {
      const updated = findNodeById(result.model.elements, "hero-heading")!;
      expect(updated.overrides.mobile?.fontSize).toBeUndefined();
      // Resolving mobile now falls back seamlessly to baseProps (56px)
      expect(resolveElementProps(updated, "mobile").fontSize).toBe(56);
    }
  });

  it("[ISOLATION] resetting one property override preserves other sibling overrides on the same viewport", () => {
    // 1. Setup element with multiple mobile overrides
    const heroCta = findNodeById(model.elements, "hero-cta")!;

    const setupCommand: EditCommand = {
      commandId: "cmd_setup_multiple_overrides",
      source: "inspector",
      targetIds: [heroCta.id],
      scope: "mobile",
      baseRevision: model.revision,
      changes: {
        patches: {
          [heroCta.id]: {
            styleProps: {
              flexDirection: "column",
              gap: 12,
              paddingTop: 24,
            },
          },
        },
      },
    };

    const setupResult = executeCommit(model, setupCommand);
    expect(setupResult.success).toBe(true);
    if (!setupResult.success) return;

    let updatedModel = setupResult.model;

    // 2. Reset ONLY paddingTop override
    const resetPaddingCommand: EditCommand = {
      commandId: "cmd_reset_padding_only",
      source: "inspector",
      targetIds: [heroCta.id],
      scope: "mobile",
      baseRevision: updatedModel.revision,
      changes: {
        patches: {
          [heroCta.id]: {
            styleProps: {
              paddingTop: undefined,
            },
          },
        },
      },
    };

    const resetResult = executeCommit(updatedModel, resetPaddingCommand);
    expect(resetResult.success).toBe(true);
    if (resetResult.success) {
      const cta = findNodeById(resetResult.model.elements, "hero-cta")!;
      expect(cta.overrides.mobile?.paddingTop).toBeUndefined(); // Deleted
      expect(cta.overrides.mobile?.flexDirection).toBe("column"); // Preserved!
      expect(cta.overrides.mobile?.gap).toBe(12); // Preserved!
    }
  });
});
