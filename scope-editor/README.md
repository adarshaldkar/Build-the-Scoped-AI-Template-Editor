# Scope — Scoped AI Visual Template Editor

> A professional-grade, deterministic website template editor featuring bidirectional AST code synchronization, viewport-isolated responsive cascading, an auditable dual-recovery engine, and a deterministic AI assistant with side-by-side proposal review.

---

## 1. System Architecture & Core Philosophy

Scope is designed around one uncompromising rule: **The Canonical `TemplateModel` is the single source of truth, and every mutation must flow through a transactional, two-tier validated commit pipeline.**

```
[ Canvas Direct Edits ]   [ Docked Inspector ]   [ Code Reconciler AST ]   [ Deterministic AI ]
         │                        │                         │                      │
         └────────────────────────┼─────────────────────────┴──────────────────────┘
                                  │
                                  ▼
                     [ EditCommand Transaction ]
                                  │
                                  ▼
               [ executeCommit() Transactional Gate ]
                     ├── Tier 1: Zod Runtime Schema Validation
                     └── Tier 2: Business Logic & Scope Rules
                                  │
                                  ▼
              [ Next Immutable Model + Revision Entries ]
                                  │
                                  ▼
              [ LocalStorage & Session Undo/Redo Stacks ]
```

---

## 2. The 7 Core Architectural Invariants

### 1. Canonical State & Pure Responsive Cascade (Phase 0 & 1)
- **Base vs. Overrides**: Base properties (`baseProps`) apply universally to all viewports.
- **Viewport Isolation**: `overrides.mobile` and `overrides.tablet` store sparse overrides. Editing in Mobile mode writes strictly to `overrides.mobile`, leaving Desktop and Tablet 100% untouched.
- **Pure Resolver**: `resolveElementProps(node, activeViewport)` dynamically resolves computed styles at render time without mutating the underlying tree.

### 2. Two-Tier Validation Engine (Phase 1)
- **Tier 1 (Zod Runtime)**: Validates command structure, numeric bounds, color formats, and permitted style property whitelists.
- **Tier 2 (Business Invariants)**:
  - Atomic multi-target validation (if 1 target in a batch fails, the entire transaction aborts cleanly).
  - Stale revision detection (`STALE_REVISION`).
  - Content scope enforcement (content changes require `scope: "all"`).

### 3. Bidirectional Code Synchronization (Phase 2)
- **Recursive AST Parser**: Tokenizes and builds a syntax tree from raw HTML/CSS without fragile regular expressions.
- **Diff Reconciler**: Reconciles AST modifications against canonical element IDs, enforcing ID preservation, CSS property ranges, and selected-element boundaries before generating a validated `EditCommand`.

### 4. Deterministic AI Assistant & Proposal Review (Phase 3)
- **Zero Hallucination**: Maps natural language prompts and contextual quick chips to deterministic, typed transforms across 6 scenarios (Copywriting, Visual Hierarchy, Theme Shift, Responsive Mobile Layouts, Multi-CTA Batch Patches, Structural Reordering).
- **Two-Stage Proposal Review**: Canvas state remains completely untouched while a proposal is pending. Proposals are previewed in a neutral editorial diff card with Accept/Reject actions.
- **Stale Guard**: Proposals track `baseRevision`. If the canvas revision increments before acceptance, the proposal is flagged as `[STALE]`.

### 5. Visual Canvas & Inline Text Editing (Phase 4)
- **Direct Element Ring**: 1.5px blue outline with attached tag badge (`Hero Heading · text`), eliminating coordinate lag during window reflows.
- **Inline Editing**: Double-clicking triggers direct `contentEditable` editing on the page. Exiting on `Enter`/`Blur` commits changed text through Phase 1.
- **Device Frames**: 1440px Desktop, 768px Tablet with device bezels, and 375px Mobile phone frame with camera notch.

### 6. Docked Inspector with Viewport Overrides (Phase 5)
- **Kind-Aware Controls**: Typography, Flex Layout, Spacing, Dimensions, and Appearance.
- **Visual Override Indicator**: Displays an amber dot `●` next to properties with active viewport overrides.
- **1-Click Reset**: Resets single property overrides cleanly with explicit key deletion semantics.

### 7. Dual Recovery System (Phase 6)
- **Linear Undo/Redo (`⌘Z` / `⌘⇧Z`)**: Session-only snapshot stacks capped at 50 snapshots.
- **Granular Revision History Drawer**: An auditable timeline of element-level changes with non-destructive **forward-only element restores**.

---

## 3. Automated Test Suite (81 Tests Passed)

Scope is hardened by **81 comprehensive automated unit and integration tests**:

```text
 ✓ src/lib/__tests__/canvasRenderer.test.ts (7 tests)
 ✓ src/lib/__tests__/inspector.test.ts (5 tests)
 ✓ src/lib/__tests__/aiEngine.test.ts (12 tests)
 ✓ src/lib/__tests__/integration.test.ts (1 test - 24-step Smoke Test)
 ✓ src/lib/__tests__/codeReconciler.test.ts (20 tests)
 ✓ src/lib/__tests__/commitPipeline.test.ts (24 tests)
 ✓ src/lib/__tests__/history.test.ts (12 tests)

 Test Files  7 passed (7)
      Tests  81 passed (81)
```

---

## 4. Local Development & Verification

### Prerequisites
- Node.js 18+
- npm / yarn / pnpm

### Quick Start
```bash
# 1. Navigate to the editor directory
cd scope-editor

# 2. Install dependencies
npm install

# 3. Run all automated tests
npm test

# 4. Type check TypeScript
npx tsc --noEmit

# 5. Start the development server
npm run dev

# 6. Build the production bundle
npm run build

# 7. Preview production build
npm run preview
```

---

## 5. Keyboard Shortcuts

| Shortcut | Action | Scope / Context |
|---|---|---|
| `⌘Z` / `Ctrl+Z` | Linear Undo | Global (bypassed inside text inputs) |
| `⌘⇧Z` / `Ctrl+Shift+Z` | Linear Redo | Global (bypassed inside text inputs) |
| `⌘K` / `Ctrl+K` | Toggle Code Editor | Global Modal |
| `⌘/` / `Ctrl+/` | Toggle AI Assistant | Global Command Drawer |
| `Escape` | Prioritized Close / Cancel | Inline edit $\to$ Code $\to$ History $\to$ AI $\to$ Selection |
| `⌘↵` / `Ctrl+Enter` | Apply / Accept | Code Editor Apply, AI Proposal Accept |
| `Double Click` | Inline Direct Edit | Canvas Text / Button / Link |

---

## 6. Live Deployment

Scope is a client-side Single Page Application (SPA) built with Vite and React. It is ready for zero-config deployment on **Vercel** or **Netlify**:

```bash
# Build Command
npm run build

# Output Directory
dist
```
