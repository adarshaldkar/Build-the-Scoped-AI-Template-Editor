# AI Usage

## Tools and models used

AI-assisted development was used for planning, code review, architecture interrogation, edge-case discovery, and implementation drafting. The final runtime does not call an external AI service. The in-product assistant is deterministic by design.

## Product planning example

AI suggestions were used to compare iframe versus inline canvas isolation and to identify the need for a single canonical model with one mutation gate. The selected design favors an inline React tree with strict `.canvas-frame` CSS scoping because selection and responsive editing remain inside one DOM tree.

## Implementation and debugging example

AI review was used to inspect the mutation pipeline and code reconciler for atomicity, stale revisions, target IDs, viewport isolation, missing IDs, invalid CSS values, and exact history restore semantics. Generated implementations were then verified with focused tests and TypeScript checks.

## AI suggestion rejected or corrected

An early design suggested automatic Hero targeting when no element was selected. This was rejected because selection must remain the authority for scoped AI edits. The final product requires an explicit target mode and rejects no-selection requests in Selected mode.

## Verification of generated code

Generated code was checked against the phase specifications, compiled with TypeScript, exercised with unit tests, and reviewed for state mutation boundaries. The reconciler and AI engine were specifically hardened so invalid input fails before reaching canonical state.

## Runtime AI limitation

The in-product assistant is intentionally not a general language model. It supports a documented set of deterministic scenarios. Unsupported instructions return a controlled error instead of inventing a transformation.
