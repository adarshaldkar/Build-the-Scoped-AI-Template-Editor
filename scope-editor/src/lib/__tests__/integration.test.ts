import { describe, expect, it } from "vitest";
import { initialTemplateModel } from "../templateData";
import { executeCommit } from "../commitPipeline";
import { findNodeById } from "../treeUtils";
import { generateAiProposal, buildAcceptedProposalCommand } from "../aiEngine";
import { reconcileMarkupToCommand, templateToMarkup } from "../codeReconciler";
import { createForwardRestoreCommand } from "../historyManager";
import { loadStoredState, saveStoredState } from "../storage";
import type { RevisionEntry } from "../types";

describe("Integrated model workflow",()=>{
 it("keeps Inspector, Code, AI, History and persistence on the same model",()=>{
  let model=structuredClone(initialTemplateModel); let history: RevisionEntry[]=[];
  const insp=executeCommit(model,{commandId:"i",source:"inspector",targetIds:["hero-heading"],scope:"all",baseRevision:model.revision,changes:{patches:{"hero-heading":{styleProps:{fontSize:64}}}}}); expect(insp.success).toBe(true); if(!insp.success)return; model=insp.model;history.push(...insp.historyEntries);
  const heading=findNodeById(model.elements,"hero-heading")!; const code=templateToMarkup(heading,"selected").replace("Designing digital experiences that move businesses forward.","Build with intent."); const rc=reconcileMarkupToCommand(model,code,model.revision,"selected",heading.id);expect(rc.success).toBe(true);if(!rc.success)return;const cr=executeCommit(model,rc.command);expect(cr.success).toBe(true);if(!cr.success)return;model=cr.model;history.push(...cr.historyEntries);
  const ai=generateAiProposal(model,"make it punchier",[findNodeById(model.elements,"hero-heading")!],"selected","desktop");expect(ai.success).toBe(true);if(!ai.success)return;const accepted=buildAcceptedProposalCommand(ai.proposal,[ai.proposal.targetIds[0]],model)!;const ar=executeCommit(model,accepted);expect(ar.success).toBe(true);if(!ar.success)return;model=ar.model;history.push(...ar.historyEntries);
  const restore=createForwardRestoreCommand(history[0],model);const rr=executeCommit(model,restore);expect(rr.success).toBe(true);if(!rr.success)return;model=rr.model;history.push(...rr.historyEntries);
  saveStoredState(model,history);const loaded=loadStoredState();expect(loaded.model.revision).toBe(model.revision);expect(loaded.history.length).toBe(history.length);expect(findNodeById(loaded.model.elements,"hero-heading")?.content).toBe(findNodeById(model.elements,"hero-heading")?.content);
 });
});
