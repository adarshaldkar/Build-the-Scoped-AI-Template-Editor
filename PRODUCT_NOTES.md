# Product Notes & System Contracts

## 1. Primary User, Job, and Safe Edit Definition

- **Primary User**: A small-business owner or independent creator adapting an existing website template without technical coding experience.
- **Job-to-be-Done**: Make visual, structural, and copy changes across desktop, tablet, and mobile devices with confidence that changes on one screen size will not corrupt other screens, AI proposals will not hallucinate or overwrite unselected content, and any single element can be restored without losing unrelated work.
- **Definition of a Safe Completed Template Edit**:
  A template edit is safe and completed when:
  1. It targets an explicit, authorized set of element IDs.
  2. It contains only permitted, schema-validated property values.
  3. It applies strictly to the intended viewport scope (`all`, `tablet`, or `mobile`).
  4. It passes two-tier validation and increments the monotonic revision clock.
  5. It appends an auditable, recoverable `RevisionEntry` to the history journal.

---

## 2. Core Entity Definitions & Boundaries

- **Element**: A modular, typed node (`ElementNode`) in the canonical tree, identified by a stable ID (`#nav`, `#hero`, `#hero-heading`), an element kind (`section`, `container`, `card`, `text`, `button`, `link`, `image`), a version integer, `baseProps`, and sparse `overrides`.
- **Group Selection**: An immutable array of stable element IDs (`selectedIds: string[]`), established via click or additive `Shift`/`Ctrl`/`Cmd`-click. The selection is the sole authority for scoped inspector changes and AI proposals.
- **Committed Step**: An atomic transaction executing through `executeCommit(model, command)`. If any part of a multi-target patch fails, the entire transaction is rejected and the revision is preserved.
- **Viewport Scope**:
  - `all` (Desktop): Writes universal styles directly to `node.baseProps`.
  - `tablet`: Writes sparse override properties to `node.overrides.tablet`.
  - `mobile`: Writes sparse override properties to `node.overrides.mobile`.
- **Editable Property Boundary**: Property modifications are strictly constrained by the `ALLOWED_PROPERTIES_BY_KIND` matrix in `validation.ts` (e.g. typography applies to text/headings/buttons, box model applies to containers/sections, width/height/radius apply to images).

---

## 3. Shared State & Responsive Cascade Resolution

- **Unified Single Source of Truth**: The canvas, docked inspector, Monaco-style code editor, and AI assistant all read from and mutate the exact same `TemplateModel` state.
- **Resolution Order**:
  Computed styles are calculated dynamically at render time using `resolveElementProps(node, activeViewport)`:
  $$\text{RenderedStyle} = \text{merge}(\text{node.baseProps}, \text{node.overrides}[\text{activeViewport}])$$
- **Non-Destructive Override Removal**: Resetting an override deletes the specific key from `node.overrides[viewport]`, allowing clean inheritance from `baseProps` to resume immediately.

---

## 4. Deterministic AI Safety & Error Handling

- **Selection Authority**: In `Selected` mode, candidate targets are strictly constrained to `selectedNodes`. Proposals cannot affect unselected elements.
- **Deterministic Semantic Parsing**: Natural language prompts and contextual quick chips are mapped to typed property transforms with zero hallucinations or external API dependencies.
- **Stale Proposal Guard**: Every proposal records `baseRevision`. If a manual edit increments the document revision while a proposal card is open, the proposal is marked `[STALE]` and applying it is safely blocked.
- **Invalid Output Handling**: Any unrecognized instruction returns a clean non-destructive message: *"Could not determine valid stylistic changes for this prompt. Try specifying colors, sizes, weights, or using quick action chips."*

---

## 5. Review, Partial Acceptance & Granular Recovery Policy

- **Draft vs. Canonical Isolation**: AI outputs and code editor drafts remain in isolated component state until explicit approval.
- **Partial Acceptance**: Every diff in a multi-element proposal card features individual `[Accept]` and `[Reject]` buttons. The user can accept changes for button A while rejecting changes for button B; only accepted targets are passed to `buildAcceptedProposalCommand`.
- **Independent Per-Element Recovery**:
  - **Undo/Redo (`⌘Z` / `⌘⇧Z`)**: Session-level linear snapshot navigation.
  - **History Restore Drawer (`⌘H`)**: Non-destructive, forward-only recovery. Users can select any historical revision of a specific element and restore its properties without rolling back subsequent edits to other sections.

---

## 6. One Additional Capability Chosen & Validation Evidence

### The Capability: Studio Precision Controls & Focus Mode
1. **Studio Color Picker with Hex Validation**: Clickable native swatch chips, formatted `#HEX` text inputs with auto-validation, and an 8-color curated studio palette (`#18181B`, `#3F3F46`, `#71717A`, `#FFFFFF`, `#FAF9F6`, `#F4F4F5`, `#2563EB`, `#059669`).
2. **Directional Box Model Cards**: Dedicated 2x2 cards for **Padding (px)** and **Margin (px)** (`Top`, `Bottom`, `Left`, `Right`).
3. **Collapsible Studio Toggles**: `⌘B` (Layers) and `⌘I` (Inspector) shortcuts and TopBar toggles for a distraction-free, 100% full-width canvas workspace.

### Validation Evidence & Testing Strategy
- **Quantitative Metrics**:
  - **Task Completion Time**: Measure time taken to customize template theme colors and padding (target: 40% reduction vs. unstructured dropdowns).
  - **Error Rate**: Measure invalid hex input submissions and accidental cross-viewport regressions (target: 0% due to validation and reset badges).
- **Qualitative Validation**: Moderated usability tests with small-business owners evaluating visual clarity, canvas focus, and control responsiveness.

---

## 7. Cuts, Assumptions & Priority Improvements

### Deliberate Scope Cuts
1. **No Unsafe `<script>` Execution**: Code editor evaluates safe HTML/CSS AST reconciliations without executing dynamic JavaScript.
2. **No Freeform Coordinate Dragging**: Elements adhere to responsive flexbox/box-model flow to prevent broken responsive layouts.
3. **No External AI Latency/Cost**: Uses a fast, deterministic local NLP parser.

### Assumptions
- The assessment evaluates an offline, high-integrity studio prototype.
- The `NOVA Studio` template serves as the canonical landing page template.

### Next Three Improvements (In Priority Order)
1. **Local Media Asset Manager**: Add an integrated asset library for uploading and swapping local images directly within the editor.
2. **Drag-and-Drop Visual Reordering**: Visual drag handles in the Layers panel and on canvas for reordering sections and container children.
3. **Multi-Page Template Support**: Extend `TemplateModel` schema to support multi-page site navigation with shared header/footer components.
