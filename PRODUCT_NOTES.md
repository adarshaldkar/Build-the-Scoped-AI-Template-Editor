# Product Notes & Decision Rationale

## 1. Primary User & Problem Statement

**User**: A non-technical small-business owner or independent creator adapting a responsive website template.

**Problem**: Traditional website builders are fragile and risky:
- Making a change on mobile often silently breaks the desktop layout.
- AI features in conventional tools act as "black box" code generators that blindly overwrite entire files or introduce breaking syntax errors.
- Undoing a single unwanted change requires rolling back the entire document history, wiping out unrelated, hours-long manual edits.

Scope eliminates these pain points through **deterministic transactional boundaries**, **strict viewport scope isolation**, and **per-element history recovery**.

---

## 2. Safe Edit Definition & Core Contracts

1. **Selection Authority**: Selection is represented as stable, immutable element IDs (`#hero`, `#hero-heading`, etc.). In `Selected` mode, AI proposals and code edits are strictly quarantined to the targeted IDs.
2. **Deterministic Commit Pipeline**: All edits funnel through `executeCommit()`, which performs runtime Zod validation and business invariant checks before creating an immutable snapshot.
3. **Pure Viewport Cascading**:
   - `desktop` writes to `baseProps` (universal base styles).
   - `tablet` writes to `overrides.tablet`.
   - `mobile` writes to `overrides.mobile`.
   - Modifying a mobile property never mutates or pollutes desktop styles.
4. **Draft vs. Canonical Isolation**: AI output is strictly a `Proposal`, never an automatic overwrite. Proposals present before/after diffs with per-target `[Accept]` and `[Reject]` controls.
5. **Non-Destructive Dual Recovery**:
   - Linear session Undo/Redo (`⌘Z` / `⌘⇧Z`).
   - Granular History Restore: Rolls back a single element's property state to any prior revision without reverting edits made to other sections.

---

## 3. One Product Decision of Our Own

### The User Problem
In visual website editors, styling and spacing controls are often cramped or generic:
1. Standard `<input type="color">` pickers look unstyled, lack design swatches, and don't provide quick copyable `#HEX` format validation.
2. Padding and margin controls are frequently presented as a single unstructured list of inputs, making it easy for users to confuse Top/Bottom with Left/Right spacing.
3. On narrow screens (laptops or mobile), sidebars permanently occupy valuable screen real estate, compressing the visual canvas.

### The Decision & Solution
We engineered **Studio Focus Mode & Precision Surface Controls**:
1. **Studio Color Picker with Hex Validation**: Clickable native swatch chips, formatted `#HEX` text inputs with auto-validation, and an 8-color curated studio palette (`#18181B`, `#3F3F46`, `#71717A`, `#FFFFFF`, `#FAF9F6`, `#F4F4F5`, `#2563EB`, `#059669`).
2. **Directional Box Model Cards**: Structured, 2x2 directional cards for **Padding (px)** and **Margin (px)** with clear `Top`, `Bottom`, `Left`, and `Right` labels.
3. **Collapsible Sidebar Toggles**: `⌘B` (Layers) and `⌘I` (Inspector) keyboard shortcuts and TopBar toggle buttons that smoothly collapse sidebars to grant a distraction-free, 100% full-width canvas workspace.

### How to Test Whether It Helped
1. **Quantitative Usability Metrics**:
   - **Task Completion Time**: Measure the time required for non-technical users to adjust top/bottom padding and change text colors (hypothesizing a 40% reduction in time due to grouped directional cards and swatches).
   - **Error Rate**: Track invalid color inputs and accidental override regressions before vs. after implementing hex validation and explicit override reset badges.
2. **Qualitative User Feedback**:
   - Conduct moderated A/B testing with small-business owners asking them to customize the NOVA Studio landing page. Survey satisfaction on visual clarity, canvas focus, and control responsiveness.

---

## 4. Deliberate Scope Cuts

- **No Remote AI API Dependency**: The AI assistant uses a deterministic local NLP parsing engine and typed scenario transforms, guaranteeing zero hallucinations, zero latency, and zero token costs.
- **No Arbitrary Script Execution**: The Monaco-style code editor parses HTML/CSS into a safe AST reconciler without executing unsafe `<script>` tags or eval.
- **No Freeform Absolute Drag Coordinates**: Elements follow semantic document flow (flexbox and box model) to ensure responsive adaptability across viewports.
