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

export function isProposalStale(proposal: Proposal, currentModel: TemplateModel): boolean { return proposal.baseRevision !== currentModel.revision; }
function fail(code: ValidationError["code"], message: string): { success: false; error: ValidationError } { return { success: false, error: { code, message } }; }
function makeStableId(prefix: string, model: TemplateModel, ids: string[], prompt: string) { return `${prefix}-${model.revision}-${ids.slice().sort().join("_")}-${prompt.toLowerCase().replace(/[^a-z0-9]+/g,"-").slice(0,36)}`; }
function makeDiff(node: ElementNode, scope: Scope, afterProps?: Partial<ElementStyleProps>, afterContent?: string): ProposalDiff { return { elementId: node.id, elementName: node.name, beforeContent: afterContent !== undefined ? node.content ?? "" : undefined, afterContent, beforeProps: afterProps ? (scope === "all" ? { ...node.baseProps } : { ...(node.overrides[scope as Viewport] ?? {}) }) : undefined, afterProps }; }
function proposal(model: TemplateModel, prompt: string, targetIds: string[], scope: Scope, description: string, diffs: ProposalDiff[], patches: Record<string,{content?:string;styleProps?:Partial<ElementStyleProps>}> = {}, reorder?: EditCommand["changes"]["reorder"]): Proposal {
  const commandId = makeStableId("ai-command", model, targetIds, prompt); const id = makeStableId("ai-proposal", model, targetIds, prompt);
  const command: EditCommand = { commandId, source: "ai_assistant", targetIds, scope, baseRevision: model.revision, changes: { patches, reorder }, metadata: { prompt, description } };
  return { id, commandId, baseRevision: model.revision, targetIds, scope, prompt, description, status: "pending", stale: false, diffs, command };
}

