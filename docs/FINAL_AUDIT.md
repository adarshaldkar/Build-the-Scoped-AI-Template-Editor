# Final Hardening Audit

This document records the high-risk issues identified during review of the earlier implementation and the protections used in this rebuild.

## Removed or hardened failure patterns

### Template-specific logic

Business logic no longer depends on a list of individual element IDs. Scenario discovery uses node kind, semantic tags, and controlled scenario semantics. Seed data still contains stable IDs because IDs are the canonical identity required by the assessment.

### Selection authority

The application stores `selectedIds` and supports additive Shift/Ctrl/Cmd selection. The assistant in Selected mode receives only the selected nodes and rejects missing selection instead of inventing a target.

### AI deterministic behavior

Proposal IDs and command IDs are derived from the current revision, target IDs, and normalized prompt. No random values are used in the runtime transformation path.

### Multi-target edits

Commands use per-target patches. This avoids the earlier single `combinedContent` limitation and permits different content or style changes on different selected elements.

### Exact history restore

Property restores explicitly remove keys that did not exist in the historical snapshot. Structure restores can carry an exact sibling order rather than attempting only an inverse move against an unrelated later state.

### Responsive isolation

Desktop uses the base layer. Tablet and Mobile write only to their matching override buckets. Content and structure are global operations.

### Code safety

The code editor uses a controlled HTML subset. Missing IDs, unknown IDs, duplicate IDs, incompatible tags, unsupported attributes, invalid CSS properties, malformed values, missing image sources, and deleted canonical IDs are rejected before commit.

### Draft safety

Code and inline text editing use a draft buffer. Canonical state is updated only after validation and an explicit commit boundary. Escape/Cancel discards the draft.

### Inspector input behavior

Text and numeric inputs are drafted locally and committed on blur/Enter. Slider changes update the draft and commit on interaction end rather than every pointer movement.

### Persistence safety

Storage is loaded as one envelope. The model is validated before use and malformed/corrupt/unknown-version state falls back to the canonical template.

## Known deliberate scope limits

- The code surface is controlled HTML, not arbitrary JavaScript or JSX execution.
- Code editing changes existing canonical nodes rather than creating arbitrary new schema nodes.
- Freeform Figma-style X/Y positioning is not implemented; the layout model is structured Flex/Grid/Box properties.
- The embedded assistant is deterministic and offline; it is not a general-purpose language model.
- Browser-level component tests remain a final verification concern because the test stack in the source archive is logic-focused.

## Final manual smoke flow

1. Load NOVA.
2. Select one heading.
3. Add a second element with Shift/Ctrl/Cmd click.
4. Change a compatible style through Inspector.
5. Switch to Mobile and create an override.
6. Switch back to Desktop and confirm no contamination.
7. Open Code in Selected mode and make a content change.
8. Apply the code change.
9. Generate an AI proposal.
10. Accept one target and reject another in a multi-target proposal.
11. Create a later edit and verify an earlier proposal becomes stale.
12. Open History and restore one property.
13. Restore a structural order and verify exact ordering.
14. Undo and Redo.
15. Refresh and confirm model/history persistence.
16. Reset the project.
