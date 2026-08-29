# Final Submission Checklist

## Functional requirements

- One responsive NOVA one-page template with stable unique IDs.
- Canvas supports single and additive multi-selection.
- Desktop, Tablet, and Mobile preview modes.
- Manual content/style/layout edits route through `executeCommit()`.
- Code editing is controlled, ID-safe, and explicit-apply.
- Deterministic AI proposal generation with explicit target mode.
- Multi-target AI proposals allow independent accept/reject decisions.
- Stale proposals are blocked from commit.
- History Restore is forward-only and target-specific.
- Undo/Redo uses bounded session snapshots.
- Reset returns to canonical template and clears session history.
- LocalStorage restores the model and audit timeline.

## Quality requirements

- No direct TemplateModel mutation from UI components.
- No runtime AI/API dependency.
- No arbitrary JavaScript execution through the code surface.
- No template-specific target IDs inside generic mutation infrastructure.
- Unsupported prompts and invalid payloads fail safely.
- Invalid code does not mutate canonical state.
- Viewport overrides remain isolated.
- Restore operations are exact for style keys and structural order.

## Verification commands

```bash
npm install
npm test
npx tsc --noEmit
npm run build
npm run preview
```

## Manual browser smoke test

Run the full cross-feature flow described in `FINAL_AUDIT.md`. Verify keyboard behavior in actual browser controls and text/code inputs, inspect all three viewport modes, create and reset a mobile override, verify an AI stale proposal, restore a historical style and structure state, and refresh after a successful edit.

## Submission files

- Root `README.md`
- `AI_USAGE.md`
- `PRODUCT_NOTES.md`
- `docs/`
- `scope-editor/`

Do not include `node_modules/`, local `.env` secrets, IDE cache folders, or temporary build logs in the submission archive.
