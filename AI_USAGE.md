# AI Usage Report

## 1. Tools and Models Used
- **Antigravity AI / Google DeepMind Agentic Coding Assistant**: Used for system architecture design, schema contracts, implementation drafting, code reconciler AST tokenization, Vitest test suite authoring, and automated browser regression verification.
- **Role & Boundary**: AI was utilized as a pair programmer for task framing, rapid iteration, test coverage generation, and edge-case discovery. The deployed runtime client in `scope-editor` is completely self-contained and deterministic with **zero runtime external API dependencies**.

---

## 2. Two Redacted Interaction Examples

### Example 1: Planning & Product Framing Interaction
> **Prompt**: *"We are building a scoped visual website template editor where users can edit via canvas, Monaco-style code editor, or deterministic AI. How should we architect the mutation pipeline so that canvas, code, and AI never cause state divergence or corrupt viewport overrides?"*
> 
> **AI Framing & Selected Strategy**:
> - Evaluated iframe isolation vs. inline React rendering tree.
> - Formulated the **Single Source of Truth** invariant: every edit surface (canvas, code AST reconciler, inspector, AI proposals) must serialize into a typed `EditCommand` and pass through a single transactional gatekeeper `executeCommit(model, command)`.
> - Designed the **Pure Responsive Cascade**: base styles apply universally to all viewports, while tablet and mobile edits write sparse override records (`overrides.tablet`, `overrides.mobile`), guaranteeing that single-view edits leave other screen sizes 100% untouched.

### Example 2: Implementation & Debugging Interaction
> **Prompt**: *"The HTML code reconciler is parsing `<section id="nav" style="padding-top: 20px; font-weight: 700">` and converting it back into typed `EditCommand` patches. Write unit tests for handling multi-line styles, unitless numbers like font-weight, missing required element IDs, and invalid tags."*
> 
> **AI Output & Resolution**:
> - Implemented `parseCssNumeric` in `src/lib/codeReconciler.ts` to properly distinguish numeric floats (e.g. `fontWeight: 700`, `opacity: 0.9`) from pixel values (`48px` $\to$ `48`).
> - Generated comprehensive Vitest suites (`codeReconciler.test.ts`) asserting that deleting required canonical IDs produces `DELETED_REQUIRED_ID` and invalid markup produces line-numbered syntax diagnostics without mutating the master model.

---

## 3. AI Suggestion Rejected & Materially Corrected

### The Rejected Suggestion
During early prototyping, the AI suggested:
1. A fallback mechanism in the AI Assistant that automatically defaulted to targeting the `"Hero Section"` if the user ran an AI prompt without selecting any elements in `Selected` mode.
2. A loose regex-based search-and-replace algorithm for applying code edits to HTML strings.

### Rationale & Resulting Change
- **Why Rejected**: Auto-defaulting to Hero violates the core product invariant of **Strict Selection Authority**. If a user enters `Selected` mode, the tool must never guess or silently expand edits to unselected elements. Furthermore, regex-based code replacement is fragile and prone to mangling nested HTML tags.
- **The Correction**:
  - Enforced a hard failure in `aiEngine.ts` returning `"NO_SELECTION: Select at least one element before requesting an AI edit in Selected mode, or switch to Full Template mode."`
  - Replaced regex replacement with a typed **AST parser and reconciler** (`parseMarkupToAst`) that compares node trees against the canonical model before generating patches.

---

## 4. How Generated Code Was Verified

1. **Automated Test Suites**:
   - Ran `npm test` across all 7 Vitest suites (38 automated tests), covering viewport override resolution, AI selection boundaries, AST reconciler diffs, atomic commit rollbacks, and per-element history recovery.
2. **Static Type Checking**:
   - Ran `npx tsc --noEmit` and `tsc -b && vite build` to ensure 100% TypeScript compile-time safety and zero build warnings.
3. **Manual & Subagent Browser Verification**:
   - Executed interactive end-to-end browser subagent journeys at 1440px desktop, 768px tablet, and 375px/320px mobile viewports.
   - Tested double-click inline text editing, color swatch picking, directional box model adjustments, code editor soft-wrapping, and per-target AI proposal review.
4. **Dependency Audit**:
   - Audited `package.json` to verify only essential, production-grade libraries are included (React 18, Tailwind CSS, Zod, Vitest).

---

## 5. Workflow Limitation & Future Improvements

- **Observed Limitation**: LLMs frequently generate naive regular expressions for markup parsing that break on edge cases (e.g. multi-line style declarations, single vs. double quotes, whitespace in CSS).
- **Future Change**: In future projects, define strict AST schema types and EBNF grammar constraints up front in the system context before asking the model to implement reconcilers or parsers.
