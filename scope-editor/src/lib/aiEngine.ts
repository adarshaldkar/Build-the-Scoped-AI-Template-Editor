import type { ElementNode, ElementStyleProps, EditCommand, Proposal, ProposalDiff, Scope, TemplateModel, ValidationError, Viewport } from "./types";
import { getAllNodes } from "./treeUtils";
import { validatePropertyApplicability } from "./validation";

export type AiTargetMode = "selected" | "full";

const QUICK_CHIPS = {
  text: ["Make it punchier", "Make it concise", "Enterprise B2B", "Minimal Studio"],
  heading: ["Make it punchier", "Bolder hierarchy", "Enterprise B2B", "Minimal Studio"],
  button: ["Stronger CTA", "Rounded button", "Accent color"],
  layout: ["Center align content", "Stack buttons vertically", "Compact spacing"],
  full: ["Dark luxury theme", "Warm editorial theme", "Polish all buttons", "Move services above about"],
} as const;

export function getContextualQuickChips(selectedNode: ElementNode | null, targetMode: AiTargetMode, activeViewport: Viewport): string[] {
  if (targetMode === "full") return activeViewport === "mobile" ? ["Optimize for mobile", "Stack all buttons", "Dark luxury theme", "Compact spacing"] : [...QUICK_CHIPS.full];
  if (!selectedNode) return [];
  if (activeViewport === "mobile" && selectedNode.kind === "text") return ["Optimize for mobile", "Scale for mobile", "Align center"];
  if (selectedNode.kind === "text") return /heading/i.test(selectedNode.name) ? [...QUICK_CHIPS.heading] : [...QUICK_CHIPS.text];
  if (selectedNode.kind === "button") return [...QUICK_CHIPS.button];
  if (["section", "container", "card"].includes(selectedNode.kind)) return [...QUICK_CHIPS.layout];
  return [];
}

export function isProposalStale(proposal: Proposal, currentModel: TemplateModel): boolean {
  return proposal.baseRevision !== currentModel.revision;
}

function fail(code: ValidationError["code"], message: string): { success: false; error: ValidationError } {
  return { success: false, error: { code, message } };
}

function makeStableId(prefix: string, model: TemplateModel, ids: string[], prompt: string) {
  return `${prefix}-${model.revision}-${ids.slice().sort().join("_")}-${prompt.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 36)}`;
}

function makeDiff(node: ElementNode, scope: Scope, afterProps?: Partial<ElementStyleProps>, afterContent?: string): ProposalDiff {
  return {
    elementId: node.id,
    elementName: node.name,
    beforeContent: afterContent !== undefined ? node.content ?? "" : undefined,
    afterContent,
    beforeProps: afterProps ? (scope === "all" ? { ...node.baseProps } : { ...(node.overrides[scope as Viewport] ?? {}) }) : undefined,
    afterProps,
  };
}

function proposal(
  model: TemplateModel,
  prompt: string,
  targetIds: string[],
  scope: Scope,
  description: string,
  diffs: ProposalDiff[],
  patches: Record<string, { content?: string; styleProps?: Partial<ElementStyleProps> }> = {},
  reorder?: EditCommand["changes"]["reorder"]
): Proposal {
  const commandId = makeStableId("ai-command", model, targetIds, prompt);
  const id = makeStableId("ai-proposal", model, targetIds, prompt);
  const command: EditCommand = {
    commandId,
    source: "ai_assistant",
    targetIds,
    scope,
    baseRevision: model.revision,
    changes: { patches, reorder },
    metadata: { prompt, description },
  };
  return { id, commandId, baseRevision: model.revision, targetIds, scope, prompt, description, status: "pending", stale: false, diffs, command };
}

const COLOR_MAP: Record<string, string> = {
  black: "#09090B",
  dark: "#18181B",
  white: "#FFFFFF",
  light: "#FFFFFF",
  zinc: "#3F3F46",
  gray: "#71717A",
  grey: "#71717A",
  blue: "#2563EB",
  accent: "#2563EB",
  emerald: "#059669",
  green: "#059669",
  red: "#DC2626",
  purple: "#9333EA",
  amber: "#D97706",
  cream: "#FAF9F6",
  surface: "#F4F4F5",
};

