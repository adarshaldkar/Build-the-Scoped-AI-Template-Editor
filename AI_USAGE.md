# AI Usage Report

## 1. Tools and Models Used

### AI Coding, Architecture & Review
- **Google Antigravity / Agentic Coding Assistant**: Used as a pair-programming and verification tool for architecture planning, product framing, implementation drafting, debugging, test design, edge-case discovery, and automated browser-oriented verification sessions.
- **ChatGPT / Advanced LLM Review**: Used for independent architectural review, requirement interpretation, trade-off analysis, UI/UX critique, edge-case auditing, and final submission readiness checks.

### Runtime Boundary Guarantee
The deployed Scope application does **not** depend on a live LLM or runtime external AI API for its assistant flows. The in-app assistant is implemented as a deterministic semantic NLP and scenario engine operating directly on the current selection, viewport scope, and canonical template state.

> **Key Takeaway**: AI was used extensively to design, draft, review, and harden the software; it is **never** used to silently mutate production state at runtime.

---

## 2. Redacted Interaction Examples

### Example 1 — Planning / Product Framing Interaction
> **Prompt**:
> *"We are building a scoped visual website template editor where users can edit through the canvas, code editor, Inspector, or deterministic AI. How should we architect the mutation pipeline so that edits cannot drift between surfaces or accidentally change another viewport?"*

**Useful Output Adopted**:
1. Treat the typed `TemplateModel` as the strict, single canonical source of truth.
2. Route Canvas, Inspector, Code Reconciler, AI Proposals, and History Restore changes through one unified `EditCommand` and transactional commit boundary (`executeCommit`).
3. Keep universal base values (`baseProps`) strictly separated from tablet and mobile override buckets (`overrides.tablet`, `overrides.mobile`).
4. Reject stale revisions, missing required IDs, or out-of-scope commands before any state mutation occurs.

**Resulting Implementation**:
The project uses a centralized `executeCommit(model, command)` pipeline with two-tier validation (Zod schema + business logic invariants), immutable state transitions, monotonic revision clocks, and auditable history recording.

---

### Example 2 — Implementation / Debugging / Testing Interaction
> **Prompt**:
> *"Review the code reconciler for nested markup, missing IDs, invalid CSS values, and multi-element edits. Identify cases where malformed code could accidentally modify the canonical template."*

**Useful Output Adopted**:
1. Replace flat regex extraction with a controlled recursive AST markup parser.
2. Validate stable element IDs before generating an `EditCommand`, throwing `DELETED_REQUIRED_ID` if a canonical node is removed.
3. Treat invalid CSS values and out-of-range numeric values as explicit validation failures with line numbers.
4. Implement `parseCssNumeric` to distinguish unitless numbers (e.g. `fontWeight: 700`, `opacity: 0.9`) from pixel values (`48px` $\to$ `48`).
5. Preserve independent, isolated patches when multiple elements are edited.

**Resulting Implementation**:
`src/lib/codeReconciler.ts` was hardened around a recursive tree representation, explicit validation, per-target patches, and safe failure behavior so invalid code never reaches canonical state.

---

## 3. AI Suggestions Rejected or Materially Corrected

### Rejected Suggestions
During early architecture reviews, two AI suggestions were deliberately rejected:
1. **Automatic Hero Fallback**: Automatically defaulting to targeting the `"Hero Section"` when a user entered an AI prompt with no elements selected in `Selected` mode.
2. **Regex-Based HTML Search-and-Replace**: Using string replacements and regular expressions for bidirectional HTML code synchronization.

### Why They Were Rejected
- **Weakening Selection Authority**: The core safety rule of Scope is **Selection is Authority**. A user in `Selected` mode must never have an edit silently expanded or guessed by the system.
- **Fragility of Regex Parsing**: Nested tags, multiline style declarations, mixed quotes, and whitespace variations make string replacement prone to silent markup corruption.

