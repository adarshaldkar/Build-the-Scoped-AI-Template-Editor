import { describe, expect, it } from "vitest";
import { initialTemplateModel } from "../templateData";
import { resolveElementProps } from "../resolver";
import { findNodeById } from "../treeUtils";
describe("Phase 4 canvas model behavior",()=>{
 it("resolves desktop base values",()=>{const n=findNodeById(initialTemplateModel.elements,"hero-heading")!;expect(resolveElementProps(n,"desktop").fontSize).toBe(56);});
 it("resolves tablet overrides",()=>{const n=findNodeById(initialTemplateModel.elements,"hero-heading")!;expect(resolveElementProps(n,"tablet").fontSize).toBe(44);});
 it("resolves mobile overrides",()=>{const n=findNodeById(initialTemplateModel.elements,"hero-heading")!;expect(resolveElementProps(n,"mobile").fontSize).toBe(34);});
});