export function generateAiProposal(model: TemplateModel, rawPrompt: string, selectedNodes: ElementNode[], targetMode: AiTargetMode, activeViewport: Viewport): { success: true; proposal: Proposal } | { success: false; error: ValidationError } {
  const prompt = rawPrompt.trim().toLowerCase();
  if (!prompt) return fail("NO_CHANGES", "Describe an edit before generating a proposal.");
  if (targetMode === "selected" && selectedNodes.length === 0) return fail("NO_SELECTION", "Select at least one element before requesting an AI edit.");
  const allNodes = getAllNodes(model.elements);
  const targets = targetMode === "selected" ? selectedNodes : allNodes;

  // Structural reorder: intentionally documented demo target, discovered by semantic section names.
  if (/services above about|move services|reorder services/.test(prompt)) {
    if (targetMode !== "full") return fail("INVALID_SCOPE_SELECTION", "Structural reordering requires Full Template target mode.");
    const services = model.elements.find((n) => n.kind === "section" && /services/i.test(n.name));
    const about = model.elements.find((n) => n.kind === "section" && /about/i.test(n.name));
    if (!services || !about) return fail("TARGET_NOT_FOUND", "The requested sections are not present in the template.");
    const sourceIndex = model.elements.findIndex((n) => n.id === services.id);
    const targetIndex = model.elements.findIndex((n) => n.id === about.id);
    if (sourceIndex === -1 || targetIndex === -1) return fail("TARGET_NOT_FOUND", "The requested sections are not present in the template.");
    if (sourceIndex === targetIndex) return fail("NO_CHANGES", "Cannot move section to the same position.");
    const after = [...model.elements]; const [moved] = after.splice(sourceIndex, 1); after.splice(targetIndex, 0, moved);
    const diff: ProposalDiff = { elementId: model.templateId, elementName: "Page Sections", beforeContent: model.elements.map((n)=>n.name).join(" → "), afterContent: after.map((n)=>n.name).join(" → ") };
    return { success: true, proposal: proposal(model, rawPrompt, [model.templateId], "all", `Move ${services.name} above ${about.name}`, [diff], {}, { parentId: model.templateId, sourceIndex, targetIndex }) };
  }

  if (/polish all|all buttons|polish buttons|cta buttons/.test(prompt)) {
    const buttonTargets = targetMode === "selected" ? targets.filter((n)=>n.kind === "button") : allNodes.filter((n)=>n.kind === "button");
    if (!buttonTargets.length) return fail("INVALID_SCOPE_SELECTION", "Select at least one button for this transformation.");
    const patches: Record<string,{styleProps:Partial<ElementStyleProps>}> = {}; const diffs: ProposalDiff[] = [];
    for (const node of buttonTargets) { const style: Partial<ElementStyleProps> = { borderRadius: 8, fontWeight: 600, paddingTop: 12, paddingBottom: 12 }; if (validatePropertyApplicability(node.kind,style)) continue; patches[node.id]={styleProps:style}; diffs.push(makeDiff(node,"all",style)); }
    return diffs.length ? { success:true, proposal:proposal(model,rawPrompt,buttonTargets.map(n=>n.id),"all","Polish selected buttons with consistent hierarchy",diffs,patches) } : fail("INCOMPATIBLE_PROPERTY_FOR_ELEMENT","No selected buttons support the requested style.");
  }

  if (/stack .*buttons|full width|optimize .*mobile/.test(prompt)) {
    if (activeViewport !== "mobile") return fail("INVALID_SCOPE_SELECTION", "Switch to Mobile before generating a mobile-only layout proposal.");
    const containerTargets = targets.filter((n)=>["container","section","card"].includes(n.kind));
    const buttonTargets = targets.filter((n)=>n.kind === "button");
    const chosen = targetMode === "selected" ? (containerTargets.length ? containerTargets : buttonTargets) : allNodes.filter((n)=>n.kind === "container" && /cta|button/i.test(n.name));
    if (!chosen.length) return fail("NO_SELECTION", "Select the CTA group or buttons for mobile optimization.");
    const patches: Record<string,{styleProps:Partial<ElementStyleProps>}> = {}; const diffs: ProposalDiff[]=[];
    for (const node of chosen) { const style: Partial<ElementStyleProps> = node.kind === "button" ? {width:"100%"} : {flexDirection:"column",gap:12,width:"100%"}; if (validatePropertyApplicability(node.kind,style)) continue; patches[node.id]={styleProps:style}; diffs.push(makeDiff(node,"mobile",style)); }
    return diffs.length ? {success:true,proposal:proposal(model,rawPrompt,chosen.map(n=>n.id),"mobile","Optimize selected layout for Mobile",diffs,patches)} : fail("INCOMPATIBLE_PROPERTY_FOR_ELEMENT","No selected elements support mobile optimization.");
  }

  if (/dark luxury|dark theme|warm editorial|vibrant studio/.test(prompt)) {
    const dark=/dark/.test(prompt); const warm=/warm/.test(prompt); const nodes = targetMode === "selected" ? targets : allNodes.filter((n)=>["section","container","card","button","text","link"].includes(n.kind));
    const patches: Record<string,{styleProps:Partial<ElementStyleProps>}>={}; const diffs: ProposalDiff[]=[];
    for (const node of nodes) { let style:Partial<ElementStyleProps>={}; if (["section","container","card"].includes(node.kind)) style.backgroundColor=dark?"#09090B":warm?"#FAF9F6":"#FFFFFF"; else if(node.kind==="button"){style.backgroundColor=dark?"#FAFAFA":warm?"#18181B":"#3D5AFE";style.color=dark?"#09090B":"#FFFFFF";} else if(["text","link"].includes(node.kind)) style.color=dark?"#F4F4F5":"#18181B"; if(Object.keys(style).length && !validatePropertyApplicability(node.kind,style)){patches[node.id]={styleProps:style};diffs.push(makeDiff(node,"all",style));}}
    return diffs.length ? {success:true,proposal:proposal(model,rawPrompt,diffs.map(d=>d.elementId),"all",`Apply ${dark?"dark luxury":warm?"warm editorial":"vibrant studio"} visual direction`,diffs,patches)} : fail("INCOMPATIBLE_PROPERTY_FOR_ELEMENT","No targets support the requested theme.");
  }

  if (/bolder|hierarchy|larger|minimal|refined/.test(prompt)) {
    const textTargets = targets.filter((n)=>n.kind === "text"); if(!textTargets.length) return fail("INVALID_SCOPE_SELECTION","Select text elements for a typography proposal.");
    const bold=/bolder|hierarchy|larger/.test(prompt); const patches: Record<string,{styleProps:Partial<ElementStyleProps>}>={}; const diffs:ProposalDiff[]=[];
    for(const node of textTargets){const style:Partial<ElementStyleProps>=bold?{fontSize:node.tag==="h1"?64:24,fontWeight:800,letterSpacing:-1,lineHeight:1.1}:{fontSize:48,fontWeight:600,letterSpacing:0.5,lineHeight:1.2}; patches[node.id]={styleProps:style};diffs.push(makeDiff(node,"all",style));}
    return {success:true,proposal:proposal(model,rawPrompt,textTargets.map(n=>n.id),"all",bold?"Increase visual hierarchy":"Apply minimal refined typography",diffs,patches)};
  }

  if (/punchier|concise|enterprise|corporate|creative|headline|copy/.test(prompt)) {
    const textTargets=targets.filter(n=>["text","button","link"].includes(n.kind)); if(!textTargets.length) return fail("INVALID_SCOPE_SELECTION","Select text, button, or link elements for copy edits.");
    const enterprise=/enterprise|corporate|b2b/.test(prompt); const creative=/creative|minimal|studio|craft/.test(prompt); const patches: Record<string,{content:string}>={}; const diffs:ProposalDiff[]=[];
    for(const node of textTargets){let after=node.content??""; if(node.tag==="h1"||/heading/i.test(node.name)) after=enterprise?"Enterprise-grade digital experience engineering.":creative?"Form. Function. Digital craft.":"Digital products built to lead."; else if(node.kind==="button") after=enterprise?"Request Enterprise Demo":"Get Started"; else after=enterprise?"Partnering with global organizations to design scalable digital systems and platforms.":creative?"An independent design and development studio shaping modern digital products.":"We design and ship high-impact digital experiences for ambitious brands."; if(after!==node.content){patches[node.id]={content:after};diffs.push(makeDiff(node,"all",undefined,after));}}
    return diffs.length ? {success:true,proposal:proposal(model,rawPrompt,diffs.map(d=>d.elementId),"all",enterprise?"Rewrite in an enterprise tone":creative?"Rewrite in a minimal studio tone":"Rewrite with punchier copy",diffs,patches)} : fail("NO_CHANGES","The selected content already matches the deterministic proposal.");
  }

  return fail("NO_CHANGES", "No documented deterministic scenario matched this instruction. Use a quick action.");
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
