# Scope — Scoped AI Visual Template Editor

> A professional-grade, deterministic website template editor featuring bidirectional AST code synchronization, viewport-isolated responsive cascading, an auditable dual-recovery engine, and a deterministic AI assistant with side-by-side proposal review.

---

## 1. System Architecture & Core Philosophy

Scope is designed around one uncompromising rule: **The Canonical `TemplateModel` is the single source of truth, and every mutation must flow through a transactional, two-tier validated commit pipeline.**

```text
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

## 2. Commit Boundary & Architectural Trade-off

### The Commit Boundary
All mutations across the visual canvas, code editor, property inspector, AI assistant, and history restore funnel into a single, synchronous, pure gatekeeper: **`executeCommit(model: TemplateModel, command: EditCommand): CommitResult`** in `src/lib/commitPipeline.ts`.

- **Atomic Execution**: An `EditCommand` with multiple targets is executed atomically. If any target fails validation, the entire transaction is rejected and the document revision is preserved.
- **Revision & Version Monotonicity**: Every successful commit increments the master `model.revision` and each modified `node.version`.
- **Immutable State Return**: The pipeline produces a brand-new immutable `TemplateModel` alongside an appended `RevisionEntry`.

### Architectural Trade-off
- **Chosen Model**: Immutable Snapshot Tree with Sparse Viewport Overrides.
- **Trade-off Analysis**: We chose an immutable snapshot tree over complex Operational Transforms (OT) or CRDTs. While immutable tree updates require structured cloning on commits, they eliminate the vast complexity and subtle race conditions of distributed operational transformations. In the context of a client-side studio template editor, immutable snapshots provide absolute determinism, zero state drift between canvas and code surfaces, and allow for trivial linear undo/redo and non-destructive forward element recovery.

---

## 3. The 7 Core Architectural Invariants

### 1. Canonical State & Pure Responsive Cascade
- **Template Source**: Loads the **NOVA Studio** landing page template (`src/lib/templateData.ts`) consisting of 6 modular sections: Navigation, Hero, Services, About, CTA, and Footer.
- **Base vs. Overrides**: Base properties (`baseProps`) apply universally across viewports.
- **Viewport Isolation**: `overrides.mobile` and `overrides.tablet` store sparse overrides. Editing in Mobile mode writes strictly to `overrides.mobile`, leaving Desktop and Tablet 100% untouched.
- **Pure Resolver**: `resolveElementProps(node, activeViewport)` in `src/lib/resolver.ts` dynamically resolves computed styles at render time without mutating the underlying tree.

### 2. Two-Tier Validation Engine
- **Tier 1 (Zod Runtime)**: Validates command structure, numeric bounds, color formats, and permitted style property whitelists in `src/lib/validation.ts`.
- **Tier 2 (Business Invariants)**:
  - Atomic multi-target validation.
  - Stale revision detection (`STALE_REVISION`).
  - Content scope enforcement (content changes require `scope: "all"`).

### 3. Bidirectional Code Synchronization
- **Monaco-Style Dark Surface**: Dark editor (`⌘K`) featuring syntax highlighting (tags in sky blue, attributes in purple, strings in emerald, styles in amber/orange) and line numbers with error indicators.
- **Soft Word-Wrapping**: Includes a `[Wrap: On/Off]` toggle to prevent long inline styles from forcing horizontal scrolling.
- **Scope Modes**:
  - `Selected Component`: Isolates code editing strictly to the currently selected subtree.
  - `Full Template`: Exposes the entire hierarchical document root (`<main id="nova-studio-landing">`).
- **AST Diff Reconciler**: Reconciles AST modifications against canonical element IDs, enforcing ID preservation (`DELETED_REQUIRED_ID` protection), CSS property ranges, and selected-element boundaries before generating a validated `EditCommand`.
- **Zero-Destruction Safety**: The `Apply Changes` button is disabled when markup is invalid, preventing any broken draft from reaching canonical state.

### 4. Deterministic AI Assistant & Proposal Review
- **Selection Authority**: In `Selected` mode, proposals strictly reference selected element IDs.
- **Smart Semantic NLP Parser**: Intelligently parses natural language instructions (colors, typography, spacing, layouts) and contextual quick action chips.
- **Two-Stage Proposal Review**: Canvas state remains completely untouched while a proposal is pending. Proposals are previewed in a neutral editorial diff card with individual `[Accept]` and `[Reject]` controls per target.
- **Stale Guard**: Proposals track `baseRevision`. If the canvas revision increments before acceptance, the proposal is flagged as `[STALE]`.

### 5. Visual Canvas & Inline Text Editing
- **Direct Element Ring**: 2px blue outline (`outline: 2px solid #2563eb`) with instant bounding.
- **Inline Editing**: Double-clicking triggers direct `contentEditable` editing on the page. Exiting on `Enter`/`Blur` commits changed text.
- **Device Frames**: 1440px Desktop, 768px Tablet with device bezels, and 375px Mobile phone frame with camera notch, featuring `max-w-full` bounds to prevent horizontal clipping.

