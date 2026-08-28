# Phase 6: Linear Undo/Redo & Granular History Drawer Specification
**Document Name**: `phase_6.md`  
**Status**: Approved & Locked Architecture Specification  
**Prerequisites**: Phase 0 (Data Models), Phase 1 (Transactional Commit Pipeline), Phase 2 (Code Reconciler), Phase 3 (AI Assistant), Phase 4 (Visual Canvas), Phase 5 (Inspector Panel)  
**Downstream Dependents**: Phase 7 (End-to-End App Assembly & Production Polish)  
**Strict Rule**: No emojis anywhere; clean typographic badges only.

---

## 1. Executive Mission & Architectural Invariants

Phase 6 builds the **Dual Recovery System** of Scope. It provides two complementary, non-conflicting rollback mechanisms:
1. **Global Linear Undo/Redo (`⌘Z` / `⌘⇧Z`)**: Instant full-state time travel.
2. **Granular Revision History Drawer (`HistoryDrawer.tsx`)**: An auditable timeline of element-level changes with non-destructive **forward-only element restores**.

```mermaid
graph TD
    subgraph User Mutation Events
        MUT[Mutation: Canvas / Inspector / Code / AI]
    end

    subgraph Phase 1 Commit Gate
        COM[executeCommit Pipeline]
        RES[CommitResult: nextModel + RevisionEntry[]]
    end

    subgraph Mechanism A: Linear Snapshot Stacks
        UND[undoStack: TemplateModel[] max 50]
        RED[redoStack: TemplateModel[]]
        CMD_Z[Cmd+Z -> Pop Undo -> Push Redo -> Restore Previous Model]
        CMD_SZ[Cmd+Shift+Z -> Pop Redo -> Push Undo -> Restore Next Model]
    end

    subgraph Mechanism B: Auditable Forward History
        HIST[history: RevisionEntry[] - Persistent Array]
        FILT[Filter by: Selected Element / Kind / Scope]
        REST[1-Click Restore: Constructs Forward EditCommand source = 'history_restore']
    end

    MUT --> COM
    COM --> RES
    RES -->|Save Prev Model| UND
    RES -->|Clear Redo| RED
    RES -->|Append Entries| HIST

    CMD_Z --> UND
    CMD_SZ --> RED

    HIST --> FILT
    FILT --> REST
    REST -->|New Forward Commit| COM
```

### The 6 Ironclad Invariants of Phase 6:
1. **Bounded Snapshot Stacks**:
   - The linear `undoStack` is capped at **50 snapshots** to prevent memory leaks during long editing sessions.
2. **Undo/Redo Navigation Does Not Mutate Audit History**:
   - Pressing Undo (`⌘Z`) or Redo (`⌘⇧Z`) moves through in-memory snapshots without appending new `RevisionEntry` audit records.
3. **New Commit Clears Redo Stack**:
   - Any new edit (or history restore) performed after an Undo clears `redoStack` and pushes the current model to `undoStack`.
4. **Non-Destructive Forward Element Restores**:
   - Restoring an element's historical property from the History Drawer **never** destroys the linear undo/redo stack, rewinds the clock, or wipes subsequent history.
   - Instead, it constructs a new `EditCommand` with `source: "history_restore"`, applying that specific target's historical state as a new forward revision.
5. **Strict Isolation on History Restores**:
   - Restoring a mobile override from history only touches `overrides.mobile` of that target element; base styles and other elements remain strictly untouched.
6. **Persistence Synchronization**:
   - Both the canonical `TemplateModel` and the `RevisionEntry[]` array are losslessly serialized and restored via `storage.ts`.

---

## 2. File Organization & Boundaries

Phase 6 introduces 2 core modules and an automated test suite:

```
src/
├── lib/
│   ├── historyManager.ts       # Stack managers, filter helpers, and forward restore command generator
│   └── __tests__/
│       └── history.test.ts     # Automated test suite (12 tests) covering undo/redo, stack limits, and restores
└── components/
    └── HistoryDrawer.tsx       # Slide-over audit drawer with filter tabs, before/after diffs, and restore buttons
```

---

## 3. History Drawer Specifications (`HistoryDrawer.tsx`)

### 3.1 Drawer Header & Filter Controls
- **Title**: `AUDIT HISTORY` with revision count badge (`Total: 14 revisions`).
- **Filter Tabs**:
  - `[All Changes]`
  - `[Selected Element Only]` (active when an element is selected on canvas, matching by `elementId`).
  - `[AI Assistant Only]` (filters for `kind === 'ai'`).
  - `[Manual Edits]` (filters for `kind === 'manual'`).

### 3.2 History Item Presentation
Each timeline entry displays:
- **Timestamp & Tag**: `17:42:05` • `[AI Assistant]` / `[Manual: Inspector]` / `[Canvas Text]`.
- **Target Element**: `Hero Heading • text`.
- **Scope Badge**: `[Scope: All]` / `[Scope: Mobile]`.
- **Before $\to$ After Diff**:
  - Content: `"Original copy" → "Punchier headline"`
  - Props: `fontSize: 56px → 64px`, `color: #18181B → #FFFFFF`
  - Reorder: `Services: Position 3 → 2`
- **Restore Action**: Subtle `[Restore]` button that dispatches a forward commit restoring `beforeState`.

---

## 4. Forward Restore Command Contract

When a user clicks `Restore` on a history entry:
```typescript
export function createForwardRestoreCommand(
  entry: RevisionEntry,
  currentModel: TemplateModel
): EditCommand {
  const isContent = entry.propertyKey === "content" || entry.beforeState.content !== undefined;
  const isStyle = entry.propertyKey === "style" || entry.propertyKey === "all" || entry.beforeState.props !== undefined;

  return {
    commandId: `cmd_restore_${Date.now()}`,
    source: "history_restore",
    targetIds: [entry.elementId],
    scope: entry.scope,
    baseRevision: currentModel.revision,
    changes: {
      patches: {
        [entry.elementId]: {
          content: isContent ? entry.beforeState.content : undefined,
          styleProps: isStyle ? (entry.beforeState.props as Partial<ElementStyleProps>) : undefined,
        },
      },
    },
    metadata: {
      description: `Restore ${entry.elementName} (${entry.propertyKey}) to revision ${entry.globalRevision - 1}`,
    },
  };
}
```

---

## 5. Automated Test Matrix for Phase 6 (`history.test.ts`)

```typescript
describe("Phase 6: Linear Undo/Redo & Granular History Drawer Invariants", () => {
  it("1. [ACCEPT] linear undo restores previous model state");
  it("2. [ACCEPT] linear redo reapplies undone model state");
  it("3. [ACCEPT] new commit clears redo stack and appends to undo stack");
  it("4. [ACCEPT] undo stack caps at 50 snapshots");
  it("5. [ISOLATION] forward restore changes only target element and preserves later history");
  it("6. [ISOLATION] mobile restore changes only mobile override without touching desktop baseProps");
  it("7. [ACCEPT] restore creates new forward history entry");
  it("8. [ACCEPT] undo and redo do not generate new history audit entries");
  it("9. [ACCEPT] undo followed by new edit clears redo stack completely");
  it("10. [ACCEPT] history filters correctly by selected element ID");
  it("11. [ACCEPT] history filters correctly by kind (ai vs manual)");
  it("12. [ACCEPT] structural reorder restore restores sibling order");
});
```

---

*This document serves as the exact specification for Phase 6.*
