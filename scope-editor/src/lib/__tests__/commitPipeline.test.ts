import { beforeEach, describe, expect, it } from "vitest";
import { initialTemplateModel } from "../templateData";
import { executeCommit } from "../commitPipeline";
import { findNodeById } from "../treeUtils";
import { validateTemplateModel } from "../validation";
import type { TemplateModel, EditCommand } from "../types";

const copy = <T,>(v:T):T => structuredClone(v);
const patch = (model: TemplateModel, id: string, scope: EditCommand["scope"], styleProps: any): EditCommand => ({ commandId:`test-${model.revision}-${id}`, source:"inspector", targetIds:[id], scope, baseRevision:model.revision, changes:{patches:{[id]:{styleProps}}} });

describe("Phase 0/1 hardened commit pipeline", () => {
  let model: TemplateModel;
  beforeEach(() => { model=copy(initialTemplateModel); });
  it("accepts canonical model and keeps it JSON roundtrippable",()=>{ expect(validateTemplateModel(model)).toBeNull(); expect(JSON.parse(JSON.stringify(model))).toEqual(model); });
  it("updates base style and creates one revision entry",()=>{ const res=executeCommit(model,patch(model,"hero-heading","all",{fontSize:64})); expect(res.success).toBe(true); if(!res.success)return; expect(res.model.revision).toBe(model.revision+1); expect(findNodeById(res.model.elements,"hero-heading")?.baseProps.fontSize).toBe(64); expect(res.historyEntries).toHaveLength(1); });
  it("isolates mobile override",()=>{ const before=copy(model); const res=executeCommit(model,patch(model,"hero-heading","mobile",{fontSize:30})); expect(res.success).toBe(true); if(!res.success)return; const n=findNodeById(res.model.elements,"hero-heading")!; expect(n.overrides.mobile?.fontSize).toBe(30); expect(n.baseProps.fontSize).toBe(findNodeById(before.elements,"hero-heading")?.baseProps.fontSize); expect(n.overrides.tablet?.fontSize).not.toBe(30); });
  it("rejects desktop override scope",()=>{ const cmd=patch(model,"hero-heading","desktop",{fontSize:30}); const res=executeCommit(model,cmd); expect(res.success).toBe(false); });
  it("rejects stale revisions without mutation",()=>{ const before=copy(model); const cmd=patch({...model,revision:model.revision+1},"hero-heading","all",{fontSize:64}); cmd.baseRevision=model.revision+1; const res=executeCommit(model,cmd); expect(res.success).toBe(false); expect(model).toEqual(before); });
  it("rejects duplicate targets and unknown targets",()=>{ const duplicate={...patch(model,"hero-heading","all",{fontSize:64}),targetIds:["hero-heading","hero-heading"]}; expect(executeCommit(model,duplicate).success).toBe(false); const unknown={...patch(model,"hero-heading","all",{fontSize:64}),targetIds:["hero-heading","ghost"]}; expect(executeCommit(model,unknown).success).toBe(false); });
  it("rejects empty changes",()=>{ const cmd:EditCommand={commandId:"empty",source:"canvas",targetIds:["hero-heading"],scope:"all",baseRevision:model.revision,changes:{}}; expect(executeCommit(model,cmd).success).toBe(false); });
  it("rejects viewport content and reorder",()=>{ const content:EditCommand={commandId:"content",source:"canvas",targetIds:["hero-heading"],scope:"mobile",baseRevision:model.revision,changes:{patches:{"hero-heading":{content:"x"}}}}; expect(executeCommit(model,content).success).toBe(false); const reorder:EditCommand={commandId:"reorder",source:"canvas",targetIds:[model.templateId],scope:"mobile",baseRevision:model.revision,changes:{reorder:{parentId:model.templateId,sourceIndex:1,targetIndex:2}}}; expect(executeCommit(model,reorder).success).toBe(false); });
  it("is atomic for multi-target invalid command",()=>{ const before=copy(model); const cmd={...patch(model,"hero-heading","all",{fontSize:64}),targetIds:["hero-heading","missing"],changes:{patches:{"hero-heading":{styleProps:{fontSize:64}},missing:{styleProps:{fontSize:64}}}}}; expect(executeCommit(model,cmd).success).toBe(false); expect(model).toEqual(before); });
  it("supports exact structural restore orders",()=>{ const siblings=model.elements.map((n)=>n.id); const reordered=[siblings[0],siblings[2],siblings[1],...siblings.slice(3)]; const cmd:EditCommand={commandId:"reorder",source:"canvas",targetIds:[model.templateId],scope:"all",baseRevision:model.revision,changes:{reorder:{parentId:model.templateId,order:reordered}}}; const res=executeCommit(model,cmd); expect(res.success).toBe(true); if(!res.success)return; expect(res.model.elements.map(n=>n.id)).toEqual(reordered); });
});