### Resulting Corrections
- AI targeting is strictly constrained by explicit selection context (`selectedNodes`). Running in `Selected` mode with 0 elements selected returns a controlled non-destructive error: *"Select at least one element before requesting an AI edit in Selected mode, or switch to Full Template mode."*
- Replaced regex replacement with a typed **AST parser and reconciler** (`parseMarkupToAst`) that compares node trees against the canonical model before generating patches.
- Invalid IDs, invalid markup, invalid properties, and stale revisions are rejected without modifying the last valid canonical state.

---

## 4. How Generated Code Was Verified

The generated implementation was verified across three rigorous layers:

### A. Automated Verification
The test suite contains **7 test suites and 38 comprehensive automated tests** covering:
- Commit validation, schema constraints, and atomicity (`commitPipeline.test.ts`)
- Code serialization, AST parsing, and bidirection reconciler roundtrips (`codeReconciler.test.ts`)
- Deterministic AI scenarios, semantic NLP parsing, and selection containment (`aiEngine.test.ts`)
- Canvas and responsive resolver behavior (`canvasRenderer.test.ts`)
- Inspector scope and override isolation (`inspector.test.ts`)
- Linear undo/redo and per-element history recovery (`history.test.ts`)
- Cross-module integration smoke tests (`integration.test.ts`)

**Commands executed & validated**:
```bash
npm test          # 38/38 Vitest tests PASS
npx tsc --noEmit  # 0 TypeScript compiler errors (Exit code 0)
npm run build     # Clean Vite production bundle built in 6.66s
```

### B. Manual & Browser Subagent Verification
Manual verification covered all 10 required user journey flows:
1. **Viewport Previews**: Desktop (1440px), Tablet (768px), and Mobile (375px) preview switching without distortion.
2. **Selection Authority**: Single-click and additive `Shift`/`Ctrl`/`Cmd`-click multi-selection indicators.
3. **Canvas Direct Editing**: Double-click inline text editing directly updating the canonical model.
4. **Precision Inspector**: Studio Color Picker with hex validation and 8 swatches, directional box model cards (Padding/Margin), typography weight dropdown (`300`–`800`).
5. **Responsive Overrides**: Visual override indicators (`●`) and one-click property reset badges.
6. **Monaco-Style Code Editor**: Syntax highlighting, soft word-wrapping toggle (`Wrap: On/Off`), and disabled Apply on invalid markup.
7. **AI Proposal Review**: Before/after diff cards with individual `[Accept]` and `[Reject]` controls.
8. **History Recovery**: Granular forward-only single-element rollback without disturbing unrelated sections.
9. **Dual Recovery**: Linear session Undo/Redo (`⌘Z` / `⌘⇧Z`).
10. **Persistence & Responsiveness**: LocalStorage sync, deliberate reset dialog, and full editor shell adaptability down to 320px mobile screens without horizontal overflow.

### C. Dependency Review
The dependency set was audited to keep the footprint minimal and production-grade:
- **UI & Core**: `React 18`, `TypeScript`, `Vite`, `Tailwind CSS`
- **Validation & Test**: `Zod` (runtime schema contracts), `Vitest` (automated unit/integration test runner)
- **Zero External AI Runtime**: Completely self-contained offline architecture.

---

## 5. Workflow Limitation and What I Would Change Next Time

### Observed Limitation
AI coding tools tend to generate plausible-looking implementations for simple happy paths while obscuring subtle edge cases. The most prominent example was markup parsing: a simple regex approach can appear correct for basic examples while failing on nested structures, missing IDs, multiline attributes, and exact round-trip serialization.

### What I Would Change Next Time
1. **Grammar & AST Contracts First**: Define the parser grammar, AST node contracts, mutation boundaries, and failure semantics *before* requesting implementation code.
2. **Adversarial Edge-Case Tests First**: Write comprehensive test suites (asserting missing IDs, unitless CSS numbers, malformed syntax, and stale revisions) to guide the LLM's implementation rather than testing after the fact.

> **Final Reflection**: AI-assisted programming is a powerful accelerator, but AI output must always be treated as an unverified draft. Every state transition, boundary condition, and recovery mechanism requires human architectural oversight, formal schema contracts, and exhaustive test coverage.
