# Hardened Implementation Plan: Phase 0 & Phase 1 Foundation

Establish the core state and mutation infrastructure for the Scope editor: typed schema contracts, canonical NOVA Studio template model, LocalStorage persistence, multi-layer Zod + business-rule validation, and transaction-like atomic commit pipeline.

## User Review Required

> [!IMPORTANT]
> - **Content Scope Rule**: `content` changes are template-wide and require `scope: "all"`. Passing `content` with a single-viewport scope (`mobile`, `tablet`, `desktop`) will be rejected by business rules (`INVALID_SCOPE_FOR_CONTENT`).
> - **Two-Tier Validation Gate**: 
>   1. *Tier 1 (Zod Schema)*: Type safety, value ranges, and unknown field rejection (`.strict()`).
>   2. *Tier 2 (Business Rules)*: Stale revision guard, target existence, empty command rejection (`NO_CHANGES`), reorder bounds, target deduplication, and element-property applicability.
> - **Multi-Target Atomicity**: Commands modifying multiple targets execute all-or-nothing. An invalid element in `targetIds: ["hero-heading", "invalid-id"]` rejects the entire command before touching state.
> - **Strict Boundary**: Phase 0 & Phase 1 only implement the data foundation and mutation engine. Canvas UI, Monaco code parser, AI scenario engine, Inspector, and History UI will be built in subsequent phases.

---

## Proposed Changes

### Phase 0: Type Contracts, Canonical Model & Persistence

#### [MODIFY] [types.ts](file:///c:/Users/shrut/Desktop/Frontend_AI_Assessment/project-bolt-sb1-xmioodwi/project/src/lib/types.ts)
- Define canonical TypeScript interfaces:
  - `Viewport = "desktop" | "tablet" | "mobile"` & `Scope = "all" | Viewport`.
  - `ElementStyleProps` (whitelisted typography, spacing, dimensions, flex/grid layout).
  - `ViewportOverrides` (`desktop`, `tablet`, `mobile`).
  - `ElementNode` with `id`, `name`, `kind`, `icon`, `content`, `baseProps`, `overrides`, `version`.
  - `TemplateModel` with `templateId`, `templateName`, `schemaVersion`, `revision`, `updatedAt`, `elements`.
  - `EditCommand`, `RevisionEntry`, `ValidationError` (with specific error codes: `SCHEMA_VALIDATION_FAILED`, `TARGET_NOT_FOUND`, `STALE_REVISION`, `NO_CHANGES`, `INVALID_SCOPE_FOR_CONTENT`, `INCOMPATIBLE_PROPERTY_FOR_ELEMENT`, `INVALID_REORDER`).
  - `CommitResult` discriminated union.

#### [NEW] [templateData.ts](file:///c:/Users/shrut/Desktop/Frontend_AI_Assessment/project-bolt-sb1-xmioodwi/project/src/lib/templateData.ts)
- Canonical **NOVA Creative Studio** template data model conforming to `TemplateModel`.
- Contains rich, realistic content across Navigation, Hero, Services, About, CTA, and Footer with base properties and initial mobile/tablet overrides.

#### [NEW] [resolver.ts](file:///c:/Users/shrut/Desktop/Frontend_AI_Assessment/project-bolt-sb1-xmioodwi/project/src/lib/resolver.ts)
- Pure resolution function: `resolveElementProps(node: ElementNode, viewport: Viewport): ElementStyleProps`.
- Cascade rule: $\text{Override}[\text{viewport}] \lor \text{BaseProps} \lor \text{DefaultToken}$.

#### [NEW] [storage.ts](file:///c:/Users/shrut/Desktop/Frontend_AI_Assessment/project-bolt-sb1-xmioodwi/project/src/lib/storage.ts)
- LocalStorage persistence engine for `TemplateModel` and `RevisionEntry[]`.
- Handles JSON serialization, version checking, and safe fallback to default canonical template.

---

### Phase 1: Validation Engine & Transactional Commit Pipeline

