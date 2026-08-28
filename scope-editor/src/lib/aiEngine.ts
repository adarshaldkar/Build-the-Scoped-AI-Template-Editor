import type {
  ElementNode,
  TemplateModel,
  ElementStyleProps,
  EditCommand,
  Viewport,
  Scope,
  ValidationError,
} from "./types";
import { findNodeById } from "./treeUtils";

export interface ProposalDiff {
  elementId: string;
  elementName: string;
  beforeContent?: string;
  afterContent?: string;
  beforeProps?: Partial<ElementStyleProps>;
  afterProps?: Partial<ElementStyleProps>;
  beforeStructure?: string[];
  afterStructure?: string[];
}

export interface AiProposal {
  readonly id: string;
  readonly commandId: string;
  readonly baseRevision: number;
  readonly targetIds: string[];
  readonly scope: Scope;
  readonly prompt: string;
  readonly description: string;
  readonly status: "pending" | "accepted" | "rejected";
  readonly diffs: ProposalDiff[];
  readonly command: EditCommand;
}

// ============================================================
// 1. CONTEXTUAL QUICK ACTION CHIPS
// ============================================================

export function getContextualQuickChips(
  selectedNode: ElementNode | null,
  targetMode: "selected" | "full",
  activeViewport: Viewport
): string[] {
  if (targetMode === "full") {
    if (activeViewport === "mobile") {
      return ["Optimize for Mobile", "Stack All CTAs", "Compact Spacing", "Dark Luxury Theme"];
    }
    return ["Dark Luxury Theme", "Warm Editorial Theme", "Polish All CTAs", "Move Services Above About"];
  }

  if (!selectedNode) {
    return [];
  }

  if (activeViewport === "mobile") {
    if (selectedNode.kind === "container" || selectedNode.id.includes("cta")) {
      return ["Stack Buttons Vertically", "Full Width Buttons", "Compact Spacing"];
    }
    if (selectedNode.kind === "text") {
      return ["Scale for Mobile", "Punchier Copy", "Align Center"];
    }
  }

  if (selectedNode.kind === "text") {
    if (selectedNode.id.includes("heading")) {
      return ["Make it Punchier", "Bolder Hierarchy", "Enterprise B2B", "Minimal Studio"];
    }
    return ["Make it Concise", "Enterprise Tone", "Refine Spacing"];
  }

  if (selectedNode.kind === "button") {
    return ["Stronger CTA", "Rounded Button", "Accent Color"];
  }

  if (selectedNode.kind === "section" || selectedNode.kind === "container") {
    return ["Dark Luxury", "Warm Editorial", "Center Align Content"];
  }

  return ["Make it Punchier", "Dark Luxury Theme", "Bolder Hierarchy"];
}

// ============================================================
// 2. DETERMINISTIC INTENT MATCHER & PROPOSAL BUILDER
// ============================================================

/**
 * Evaluates whether a proposal is stale based on model revision.
 */
export function isProposalStale(proposal: AiProposal, currentModel: TemplateModel): boolean {
  return proposal.baseRevision !== currentModel.revision;
}

/**
 * Pure deterministic AI proposal generator.
 * Maps user prompts to typed, testable proposals across 6 defined scenarios.
 */
