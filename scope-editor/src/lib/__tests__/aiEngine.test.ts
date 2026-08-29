import { describe, expect, it } from "vitest";
import { generateAiProposal, buildAcceptedProposalCommand } from "../aiEngine";
import { initialTemplateModel } from "../templateData";
import { findNodeById } from "../treeUtils";
const model=structuredClone(initialTemplateModel);
describe("Phase 3 deterministic AI",()=>{
  it("requires selection in selected mode",()=>expect(generateAiProposal(model,"make it punchier",[],"selected","desktop").success).toBe(false));
  it("creates a deterministic copy proposal",()=>{const n=findNodeById(model.elements,"hero-heading")!;const a=generateAiProposal(model,"make it punchier",[n],"selected","desktop");const b=generateAiProposal(model,"make it punchier",[n],"selected","desktop");expect(a.success&&b.success).toBe(true);if(a.success&&b.success)expect(a.proposal.command.changes.patches).toEqual(b.proposal.command.changes.patches);});
  it("creates mobile-only layout proposals",()=>{const n=findNodeById(model.elements,"hero-cta")!;const r=generateAiProposal(model,"stack buttons",[n],"selected","mobile");expect(r.success).toBe(true);if(r.success)expect(r.proposal.scope).toBe("mobile");});
  it("rejects mobile scenario outside mobile viewport",()=>{const n=findNodeById(model.elements,"hero-cta")!;expect(generateAiProposal(model,"stack buttons",[n],"selected","desktop").success).toBe(false);});
  it("targets all template buttons without hardcoded IDs",()=>{const r=generateAiProposal(model,"polish all buttons",[],"full","desktop");expect(r.success).toBe(true);if(r.success)expect(r.proposal.targetIds.length).toBeGreaterThan(0);});
  it("requires full mode for structural reorder",()=>{expect(generateAiProposal(model,"move services above about",[],"full","desktop").success).toBe(true);const n=findNodeById(model.elements,"services")!;expect(generateAiProposal(model,"move services above about",[n],"selected","desktop").success).toBe(false);});
  it("allows independent proposal decisions",()=>{const buttons=model.elements.flatMap((s)=>s.children??[]).filter((n)=>n.kind==="button");const r=generateAiProposal(model,"polish all buttons",buttons.slice(0,1),"selected","desktop");expect(r.success).toBe(true);if(r.success){const cmd=buildAcceptedProposalCommand(r.proposal,[r.proposal.targetIds[0]],model);expect(cmd?.targetIds).toEqual([r.proposal.targetIds[0]]);}});
});