export function generateAiProposal(
  model: TemplateModel,
  rawPrompt: string,
  selectedNodes: ElementNode[],
  targetMode: AiTargetMode,
  activeViewport: Viewport
): { success: true; proposal: Proposal } | { success: false; error: ValidationError } {
  const prompt = rawPrompt.trim().toLowerCase();
  if (!prompt) return fail("NO_CHANGES", "Describe an edit before generating a proposal.");
  if (targetMode === "selected" && selectedNodes.length === 0) {
    return fail("NO_SELECTION", "Select at least one element before requesting an AI edit in Selected mode, or switch to Full Template mode.");
  }

  const allNodes = getAllNodes(model.elements);
  const scope: Scope = activeViewport === "desktop" ? "all" : activeViewport;

  // 1. Structural reorder
  if (/services above about|move services|reorder services/.test(prompt)) {
    if (targetMode !== "full") return fail("INVALID_SCOPE_SELECTION", "Structural reordering requires Full Template target mode.");
    const services = model.elements.find((n) => n.kind === "section" && /services/i.test(n.name));
    const about = model.elements.find((n) => n.kind === "section" && /about/i.test(n.name));
    if (!services || !about) return fail("TARGET_NOT_FOUND", "The requested sections are not present in the template.");
    const sourceIndex = model.elements.findIndex((n) => n.id === services.id);
    const targetIndex = model.elements.findIndex((n) => n.id === about.id);
    if (sourceIndex === -1 || targetIndex === -1) return fail("TARGET_NOT_FOUND", "The requested sections are not present in the template.");
    if (sourceIndex === targetIndex) return fail("NO_CHANGES", "Cannot move section to the same position.");
    const after = [...model.elements];
    const [moved] = after.splice(sourceIndex, 1);
    after.splice(targetIndex, 0, moved);
    const diff: ProposalDiff = {
      elementId: model.templateId,
      elementName: "Page Sections",
      beforeContent: model.elements.map((n) => n.name).join(" → "),
      afterContent: after.map((n) => n.name).join(" → "),
    };
    return {
      success: true,
      proposal: proposal(
        model,
        rawPrompt,
        [model.templateId],
        "all",
        `Move ${services.name} above ${about.name}`,
        [diff],
        {},
        { parentId: model.templateId, sourceIndex, targetIndex }
      ),
    };
  }

  // 2. Mobile stack buttons scenario
  if (/stack .*buttons|full width|optimize .*mobile/.test(prompt)) {
    if (activeViewport !== "mobile") return fail("INVALID_SCOPE_SELECTION", "Switch to Mobile viewport before generating a mobile-only layout proposal.");
    const containerTargets = (targetMode === "selected" ? selectedNodes : allNodes).filter((n) => ["container", "section", "card"].includes(n.kind));
    const buttonTargets = (targetMode === "selected" ? selectedNodes : allNodes).filter((n) => n.kind === "button");
    const chosen = targetMode === "selected" ? (containerTargets.length ? containerTargets : buttonTargets) : allNodes.filter((n) => n.kind === "container" && /cta|button/i.test(n.name));
    if (!chosen.length) return fail("NO_SELECTION", "Select the CTA group or buttons for mobile optimization.");
    const patches: Record<string, { styleProps: Partial<ElementStyleProps> }> = {};
    const diffs: ProposalDiff[] = [];
    for (const node of chosen) {
      const style: Partial<ElementStyleProps> = node.kind === "button" ? { width: "100%" } : { flexDirection: "column", gap: 12, width: "100%" };
      if (validatePropertyApplicability(node.kind, style)) continue;
      patches[node.id] = { styleProps: style };
      diffs.push(makeDiff(node, "mobile", style));
    }
    return diffs.length
      ? { success: true, proposal: proposal(model, rawPrompt, chosen.map((n) => n.id), "mobile", "Optimize selected layout for Mobile", diffs, patches) }
      : fail("INCOMPATIBLE_PROPERTY_FOR_ELEMENT", "No selected elements support mobile optimization.");
  }

  // 3. Preset Theme keywords
  if (/dark luxury|dark theme|warm editorial|vibrant studio/.test(prompt)) {
    const dark = /dark/.test(prompt);
    const warm = /warm/.test(prompt);
    const nodes = targetMode === "selected" ? selectedNodes : allNodes.filter((n) => ["section", "container", "card", "button", "text", "link"].includes(n.kind));
    const patches: Record<string, { styleProps: Partial<ElementStyleProps> }> = {};
    const diffs: ProposalDiff[] = [];
    for (const node of nodes) {
      const style: Partial<ElementStyleProps> = {};
      if (["section", "container", "card"].includes(node.kind)) {
        style.backgroundColor = dark ? "#09090B" : warm ? "#FAF9F6" : "#FFFFFF";
      } else if (node.kind === "button") {
        style.backgroundColor = dark ? "#FAFAFA" : warm ? "#18181B" : "#3D5AFE";
        style.color = dark ? "#09090B" : "#FFFFFF";
      } else if (["text", "link"].includes(node.kind)) {
        style.color = dark ? "#F4F4F5" : "#18181B";
      }
      if (Object.keys(style).length && !validatePropertyApplicability(node.kind, style)) {
        patches[node.id] = { styleProps: style };
        diffs.push(makeDiff(node, "all", style));
      }
    }
    return diffs.length
      ? { success: true, proposal: proposal(model, rawPrompt, diffs.map((d) => d.elementId), "all", `Apply ${dark ? "dark luxury" : warm ? "warm editorial" : "vibrant studio"} visual direction`, diffs, patches) }
      : fail("INCOMPATIBLE_PROPERTY_FOR_ELEMENT", "No targets support the requested theme.");
  }

  // 4. Polish all buttons
  if (/polish all|all buttons|polish buttons|cta buttons/.test(prompt)) {
    const buttonTargets = targetMode === "selected" ? selectedNodes.filter((n) => n.kind === "button") : allNodes.filter((n) => n.kind === "button");
    if (!buttonTargets.length) return fail("INVALID_SCOPE_SELECTION", "Select at least one button for this transformation.");
    const patches: Record<string, { styleProps: Partial<ElementStyleProps> }> = {};
    const diffs: ProposalDiff[] = [];
    for (const node of buttonTargets) {
      const style: Partial<ElementStyleProps> = { borderRadius: 8, fontWeight: 600, paddingTop: 12, paddingBottom: 12 };
      if (validatePropertyApplicability(node.kind, style)) continue;
      patches[node.id] = { styleProps: style };
      diffs.push(makeDiff(node, "all", style));
    }
    return diffs.length
      ? { success: true, proposal: proposal(model, rawPrompt, buttonTargets.map((n) => n.id), "all", "Polish selected buttons with consistent hierarchy", diffs, patches) }
      : fail("INCOMPATIBLE_PROPERTY_FOR_ELEMENT", "No selected buttons support the requested style.");
  }

  // 5. Copy tone presets
  if (/punchier|concise|enterprise|corporate|creative|headline|copy/.test(prompt) && !/background|color|size|weight|padding/.test(prompt)) {
    const textTargets = (targetMode === "selected" ? selectedNodes : allNodes).filter((n) => ["text", "button", "link"].includes(n.kind));
    if (!textTargets.length) return fail("INVALID_SCOPE_SELECTION", "Select text, button, or link elements for copy edits.");
    const enterprise = /enterprise|corporate|b2b/.test(prompt);
    const creative = /creative|minimal|studio|craft/.test(prompt);
    const patches: Record<string, { content: string }> = {};
    const diffs: ProposalDiff[] = [];
    for (const node of textTargets) {
      let after = node.content ?? "";
      if (node.tag === "h1" || /heading/i.test(node.name)) {
        after = enterprise ? "Enterprise-grade digital experience engineering." : creative ? "Form. Function. Digital craft." : "Digital products built to lead.";
      } else if (node.kind === "button") {
        after = enterprise ? "Request Enterprise Demo" : "Get Started";
      } else {
        after = enterprise
          ? "Partnering with global organizations to design scalable digital systems and platforms."
          : creative
          ? "An independent design and development studio shaping modern digital products."
          : "We design and ship high-impact digital experiences for ambitious brands.";
      }
      if (after !== node.content) {
        patches[node.id] = { content: after };
        diffs.push(makeDiff(node, "all", undefined, after));
      }
    }
    return diffs.length
      ? {
          success: true,
          proposal: proposal(
            model,
            rawPrompt,
            diffs.map((d) => d.elementId),
            "all",
            enterprise ? "Rewrite in an enterprise tone" : creative ? "Rewrite in a minimal studio tone" : "Rewrite with punchier copy",
            diffs,
            patches
          ),
        }
      : fail("NO_CHANGES", "The selected content already matches the proposal.");
  }

  // 6. Dynamic Semantic Parser (handles "Make hero background #18181B and text #FFFFFF", "Set font size to 60", "Change color to blue", etc.)
  let candidateNodes: ElementNode[] = targetMode === "selected" ? [...selectedNodes] : [...allNodes];

  // Identify section targeting from prompt if mentioned (e.g. "hero", "nav", "services", "about", "cta", "footer")
  const sectionKeywords = ["hero", "nav", "navigation", "service", "about", "cta", "contact", "footer", "card", "button", "heading"];
  const mentionedSections = sectionKeywords.filter((k) => prompt.includes(k));

  if (mentionedSections.length > 0 && targetMode === "full") {
    const matched = allNodes.filter((n) => {
      const lower = n.name.toLowerCase() + " " + n.id.toLowerCase() + " " + n.kind.toLowerCase();
      return mentionedSections.some((kw) => lower.includes(kw));
    });
    if (matched.length > 0) candidateNodes = matched;
  }

  // Extract style changes from prompt
  const patches: Record<string, { content?: string; styleProps?: Partial<ElementStyleProps> }> = {};
  const diffs: ProposalDiff[] = [];

  // A. Background color extraction
  let bgColor: string | null = null;
  const bgHexMatch = /(?:background(?:-color)?|bg)\s*(?:to|is|=|:)?\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8})/i.exec(prompt);
  if (bgHexMatch) bgColor = bgHexMatch[1].toUpperCase();
  else {
    for (const [name, hex] of Object.entries(COLOR_MAP)) {
      if (new RegExp(`(?:background|bg)\\s+(?:to\\s+|is\\s+)?${name}\\b`, "i").test(prompt)) {
        bgColor = hex;
        break;
      }
    }
  }

  // B. Text / Font color extraction
  let textColor: string | null = null;
  const textHexMatch = /(?:text(?:-color)?|color|font-color)\s*(?:to|is|=|:)?\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8})/i.exec(prompt);
  if (textHexMatch) textColor = textHexMatch[1].toUpperCase();
  else {
    for (const [name, hex] of Object.entries(COLOR_MAP)) {
      if (new RegExp(`(?:text|color|foreground)\\s+(?:to\\s+|is\\s+)?${name}\\b`, "i").test(prompt)) {
        textColor = hex;
        break;
      }
    }
  }

  // If general color mentioned without background keyword (e.g. "make hero #18181B")
  if (!bgColor && !textColor) {
    const genericHex = /(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8})/i.exec(prompt);
    if (genericHex) {
      textColor = genericHex[1].toUpperCase();
      bgColor = genericHex[1].toUpperCase();
    }
  }

  // C. Font Size extraction
  let fontSize: number | null = null;
  const sizeMatch = /(?:font-size|size)\s*(?:to|is|=|:)?\s*(\d+)/i.exec(prompt) || /(\d+)\s*px/i.exec(prompt);
  if (sizeMatch) {
    const num = Number(sizeMatch[1]);
    if (num >= 8 && num <= 140) fontSize = num;
  }

  // D. Font Weight extraction
  let fontWeight: 300 | 400 | 500 | 600 | 700 | 800 | null = null;
  const weightMatch = /(?:weight|font-weight)\s*(?:to|is|=|:)?\s*(\d+)/i.exec(prompt);
  if (weightMatch) {
    const num = Number(weightMatch[1]);
    if ([300, 400, 500, 600, 700, 800].includes(num)) fontWeight = num as 300 | 400 | 500 | 600 | 700 | 800;
  } else if (/bold|bolder/.test(prompt)) fontWeight = 700;
  else if (/semibold|semi-bold/.test(prompt)) fontWeight = 600;
  else if (/light|thin/.test(prompt)) fontWeight = 300;
  else if (/regular|normal/.test(prompt)) fontWeight = 400;

  // E. Text Alignment extraction
  let textAlign: "left" | "center" | "right" | "justify" | null = null;
  if (/align\s*center|center\s*align|centered/.test(prompt)) textAlign = "center";
  else if (/align\s*left|left\s*align/.test(prompt)) textAlign = "left";
  else if (/align\s*right|right\s*align/.test(prompt)) textAlign = "right";

  // F. Border Radius / Rounded extraction
  let borderRadius: number | null = null;
  const radiusMatch = /(?:radius|border-radius|rounded)\s*(?:to|is|=|:)?\s*(\d+)/i.exec(prompt);
  if (radiusMatch) borderRadius = Number(radiusMatch[1]);
  else if (/rounded|pill/.test(prompt)) borderRadius = 12;

  // G. Padding extraction
  let padding: number | null = null;
  const padMatch = /(?:padding|spacing)\s*(?:to|is|=|:)?\s*(\d+)/i.exec(prompt);
  if (padMatch) padding = Number(padMatch[1]);

  // H. Explicit string replacement (e.g., text "New Heading", rename to "Hello")
  const textQuoteMatch = /(?:text|content|rename to|title)\s*["“]([^"”]+)["”]/i.exec(rawPrompt);
  const explicitContent = textQuoteMatch ? textQuoteMatch[1] : null;

  // Apply parsed styles to candidate nodes
  for (const node of candidateNodes) {
    const style: Partial<ElementStyleProps> = {};

    // Apply Background
    if (bgColor && ["section", "container", "card", "button"].includes(node.kind)) {
      style.backgroundColor = bgColor;
    }

    // Apply Text Color
    if (textColor && ["text", "link", "button", "section", "container"].includes(node.kind)) {
      style.color = textColor;
    }

    // Apply Font Size
    if (fontSize && ["text", "button", "link"].includes(node.kind)) {
      style.fontSize = fontSize;
    }

    // Apply Font Weight
    if (fontWeight && ["text", "button", "link", "section", "container"].includes(node.kind)) {
      style.fontWeight = fontWeight;
    }

    // Apply Text Align
    if (textAlign && ["text", "button", "section", "container"].includes(node.kind)) {
      style.textAlign = textAlign;
    }

    // Apply Border Radius
    if (borderRadius !== null && ["button", "card", "container", "image"].includes(node.kind)) {
      style.borderRadius = borderRadius;
    }

    // Apply Padding
    if (padding !== null && ["section", "container", "card", "button"].includes(node.kind)) {
      style.paddingTop = padding;
      style.paddingBottom = padding;
    }

    const hasStyle = Object.keys(style).length > 0;
    const hasContent = explicitContent !== null && ["text", "button", "link"].includes(node.kind);

    if (hasStyle || hasContent) {
      patches[node.id] = {
        styleProps: hasStyle ? style : undefined,
        content: hasContent ? explicitContent : undefined,
      };
      diffs.push(makeDiff(node, scope, hasStyle ? style : undefined, hasContent ? explicitContent : undefined));
    }
  }

  if (diffs.length > 0) {
    return {
      success: true,
      proposal: proposal(
        model,
        rawPrompt,
        diffs.map((d) => d.elementId),
        scope,
        `AI: ${rawPrompt}`,
        diffs,
        patches
      ),
    };
  }

  return fail("NO_CHANGES", "Could not determine valid stylistic changes for this prompt. Try specifying colors, sizes, weights, or using quick action chips.");
}

export function buildAcceptedProposalCommand(proposalInput: Proposal, acceptedIds: string[], currentModel: TemplateModel): EditCommand | null {
  if (!acceptedIds.length) return null;
  if (proposalInput.command.changes.reorder) return acceptedIds.length === 1 ? { ...proposalInput.command, baseRevision: currentModel.revision } : null;
  const filteredPatches: Record<string, { content?: string; styleProps?: Partial<ElementStyleProps> }> = {};
  for (const id of acceptedIds) {
    if (proposalInput.command.changes.patches?.[id]) filteredPatches[id] = proposalInput.command.changes.patches[id];
  }
  if (!Object.keys(filteredPatches).length) return null;
  return {
    ...proposalInput.command,
    baseRevision: currentModel.revision,
    targetIds: Object.keys(filteredPatches),
    changes: { patches: filteredPatches },
  };
}
