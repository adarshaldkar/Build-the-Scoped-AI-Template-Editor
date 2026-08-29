# Product Notes & System Contracts

## 1. Primary User and Job

### Primary User
The primary user is a small-business owner, independent creator, or non-specialist who needs to customize an existing website template without becoming responsible for low-level layout and responsive CSS details.

### Job to Be Done
Help the user make visual, structural, content, and responsive changes to a website template while preserving control over what changes, where they apply, and what can be recovered later.

A safe editing experience makes it possible to:
- Select one or more elements explicitly.
- Edit through the Canvas, Inspector, or Code surface.
- Request deterministic AI demo changes within the current selection and viewport scope.
- Review AI changes before they affect canonical state.
- Make one-viewport changes without unintentionally changing other viewports.
- Undo sequential work.
- Restore a prior state for one element and scope without rewinding unrelated work.
- Refresh the application without losing the current template or audit history.

### Definition of a Safe Completed Template Edit
An edit is considered safely completed when:
1. The affected element IDs are explicitly known and authorized.
2. The requested properties are part of the allowed editable-property boundary.
3. Values pass runtime schema and business-rule validation.
4. The requested viewport scope is respected.
5. The mutation passes through the unified commit pipeline.
6. The canonical state is updated atomically and immutably.
7. The resulting revision is recorded in the audit history.
8. A failed or stale operation leaves the last valid canonical state unchanged.

---

## 2. Core Entities and Editing Boundaries

### Element
An element is a typed node in the canonical `TemplateModel` tree with:
- A stable `id`.
- A human-readable `name`.
- An explicit `kind`.
- Editable `content` where applicable.
- Shared/base style properties (`baseProps`).
- Sparse viewport overrides (`overrides.tablet`, `overrides.mobile`).
- A `version` counter.
- Optional `children`.

> **Identity Rule**: Element identity is based on the stable model ID, not on CSS classes, DOM position, text matching, or visual coordinates.

### Group Selection
A group selection is a set of stable element IDs selected by the user. Selection may be created through:
- Normal click for a single target.
- Additive `Shift` / `Ctrl` / `Cmd` interaction for multiple targets.

Each selected ID remains an independent target. A multi-element operation does not make the elements one combined state object.

### Committed Step
A committed step is one validated atomic state transition initiated through:
```typescript
executeCommit(model: TemplateModel, command: EditCommand): CommitResult
```
The command identifies the source, target IDs, viewport scope, base revision, and typed changes. For a multi-target operation, validation occurs before mutation so one invalid target cannot partially modify the valid targets.

### Viewport Scope
The editor distinguishes the shared/base layer from viewport-specific overrides:
- `all`: Writes shared/base values that apply universally across views.
- `desktop`: The desktop editor view reads the shared/base layer; ordinary Inspector editing on Desktop uses `all`.
- `tablet`: Writes strictly to `overrides.tablet`.
- `mobile`: Writes strictly to `overrides.mobile`.

A viewport-specific edit must never modify another viewport's override or the shared/base value.

### Editable Property Boundary
Only properties defined by the application's validation and applicability rules are editable:
- **Text, button, and link elements**: Typography, color, spacing, and applicable dimensions.
- **Sections, containers, and cards**: Layout, spacing, dimensions, background, and applicable border/appearance properties.
- **Images**: Applicable dimensions, spacing, radius, and presentation properties.

Unsupported or incompatible properties are rejected before canonical state mutation.

---

## 3. Shared State and Responsive Resolution

### Single Source of Truth
The `TemplateModel` is the canonical source of truth. Canvas, Inspector, Code Editor, AI Assistant, and History Restore all operate on the same model and share the exact same commit boundary. No surface is allowed to maintain an independent canonical copy of the template.

### Resolution Order
The renderer computes the active value at render time:
$$\text{ResolvedProperty} = \text{ViewportOverride}[\text{activeViewport}] \mathbin{??} \text{BaseProperty} \mathbin{??} \text{DefaultToken}$$

This means:
1. Shared/base values apply by default.
2. A sparse tablet override affects only tablet.
3. A sparse mobile override affects only mobile.
4. Removing an override restores inheritance from the base value.

### Override Reset Semantics
Resetting an override removes only the selected property key from that viewport's sparse override record.

**Example**:
- **Before**:
  `base.fontSize = 56`, `mobile.fontSize = 34`, `mobile.paddingTop = 24`
- **Action**: Reset `mobile.fontSize`
- **After**:
  `base.fontSize = 56`, `mobile.paddingTop = 24`

The reset must not erase unrelated overrides.

---

## 4. Deterministic AI Safety Contract

The in-app assistant is a deterministic demonstration engine, not a live autonomous model.