### 6. Docked Inspector with Viewport Overrides
- **Studio Color Picker**: Clickable preview chips triggering native picker, formatted `#HEX` text inputs with validation, and 8 one-click design swatches.
- **Directional Box Model**: Dedicated **Padding (px)** and **Margin (px)** directional cards (`Top`, `Bottom`, `Left`, `Right`).
- **Visual Override Indicator**: Displays an amber dot `●` next to properties with active viewport overrides.
- **1-Click Reset**: Resets single property overrides cleanly with explicit key deletion semantics.

### 7. Dual Recovery System
- **Linear Undo/Redo (`⌘Z` / `⌘⇧Z`)**: Session-only snapshot stacks.
- **Granular Revision History Drawer**: An auditable timeline of element-level changes with non-destructive **forward-only element restores** (`createPropertyRestorePatch`).

---

## 4. Reviewer-Visible AI Demo Instructions & Safe Failures

### Verified Demonstration Instructions
1. **Content Rewrite**:
   - `Make it punchier` $\to$ Rewrites hero headline into punchy creative copy.
   - `Enterprise B2B` $\to$ Rewrites headline and CTA button into authoritative enterprise copy.
2. **Style Change**:
   - `Make hero background #18181B and text #FFFFFF` $\to$ Sets dark background and white text on the hero section.
   - `Make hero heading text #2563EB` $\to$ Sets vibrant studio blue text color.
3. **Move / Resize / Reorder**:
   - `Move services above about` $\to$ Performs structural reordering of sections.
   - `Make hero heading size 64 and weight 800` $\to$ Increases typography size and applies extra-bold weight.
4. **One-Viewport Responsive Adjustment**:
   - `Stack buttons vertically` (on Mobile Viewport) $\to$ Generates a `mobile`-only layout patch setting `flexDirection: "column"` and `width: "100%"`.
5. **Multi-Element Edit**:
   - `Polish all buttons` $\to$ Batch updates all button radii, padding, and font weights.
   - `Dark luxury theme` $\to$ Transforms document-wide color scheme.

### Safe Failure Examples
- **Unsupported / Unmatched Instruction**: Entering arbitrary text prompts that cannot produce valid CSS properties safely returns a non-destructive error: *"Could not determine valid stylistic changes for this prompt. Try specifying colors, sizes, weights, or using quick action chips."*
- **Stale Revision**: Generating a proposal and making a manual canvas edit before accepting flags the proposal card as `[STALE]`, blocking execution.
- **Disallowed Field on Element Kind**: Attempting to apply non-whitelisted properties to an incompatible element kind is rejected by `validatePropertyApplicability`.
- **Unselected Target**: Requesting an edit in `Selected` mode with 0 elements selected returns: *"Select at least one element before requesting an AI edit in Selected mode, or switch to Full Template mode."*

---

## 5. Third-Party Libraries & Ownership Boundaries

| Library | Purpose & Usage | Ownership Boundary |
| :--- | :--- | :--- |
| **React 18** | UI component rendering | View layer only. |
| **TypeScript** | Type checking | Schema definitions & compile-time safety. |
| **Vite** | Dev server & production bundler | Build tooling. |
| **Tailwind CSS** | Atomic utility styling | Visual layout only. |
| **Zod** | Runtime schema validation | Schema contract in `validation.ts`. |
| **Vitest** | Automated test suite | Automated verification runner. |

> **Ownership Note**: All canonical data structures, AST reconcilers, validation pipelines, responsive resolution cascade, history managers, and deterministic AI engines are custom proprietary code owned entirely within `src/lib/*`.

---

## 6. Automated Test Suite (38 Tests Passed)

Scope is hardened by **38 comprehensive automated unit and integration tests**:

```text
 ✓ src/lib/__tests__/canvasRenderer.test.ts (3 tests)
 ✓ src/lib/__tests__/aiEngine.test.ts (8 tests)
 ✓ src/lib/__tests__/codeReconciler.test.ts (9 tests)
 ✓ src/lib/__tests__/inspector.test.ts (3 tests)
 ✓ src/lib/__tests__/commitPipeline.test.ts (10 tests)
 ✓ src/lib/__tests__/history.test.ts (4 tests)
 ✓ src/lib/__tests__/integration.test.ts (1 test)

 Test Files  7 passed (7)
      Tests  38 passed (38)
```

---

## 7. Keyboard Shortcuts

| Shortcut | Action | Scope / Context |
|---|---|---|
| `⌘Z` / `Ctrl+Z` | Linear Undo | Global (bypassed inside text inputs) |
| `⌘⇧Z` / `Ctrl+Shift+Z` | Linear Redo | Global (bypassed inside text inputs) |
| `⌘K` / `Ctrl+K` | Toggle Code Editor | Global Modal |
| `⌘/` / `Ctrl+/` | Toggle AI Assistant | Global Command Drawer |
| `⌘B` / `Ctrl+B` | Toggle Layers Panel | Global Sidebar Toggle |
| `⌘I` / `Ctrl+I` | Toggle Property Inspector | Global Sidebar Toggle |
| `Escape` | Prioritized Close / Cancel | Drawers $\to$ Modals $\to$ Selection |
| `Double Click` | Inline Direct Edit | Canvas Text / Button / Link |

---

## 8. Live Deployment

Scope is a client-side Single Page Application (SPA) built with Vite and React. It is configured for zero-config deployment on **Vercel** via the root `vercel.json`:

```bash
# Build Command
npm run build

# Output Directory
scope-editor/dist (or dist)
```
