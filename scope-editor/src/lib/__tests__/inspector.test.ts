import { describe, expect, it } from "vitest";
import { initialTemplateModel } from "../templateData";
import { executeCommit } from "../commitPipeline";
import { findNodeById } from "../treeUtils";
describe("Phase 5 inspector invariants",()=>{
 it("routes desktop to base",()=>{const m=structuredClone(initialTemplateModel);const r=executeCommit(m,{commandId:"d",source:"inspector",targetIds:["hero-heading"],scope:"all",baseRevision:m.revision,changes:{patches:{"hero-heading":{styleProps:{fontSize:60}}}}});expect(r.success).toBe(true);if(r.success)expect(findNodeById(r.model.elements,"hero-heading")?.baseProps.fontSize).toBe(60);});
 it("routes mobile to mobile override",()=>{const m=structuredClone(initialTemplateModel);const r=executeCommit(m,{commandId:"m",source:"inspector",targetIds:["hero-heading"],scope:"mobile",baseRevision:m.revision,changes:{patches:{"hero-heading":{styleProps:{fontSize:30}}}}});expect(r.success).toBe(true);if(r.success){const n=findNodeById(r.model.elements,"hero-heading")!;expect(n.overrides.mobile?.fontSize).toBe(30);expect(n.baseProps.fontSize).toBe(56);}});
 it("clears one override property",()=>{const m=structuredClone(initialTemplateModel);const r=executeCommit(m,{commandId:"m",source:"inspector",targetIds:["hero-heading"],scope:"mobile",baseRevision:m.revision,changes:{patches:{"hero-heading":{styleProps:{fontSize:undefined}}}}});expect(r.success).toBe(true);if(r.success){const n=findNodeById(r.model.elements,"hero-heading")!;expect(n.overrides.mobile?.fontSize).toBeUndefined();expect(n.overrides.mobile?.lineHeight).toBe(1.15);}});
});
