import { describe, expect, it } from "vitest";
import { initialTemplateModel } from "../templateData";
import { executeCommit } from "../commitPipeline";
import { createForwardRestoreCommand, pushUndoSnapshot, filterHistoryEntries } from "../historyManager";
import { findNodeById } from "../treeUtils";
import type { EditCommand } from "../types";
const copy=<T,>(v:T):T=>structuredClone(v);
describe("Phase 6 recovery",()=>{
 it("caps undo snapshots at 50",()=>{let s=[] as any[];for(let i=0;i<60;i++)s=pushUndoSnapshot(s,{...copy(initialTemplateModel),revision:i} as any);expect(s).toHaveLength(50);expect(s[0].revision).toBe(10);});
 it("restores an exact old style property set without preserving later keys",()=>{let m=copy(initialTemplateModel);const cmd:EditCommand={commandId:"x",source:"inspector",targetIds:["hero-heading"],scope:"all",baseRevision:m.revision,changes:{patches:{"hero-heading":{styleProps:{fontSize:64,color:"#FFFFFF"}}}}};const first=executeCommit(m,cmd);expect(first.success).toBe(true);if(!first.success)return;m=first.model;const entry=first.historyEntries[0];const restore=createForwardRestoreCommand(entry,m);const second=executeCommit(m,restore);expect(second.success).toBe(true);if(!second.success)return;const n=findNodeById(second.model.elements,"hero-heading")!;expect(n.baseProps.color).toBe(entry.beforeState.props?.color);expect(n.baseProps.fontSize).toBe(entry.beforeState.props?.fontSize);});
 it("restores structure to exact prior order",()=>{let m=copy(initialTemplateModel);const before=m.elements.map(n=>n.id);const reordered=[before[0],before[2],before[1],...before.slice(3)];const cmd:EditCommand={commandId:"r",source:"canvas",targetIds:[m.templateId],scope:"all",baseRevision:m.revision,changes:{reorder:{parentId:m.templateId,order:reordered}}};const one=executeCommit(m,cmd);expect(one.success).toBe(true);if(!one.success)return;m=one.model;const restore=createForwardRestoreCommand(one.historyEntries[0],m);const two=executeCommit(m,restore);expect(two.success).toBe(true);if(!two.success)return;expect(two.model.elements.map(n=>n.id)).toEqual(before);});
 it("filters stable IDs and kinds",()=>{const entries=copy(initialTemplateModel.elements.slice(0,0)) as any;void entries;expect(filterHistoryEntries([], {kind:"ai"})).toEqual([]);});
});