- **Selection Authority**: In `Selected` mode, the selected element IDs are authoritative. The assistant must not silently expand a proposal to unselected elements. For a multi-selection, every returned proposal item must reference one of the currently selected IDs.
- **Viewport Authority**: The assistant receives the current viewport/scope and must generate changes that are valid for that scope. A responsive request such as *"make the hero smaller on mobile"* produces a mobile-scoped change rather than rewriting shared/base values.
- **Deterministic Scenario Engine**: Prompts and quick actions map to predefined editing scenarios (content rewrite, typography adjustment, color/theme change, responsive layout adjustment, synchronized multi-element editing, structural reorder). The same canonical state, selection, viewport scope, and supported instruction produce the same type of proposal.
- **Safe Failure**: Unsupported instructions, invalid targets, forbidden fields, invalid payloads, and stale proposals fail safely without modifying the canvas or canonical model.
- **Stale Proposals**: Every pending AI proposal records the document revision it was generated from. If the underlying model changes before acceptance (`proposal.baseRevision !== currentModel.revision`), the proposal is treated as stale and cannot be committed.

---

## 5. Review, Partial Acceptance, and Recovery

- **Draft vs. Canonical State**: AI proposals and Code Editor drafts are temporary review state. They do not change the canonical model until the user explicitly applies or accepts them.
- **Partial Acceptance**: A multi-element AI request may produce several independent proposal items. Each target has its own status (`pending`, `accepted`, `rejected`, `invalid`, `restored`). Accepting one element must not force acceptance of another; only accepted, valid items are converted into the final commit command.
- **Code Review**: Valid code changes update the shared canonical state through the same commit boundary. Invalid code is rejected with a diagnostic, leaving the last valid state untouched.
- **Undo / Redo**: Linear session-level navigation through committed document snapshots (`⌘Z` / `⌘⇧Z`). A new commit after Undo clears the Redo path.
- **Granular History Restore**: Non-destructive and forward-only. Restoring a historical change identifies one element and its historical viewport scope, reconstructs the prior property state, creates a new `history_restore` commit, changes only the intended target and scope, and preserves later history and unrelated elements.

---

## 6. Additional Product Capability

### Capability: Studio Focus Mode & Precision Surface Controls
The chosen additional capability is a distraction-free **Focus Mode** paired with **Precision Surface Controls** for visual editing.

### User Problem
A visual editor can become crowded and error-prone when the user is working on the canvas while Layers, Inspector, and other side panels remain open. Furthermore, generic color pickers lack swatches and unstructured spacing fields lead to accidental misconfiguration.

### Why This Capability Was Chosen
- **Collapsible Sidebars (`⌘B` / `⌘I`)**: Lets the user temporarily collapse side panels and give the canvas the maximum available workspace without changing canonical document state.
- **Studio Color Picker**: Features native swatch chips, formatted `#HEX` validation, and an 8-color studio palette.
- **Directional Box Model Cards**: 2x2 structured cards for **Padding (px)** and **Margin (px)** (`Top`, `Bottom`, `Left`, `Right`).

### Expected Benefit
- Less visual distraction during design review.
- More usable canvas area.
- Easier inspection of responsive layouts.
- Faster, error-free visual adjustments.

### Validation Plan
Evaluate Focus Mode with a usability comparison:
1. Measure time to complete a representative visual styling task with the normal workspace.
2. Measure the same task with Focus Mode.
3. Record accidental clicks, panel toggles, and task errors.
4. Collect qualitative feedback about whether the canvas is easier to inspect.
5. Use baseline measurements to determine meaningful usability improvement.

---

## 7. Deliberate Scope Cuts

1. **No Dynamic JavaScript Execution in Code Surface**: The code surface is limited to safe, structured HTML/CSS-style edits that reconcile to the typed model. Arbitrary `<script>` execution is intentionally out of scope.
2. **No Freeform X/Y Layout Editing**: The editor uses structured layout and box-model properties rather than unrestricted absolute coordinates, keeping responsive behavior robust across viewports.
3. **No Runtime External LLM Dependency**: The in-app AI demonstration uses deterministic local scenario rules without external model requests, API keys, network calls, or per-edit inference costs.

---

## 8. Assumptions

- **NOVA Studio** is the canonical assessment template used to demonstrate the editor.
- Stable element IDs are part of the model contract and are preserved across Canvas, Code, Inspector, and AI operations.
- The browser is the execution environment for the deployed application.
- Responsive preview and editor-shell responsiveness are separate concerns: the template has explicit Desktop/Tablet/Mobile preview modes, while the surrounding editor layout adapts independently at narrower browser widths down to 320px.
- Local persistence is intended for the prototype workflow and uses the browser's `localStorage` mechanism.

---

## 9. Next Three Improvements

1. **Local Media Asset Manager**: Allow users to upload, inspect, replace, and reuse local images without relying on remote media URLs.
2. **Drag-and-Drop Structural Reordering**: Add visual drag handles to Layers and eligible canvas sections so users can reorder content directly while still using the same validated structural commit pipeline.
3. **Multi-Page Templates**: Extend the template model to support several pages with shared navigation/footer components and page-level history.

---

## 10. Product Contract Summary

The core product rules are intentionally simple:
1. **Selection is authority.**
2. **Base values are shared; viewport overrides are isolated.**
3. **AI proposes; the user approves.**
4. **Every mutation crosses one validation and commit boundary.**
5. **Invalid or stale operations do not damage the last valid state.**
6. **Undo is linear; History Restore is forward-only.**
7. **The audit trail explains what changed and where.**

These rules are the basis for the Scope editor's interaction model and are the criteria used when evaluating future features.