#### [NEW] [validation.ts](file:///c:/Users/shrut/Desktop/Frontend_AI_Assessment/project-bolt-sb1-xmioodwi/project/src/lib/validation.ts)
- Tier 1 Zod Schemas (`.strict()`):
  - `ViewportSchema`, `ScopeSchema`, `EditSourceSchema`.
  - `ElementStylePropsSchema` with bounds checking (e.g. `fontSize: 8-160`, `borderRadius: 0-100`).
  - `EditCommandSchema`.
- Tier 2 Business Rule Validator:
  - Whitelist mapping for element kind vs allowed properties (e.g. `text` allows typography, `container` allows flex/grid/gap).
  - Validates `content` requires `scope: "all"`.
  - Validates non-empty `changes` payload (`NO_CHANGES`).
  - Validates reorder index bounds.

#### [NEW] [treeUtils.ts](file:///c:/Users/shrut/Desktop/Frontend_AI_Assessment/project-bolt-sb1-xmioodwi/project/src/lib/treeUtils.ts)
- Pure tree operations:
  - `findNodeById(nodes, id)`: Recursive node lookup.
  - `findParentNode(nodes, childId)`: Parent lookup for reordering.
  - `getAllNodeIds(nodes)`: Fast set lookup.
  - `mapNodeTree(nodes, targetId, transform)`: Immutable node tree transformation.
  - `reorderChildren(nodes, parentId, sourceIndex, targetIndex)`: Sibling reordering.

#### [NEW] [commitPipeline.ts](file:///c:/Users/shrut/Desktop/Frontend_AI_Assessment/project-bolt-sb1-xmioodwi/project/src/lib/commitPipeline.ts)
- `validateEditCommand(model, rawCommand)`: Executes Tier 1 Zod check + Tier 2 Business Rules. Returns `{ valid: true, command }` or `{ valid: false, error }`.
- `applyEditCommand(model, command)`: Pure immutable state transition + scope routing + version bumps + `RevisionEntry` delta generation.
- `executeCommit(model, rawCommand)`: Master transaction-like atomic entrypoint returning `CommitResult`.

---

### Verification & Automated Test Suite

#### [NEW] [commitPipeline.test.ts](file:///c:/Users/shrut/Desktop/Frontend_AI_Assessment/project-bolt-sb1-xmioodwi/project/src/lib/__tests__/commitPipeline.test.ts)
- **Phase 0 Foundation Tests**:
  1. Canonical template model is valid JSON and roundtrips losslessly.
  2. `resolveElementProps` correctly falls back from overrides to base props.
  3. `storage.ts` persists and restores template model and history entries.
- **Phase 1 Invariant & Safety Tests**:
  4. [PASS] Valid command modifies state, bumps element `version`, and increments template `revision`.
  5. [FAIL] Unknown/invalid target ID returns `TARGET_NOT_FOUND` and leaves state 100% untouched.
  6. [FAIL] Stale `baseRevision` returns `STALE_REVISION` and leaves state 100% untouched.
  7. [FAIL] Empty/no-op `changes: {}` returns `NO_CHANGES`.
  8. [FAIL] Unknown property (e.g. `bananaColor: "red"`) returns `SCHEMA_VALIDATION_FAILED`.
  9. [FAIL] Incompatible property (e.g. `flexDirection` on `text` node) returns `INCOMPATIBLE_PROPERTY_FOR_ELEMENT`.
  10. [FAIL] `content` edit with `scope: "mobile"` returns `INVALID_SCOPE_FOR_CONTENT`.
  11. [ISOLATION] `scope: "mobile"` writes exclusively to `overrides.mobile` (desktop/tablet unchanged).
  12. [ISOLATION] `scope: "desktop"` writes exclusively to `overrides.desktop`.
  13. [ISOLATION] `scope: "all"` writes exclusively to `baseProps`.
  14. [ATOMICITY] Multi-target edit with one invalid target fails atomically without modifying preceding valid targets.
  15. [HISTORY] Every successful commit generates an accurate `RevisionEntry` delta.
  16. [IMMUTABILITY] Input `TemplateModel` is strictly immutable.

---

## Verification Plan

### Automated Tests
```bash
cd project-bolt-sb1-xmioodwi/project
npx vitest run src/lib/__tests__/commitPipeline.test.ts
```

### Type Checking
```bash
cd project-bolt-sb1-xmioodwi/project
npx tsc --noEmit
```
