# Implementation Plan: Phase 3 Deterministic AI Assistant & Proposal Pipeline

Implement the deterministic AI intent classifier, rule-based proposal generator covering all 6 assignment scenarios, stale proposal detection guard, and the two-stage `ProposalCard` / `AiAssistant` UI components.

## User Review Required

> [!IMPORTANT]
> - **5 Locked Phase 3 Decisions**:
>   1. Single definitive proposal per request (zero variation sprawl).
>   2. Strict selection authority: no element selected $\to$ `NO_SELECTION` (UI input disabled).
>   3. Explicit target scope toggle: `[ Selected Element | Full Template ]`.
>   4. Diff card preview only (`ProposalCard.tsx`); canonical canvas remains 100% untouched until Accept.
>   5. Stale proposal guard: flagged as `[STALE]` if canvas revision changes before user accepts.

---

## Proposed Changes

### Core Library (`src/lib/`)

#### [NEW] [aiEngine.ts](file:///c:/Users/shrut/Desktop/Frontend_AI_Assessment/scope-editor/src/lib/aiEngine.ts)
- `generateAiProposal(model: TemplateModel, prompt: string, selectedNode: ElementNode | null, targetMode: "selected" | "full", activeViewport: Viewport): { success: true; proposal: AiProposal } | { success: false; error: ValidationError }`
  - Intent classification across all 6 scenarios:
    1. Copywriting / Tone: Punchy, Enterprise B2B, Minimal Studio.
    2. Typography / Hierarchy: Bolder Hierarchy, Minimal Typography.
    3. Themes / Color: Dark Luxury (`#09090B`), Warm Editorial (`#FAF9F6`), Vibrant Studio Accent.
    4. Mobile Scoped: `overrides.mobile` adjustments (stack buttons, mobile heading scaling).
    5. Multi-Element Synchronized: Polish all CTA buttons, align hero center.
    6. Reordering: Move sections up/down.
  - Builds typed `AiProposal` capturing `baseRevision: model.revision`, Before/After diffs, and pre-constructed `EditCommand` (`source: "ai_assistant"`).
- `getContextualQuickChips(selectedNode: ElementNode | null, targetMode: "selected" | "full", activeViewport: Viewport): string[]`
  - Returns 3–4 contextually appropriate 1-click quick-action chips.
- `isProposalStale(proposal: AiProposal, currentModel: TemplateModel): boolean`
  - Returns `true` if `proposal.baseRevision !== currentModel.revision`.

---

### UI Components (`src/components/`)

#### [NEW] [ProposalCard.tsx](file:///c:/Users/shrut/Desktop/Frontend_AI_Assessment/scope-editor/src/components/ProposalCard.tsx)
- Side-by-side Before vs After visual diff card.
- Target name, Scope badge (`[Scope: All]` / `[Scope: Mobile]`), and Prompt description.
- Stale banner with amber warning when `isProposalStale === true`.
- `Reject` button (discards proposal) and `Accept Proposal` button (dispatches to Phase 1 commit pipeline).

#### [NEW] [AiAssistant.tsx](file:///c:/Users/shrut/Desktop/Frontend_AI_Assessment/scope-editor/src/components/AiAssistant.tsx)
- Floating command bar / drawer with high-contrast slate/charcoal styling (no purple/neon AI clichés).
- Target Mode Toggle: `[ Selected Element | Full Template ]`.
- Context pill: `[Target: Hero Heading]` + `[Viewport: Desktop]`.
- Input field with disabled state and message when `mode === "selected"` and `selectedNode === null`.
- Context-aware quick action chips for 1-click execution.
- Pending proposal list displaying `ProposalCard`.

---

### Automated Test Suite (`src/lib/__tests__/`)

#### [NEW] [aiEngine.test.ts](file:///c:/Users/shrut/Desktop/Frontend_AI_Assessment/scope-editor/src/lib/__tests__/aiEngine.test.ts)
- Comprehensive test suite covering:
  1. `NO_SELECTION` rejection when targetMode is `selected` but `selectedNode` is null.
  2. Copywriting tone transforms (Punchy, Enterprise, Minimal) on heading and paragraph.
  3. Visual hierarchy typography scaling (fontSize, fontWeight, letterSpacing).
  4. Dark luxury theme across sections and buttons.
  5. Mobile viewport isolation (`overrides.mobile` only).
  6. Multi-element synchronized edits across all CTA buttons.
  7. Structural reordering proposal.
  8. Stale proposal detection when canvas revision increments.
  9. Proposal acceptance and Phase 1 commit integration.
  10. Proposal rejection immutability guarantee.

---

## Verification Plan

### Automated Tests
```bash
cd scope-editor
npm test
```

### Type Checking
```bash
cd scope-editor
npx tsc --noEmit
```
