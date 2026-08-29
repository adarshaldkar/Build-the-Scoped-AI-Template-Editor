# Product Notes

## User

A small-business owner or designer who needs to adjust a responsive one-page website without losing control of scope, history, or recoverability.

## Safe edit definition

A safe edit has an explicit target, valid property set, valid viewport scope, current revision, and a reversible audit record. AI edits are proposals until the user accepts them.

## Selection

Stable element IDs are the authority. Multi-selection uses Shift/Ctrl/Cmd-click. The Inspector and assistant operate on the selected set.

## Scope

Desktop edits write to the base layer (`scope: all`). Tablet and Mobile edits write only to their matching override buckets. Content changes are template-wide. Structural reorders are template-wide.

## State

`TemplateModel` is the durable source of truth. Canvas, Inspector, Code, AI, and History Restore never maintain separate canonical copies.

## Responsive logic

Resolved properties are calculated from base values plus the active viewport override. Resetting an override removes only that property and allows inheritance to resume.

## AI safety

The assistant is deterministic, offline, and limited to documented scenarios. Selected mode cannot silently expand to unselected elements. Proposals capture the current revision and become stale if the document changes before acceptance.

## Review and approval

AI produces Before/After diffs. Each target in a multi-element proposal can be accepted or rejected independently. Only accepted patches are committed.

## Recovery

Undo/Redo navigates linear session snapshots. History Restore is forward-only and creates a new audit revision without deleting later history.

## Deliberate scope cuts

- No arbitrary JavaScript execution in the code editor.
- Code editing supports controlled existing template nodes rather than creating arbitrary new schema nodes.
- No freeform Figma-style absolute positioning.
- No remote AI API dependency.

## Extra feature

Context-aware quick actions surface the deterministic scenarios that make sense for the current selection and viewport. This reduces evaluation friction and helps users discover supported safe edits.

## Assumptions

The assessment evaluates the editor as a focused prototype rather than a complete commercial CMS. The NOVA template remains the canonical demo dataset.

## Next improvements

1. Add true browser-level component tests for the complete editor shell.
2. Replace remote media with locally packaged assets and add deployment smoke checks.
3. Expand code/Inspector semantics while preserving the same command and validation contracts.