export function generateAiProposal(
  model: TemplateModel,
  rawPrompt: string,
  selectedNode: ElementNode | null,
  targetMode: "selected" | "full" = "selected",
  activeViewport: Viewport = "desktop"
): { success: true; proposal: AiProposal } | { success: false; error: ValidationError } {
  const prompt = rawPrompt.trim().toLowerCase();

  // Guard 1: Strict Selection Authority
  if (targetMode === "selected" && !selectedNode) {
    return {
      success: false,
      error: {
        code: "INVALID_SCOPE_SELECTION",
        message: "No element selected. Please select an element on the canvas or switch to Full Template mode.",
      },
    };
  }

  const proposalId = `prop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const commandId = `cmd_ai_${Date.now()}`;
  const baseRevision = model.revision;

  // ------------------------------------------------------------
  // SCENARIO 6: Structural Reordering
  // ------------------------------------------------------------
  if (
    prompt.includes("move services above about") ||
    prompt.includes("reorder services") ||
    prompt.includes("services above about")
  ) {
    const rootContainer = model;
    const servicesIndex = rootContainer.elements.findIndex((el) => el.id === "services");
    const aboutIndex = rootContainer.elements.findIndex((el) => el.id === "about");

    if (servicesIndex === -1 || aboutIndex === -1) {
      return {
        success: false,
        error: {
          code: "TARGET_NOT_FOUND",
          message: "Services or About section not found in template.",
        },
      };
    }

    const beforeStructure = rootContainer.elements.map((el) => el.name);
    const targetIdx = Math.min(servicesIndex, aboutIndex);
    const sourceIdx = Math.max(servicesIndex, aboutIndex);

    const reordered = [...rootContainer.elements];
    const [moved] = reordered.splice(sourceIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    const afterStructure = reordered.map((el) => el.name);

    const command: EditCommand = {
      commandId,
      source: "ai_assistant",
      targetIds: ["nova-studio-landing"],
      scope: "all",
      baseRevision,
      changes: {
        reorder: {
          parentId: "nova-studio-landing",
          sourceIndex: sourceIdx,
          targetIndex: targetIdx,
        },
      },
      metadata: {
        prompt: rawPrompt,
        description: "Move Services section above About section",
      },
    };

    return {
      success: true,
      proposal: {
        id: proposalId,
        commandId,
        baseRevision,
        targetIds: ["nova-studio-landing"],
        scope: "all",
        prompt: rawPrompt,
        description: "Move Services section above About section",
        status: "pending",
        diffs: [
          {
            elementId: "nova-studio-landing",
            elementName: "Page Sections",
            beforeStructure,
            afterStructure,
          },
        ],
        command,
      },
    };
  }

  // ------------------------------------------------------------
  // SCENARIO 5: Multi-Element Synchronized Transformations
  // ------------------------------------------------------------
  if (
    prompt.includes("polish all cta") ||
    prompt.includes("all buttons") ||
    prompt.includes("polish buttons") ||
    prompt.includes("align hero content center") ||
    prompt.includes("center align hero")
  ) {
    if (prompt.includes("polish all cta") || prompt.includes("all buttons") || prompt.includes("polish buttons")) {
      const buttonIds = ["hero-btn-1", "hero-btn-2", "cta-btn-1"];
      const existingButtonIds = buttonIds.filter((id) => findNodeById(model.elements, id) !== null);

      const patches: Record<string, { styleProps: Partial<ElementStyleProps> }> = {};
      const diffs: ProposalDiff[] = [];

      for (const btnId of existingButtonIds) {
        const node = findNodeById(model.elements, btnId)!;
        const newProps: Partial<ElementStyleProps> = {
          borderRadius: 8,
          fontWeight: 600,
          paddingTop: 12,
          paddingBottom: 12,
          paddingLeft: 24,
          paddingRight: 24,
        };

        patches[btnId] = { styleProps: newProps };
        diffs.push({
          elementId: btnId,
          elementName: node.name,
          beforeProps: {
            borderRadius: node.baseProps.borderRadius,
            fontWeight: node.baseProps.fontWeight,
            paddingTop: node.baseProps.paddingTop,
          },
          afterProps: newProps,
        });
      }

      const command: EditCommand = {
        commandId,
        source: "ai_assistant",
        targetIds: existingButtonIds,
        scope: "all",
        baseRevision,
        changes: { patches },
        metadata: { prompt: rawPrompt, description: "Polish all CTA buttons with unified radius and padding" },
      };

      return {
        success: true,
        proposal: {
          id: proposalId,
          commandId,
          baseRevision,
          targetIds: existingButtonIds,
          scope: "all",
          prompt: rawPrompt,
          description: "Polish all CTA buttons with unified radius and padding",
          status: "pending",
          diffs,
          command,
        },
      };
    }

    if (prompt.includes("align hero content center") || prompt.includes("center align hero")) {
      const heroTargetIds = ["hero-eyebrow", "hero-heading", "hero-desc", "hero-cta"];
      const patches: Record<string, { styleProps: Partial<ElementStyleProps> }> = {};
      const diffs: ProposalDiff[] = [];

      for (const targetId of heroTargetIds) {
        const node = findNodeById(model.elements, targetId);
        if (!node) continue;

        const newProps: Partial<ElementStyleProps> =
          node.kind === "container"
            ? { justifyContent: "center", alignItems: "center" }
            : { textAlign: "center" };

        patches[targetId] = { styleProps: newProps };
        diffs.push({
          elementId: targetId,
          elementName: node.name,
          beforeProps: {
            textAlign: node.baseProps.textAlign,
            justifyContent: node.baseProps.justifyContent,
          },
          afterProps: newProps,
        });
      }

      const command: EditCommand = {
        commandId,
        source: "ai_assistant",
        targetIds: Object.keys(patches),
        scope: "all",
        baseRevision,
        changes: { patches },
        metadata: { prompt: rawPrompt, description: "Center-align all Hero content and CTA buttons" },
      };

      return {
        success: true,
        proposal: {
          id: proposalId,
          commandId,
          baseRevision,
          targetIds: Object.keys(patches),
          scope: "all",
          prompt: rawPrompt,
          description: "Center-align all Hero content and CTA buttons",
          status: "pending",
          diffs,
          command,
        },
      };
    }
  }

  // ------------------------------------------------------------
  // SCENARIO 3: Color Palette & Theme Shifting (Full Template / Section)
  // ------------------------------------------------------------
  if (
    prompt.includes("dark luxury") ||
    prompt.includes("dark theme") ||
    prompt.includes("warm editorial") ||
    prompt.includes("warm theme") ||
    prompt.includes("vibrant accent")
  ) {
    const isDark = prompt.includes("dark");
    const isWarm = prompt.includes("warm");

    const sectionBg = isDark ? "#09090B" : isWarm ? "#FAF9F6" : "#FFFFFF";
    const textColor = isDark ? "#F4F4F5" : isWarm ? "#18181B" : "#18181B";
    const btnBg = isDark ? "#FAFAFA" : isWarm ? "#18181B" : "#3D5AFE";
    const btnColor = isDark ? "#09090B" : "#FFFFFF";

    if (targetMode === "full") {
      const targetSectionIds = ["hero", "services", "about", "cta", "footer"];
      const patches: Record<string, { styleProps: Partial<ElementStyleProps> }> = {};
      const diffs: ProposalDiff[] = [];

      for (const secId of targetSectionIds) {
        const node = findNodeById(model.elements, secId);
        if (!node) continue;

        patches[secId] = { styleProps: { backgroundColor: sectionBg } };
        diffs.push({
          elementId: secId,
          elementName: node.name,
          beforeProps: { backgroundColor: node.baseProps.backgroundColor },
          afterProps: { backgroundColor: sectionBg },
        });
      }

      // Add hero heading and buttons
      const heroHeading = findNodeById(model.elements, "hero-heading");
      if (heroHeading) {
        patches["hero-heading"] = { styleProps: { color: textColor } };
        diffs.push({
          elementId: "hero-heading",
          elementName: heroHeading.name,
          beforeProps: { color: heroHeading.baseProps.color },
          afterProps: { color: textColor },
        });
      }

      const heroBtn = findNodeById(model.elements, "hero-btn-1");
      if (heroBtn) {
        patches["hero-btn-1"] = { styleProps: { backgroundColor: btnBg, color: btnColor } };
        diffs.push({
          elementId: "hero-btn-1",
          elementName: heroBtn.name,
          beforeProps: { backgroundColor: heroBtn.baseProps.backgroundColor, color: heroBtn.baseProps.color },
          afterProps: { backgroundColor: btnBg, color: btnColor },
        });
      }

      const command: EditCommand = {
        commandId,
        source: "ai_assistant",
        targetIds: Object.keys(patches),
        scope: "all",
        baseRevision,
        changes: { patches },
        metadata: {
          prompt: rawPrompt,
          description: `Apply ${isDark ? "Dark Luxury" : isWarm ? "Warm Editorial" : "Vibrant"} theme across page`,
        },
      };

      return {
        success: true,
        proposal: {
          id: proposalId,
          commandId,
          baseRevision,
          targetIds: Object.keys(patches),
          scope: "all",
          prompt: rawPrompt,
          description: `Apply ${isDark ? "Dark Luxury" : isWarm ? "Warm Editorial" : "Vibrant"} theme across page`,
          status: "pending",
          diffs,
          command,
        },
      };
    } else if (selectedNode) {
      // Apply theme to selected node only
      const newProps: Partial<ElementStyleProps> =
        selectedNode.kind === "button"
          ? { backgroundColor: btnBg, color: btnColor }
          : selectedNode.kind === "section"
          ? { backgroundColor: sectionBg }
          : { color: textColor };

      const command: EditCommand = {
        commandId,
        source: "ai_assistant",
        targetIds: [selectedNode.id],
        scope: "all",
        baseRevision,
        changes: {
          patches: {
            [selectedNode.id]: { styleProps: newProps },
          },
        },
        metadata: {
          prompt: rawPrompt,
          description: `Apply theme styling to ${selectedNode.name}`,
        },
      };

      return {
        success: true,
        proposal: {
          id: proposalId,
          commandId,
          baseRevision,
          targetIds: [selectedNode.id],
          scope: "all",
          prompt: rawPrompt,
          description: `Apply theme styling to ${selectedNode.name}`,
          status: "pending",
          diffs: [
            {
              elementId: selectedNode.id,
              elementName: selectedNode.name,
              beforeProps: { ...selectedNode.baseProps },
              afterProps: newProps,
            },
          ],
          command,
        },
      };
    }
  }

  // ------------------------------------------------------------
  // SCENARIO 4: Responsive Mobile Layout Adjustments (Viewport Scoped)
  // ------------------------------------------------------------
  if (
    activeViewport === "mobile" ||
    prompt.includes("mobile") ||
    prompt.includes("stack buttons") ||
    prompt.includes("full width")
  ) {
    const target = selectedNode || findNodeById(model.elements, "hero-cta") || model.elements[0];

    if (prompt.includes("stack") || prompt.includes("full width") || target.id === "hero-cta") {
      const ctaNode = findNodeById(model.elements, "hero-cta")!;
      const btn1 = findNodeById(model.elements, "hero-btn-1")!;
      const btn2 = findNodeById(model.elements, "hero-btn-2")!;

      const patches: Record<string, { styleProps: Partial<ElementStyleProps> }> = {
        "hero-cta": { styleProps: { flexDirection: "column", gap: 12, width: "100%" } },
        "hero-btn-1": { styleProps: { width: "100%" } },
        "hero-btn-2": { styleProps: { width: "100%" } },
      };

      const diffs: ProposalDiff[] = [
        {
          elementId: "hero-cta",
          elementName: ctaNode.name,
          beforeProps: { flexDirection: ctaNode.overrides.mobile?.flexDirection || "row", gap: ctaNode.overrides.mobile?.gap || 16 },
          afterProps: { flexDirection: "column", gap: 12, width: "100%" },
        },
        {
          elementId: "hero-btn-1",
          elementName: btn1.name,
          beforeProps: { width: btn1.overrides.mobile?.width || "auto" },
          afterProps: { width: "100%" },
        },
        {
          elementId: "hero-btn-2",
          elementName: btn2.name,
          beforeProps: { width: btn2.overrides.mobile?.width || "auto" },
          afterProps: { width: "100%" },
        },
      ];

      const command: EditCommand = {
        commandId,
        source: "ai_assistant",
        targetIds: ["hero-cta", "hero-btn-1", "hero-btn-2"],
        scope: "mobile", // Strict mobile viewport isolation!
        baseRevision,
        changes: { patches },
        metadata: { prompt: rawPrompt, description: "Stack CTA buttons vertically with 100% width on Mobile" },
      };

      return {
        success: true,
        proposal: {
          id: proposalId,
          commandId,
          baseRevision,
          targetIds: ["hero-cta", "hero-btn-1", "hero-btn-2"],
          scope: "mobile",
          prompt: rawPrompt,
          description: "Stack CTA buttons vertically with 100% width on Mobile",
          status: "pending",
          diffs,
          command,
        },
      };
    }

    if (target.kind === "text") {
      const newProps: Partial<ElementStyleProps> = {
        fontSize: target.id.includes("heading") ? 32 : 15,
        lineHeight: 1.25,
      };

      const command: EditCommand = {
        commandId,
        source: "ai_assistant",
        targetIds: [target.id],
        scope: "mobile",
        baseRevision,
        changes: {
          patches: {
            [target.id]: { styleProps: newProps },
          },
        },
        metadata: { prompt: rawPrompt, description: `Scale typography for Mobile viewport` },
      };

      return {
        success: true,
        proposal: {
          id: proposalId,
          commandId,
          baseRevision,
          targetIds: [target.id],
          scope: "mobile",
          prompt: rawPrompt,
          description: `Scale typography for Mobile viewport`,
          status: "pending",
          diffs: [
            {
              elementId: target.id,
              elementName: target.name,
              beforeProps: { fontSize: target.overrides.mobile?.fontSize || target.baseProps.fontSize },
              afterProps: newProps,
            },
          ],
          command,
        },
      };
    }
  }

  // ------------------------------------------------------------
  // SCENARIO 2: Visual Hierarchy & Typography Scaling
  // ------------------------------------------------------------
  if (
    prompt.includes("hierarchy") ||
    prompt.includes("bolder") ||
    prompt.includes("larger") ||
    prompt.includes("minimal") ||
    prompt.includes("refined")
  ) {
    if (!selectedNode) {
      return {
        success: false,
        error: {
          code: "INVALID_SCOPE_SELECTION",
          message: "Please select an element to adjust typography hierarchy.",
        },
      };
    }

    const isBolder = prompt.includes("bolder") || prompt.includes("hierarchy") || prompt.includes("larger");
    const newProps: Partial<ElementStyleProps> = isBolder
      ? { fontSize: 64, fontWeight: 800, letterSpacing: -1, lineHeight: 1.1 }
      : { fontSize: 48, fontWeight: 600, letterSpacing: 0.5, lineHeight: 1.25 };

    const command: EditCommand = {
      commandId,
      source: "ai_assistant",
      targetIds: [selectedNode.id],
      scope: "all",
      baseRevision,
      changes: {
        patches: {
          [selectedNode.id]: { styleProps: newProps },
        },
      },
      metadata: {
        prompt: rawPrompt,
        description: isBolder ? "Increase visual hierarchy and weight" : "Apply minimal, refined typography",
      },
    };

    return {
      success: true,
      proposal: {
        id: proposalId,
        commandId,
        baseRevision,
        targetIds: [selectedNode.id],
        scope: "all",
        prompt: rawPrompt,
        description: isBolder ? "Increase visual hierarchy and weight" : "Apply minimal, refined typography",
        status: "pending",
        diffs: [
          {
            elementId: selectedNode.id,
            elementName: selectedNode.name,
            beforeProps: {
              fontSize: selectedNode.baseProps.fontSize,
              fontWeight: selectedNode.baseProps.fontWeight,
            },
            afterProps: newProps,
          },
        ],
        command,
      },
    };
  }

  // ------------------------------------------------------------
  // SCENARIO 1: Copywriting & Tone Transformation
  // ------------------------------------------------------------
  if (
    prompt.includes("punchier") ||
    prompt.includes("concise") ||
    prompt.includes("enterprise") ||
    prompt.includes("corporate") ||
    prompt.includes("creative") ||
    prompt.includes("copy") ||
    prompt.includes("text") ||
    prompt.includes("headline")
  ) {
    if (!selectedNode) {
      return {
        success: false,
        error: {
          code: "INVALID_SCOPE_SELECTION",
          message: "Please select a text element to apply copywriting transformation.",
        },
      };
    }

    const isEnterprise = prompt.includes("enterprise") || prompt.includes("corporate") || prompt.includes("b2b");
    const isCreative = prompt.includes("creative") || prompt.includes("minimal") || prompt.includes("craft");

    let afterContent = "Digital products built to lead.";

    if (selectedNode.id.includes("heading")) {
      afterContent = isEnterprise
        ? "Enterprise-grade digital experience engineering."
        : isCreative
        ? "Form. Function. Digital craft."
        : "Digital products built to lead.";
    } else if (selectedNode.id.includes("desc")) {
      afterContent = isEnterprise
        ? "Partnering with global organizations to design scalable digital systems and platforms."
        : isCreative
        ? "An independent design and development studio shaping modern digital products."
        : "We design and ship high-impact digital experiences for ambitious brands.";
    } else if (selectedNode.kind === "button") {
      afterContent = isEnterprise ? "Request Enterprise Demo" : "Get Started";
    }

    const command: EditCommand = {
      commandId,
      source: "ai_assistant",
      targetIds: [selectedNode.id],
      scope: "all", // Content changes strictly require scope: "all"
      baseRevision,
      changes: {
        patches: {
          [selectedNode.id]: { content: afterContent },
        },
      },
      metadata: {
        prompt: rawPrompt,
        description: `Rewrite ${selectedNode.name} (${isEnterprise ? "Enterprise Tone" : isCreative ? "Minimal Tone" : "Punchy Tone"})`,
      },
    };

    return {
      success: true,
      proposal: {
        id: proposalId,
        commandId,
        baseRevision,
        targetIds: [selectedNode.id],
        scope: "all",
        prompt: rawPrompt,
        description: `Rewrite ${selectedNode.name} (${isEnterprise ? "Enterprise Tone" : isCreative ? "Minimal Tone" : "Punchy Tone"})`,
        status: "pending",
        diffs: [
          {
            elementId: selectedNode.id,
            elementName: selectedNode.name,
            beforeContent: selectedNode.content || "",
            afterContent,
          },
        ],
        command,
      },
    };
  }

  // Fallback: Generic punchy update if recognized element
  if (selectedNode && selectedNode.content) {
    const afterContent = "Designed for measurable impact.";
    const command: EditCommand = {
      commandId,
      source: "ai_assistant",
      targetIds: [selectedNode.id],
      scope: "all",
      baseRevision,
      changes: {
        patches: {
          [selectedNode.id]: { content: afterContent },
        },
      },
      metadata: { prompt: rawPrompt, description: `Refine copy on ${selectedNode.name}` },
    };

    return {
      success: true,
      proposal: {
        id: proposalId,
        commandId,
        baseRevision,
        targetIds: [selectedNode.id],
        scope: "all",
        prompt: rawPrompt,
        description: `Refine copy on ${selectedNode.name}`,
        status: "pending",
        diffs: [
          {
            elementId: selectedNode.id,
            elementName: selectedNode.name,
            beforeContent: selectedNode.content,
            afterContent,
          },
        ],
        command,
      },
    };
  }

  return {
    success: false,
    error: {
      code: "NO_CHANGES",
      message: `Could not determine a deterministic transformation for prompt "${rawPrompt}". Try a quick action chip.`,
    },
  };
}
