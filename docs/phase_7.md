# Phase 7: End-to-End App Assembly, Browser Verification & Documentation Specification
**Document Name**: `phase_7.md`  
**Status**: Approved & Locked Architecture Specification  
**Prerequisites**: Phase 0 to Phase 6 (All Core Modules Implemented & Tested)  
**Downstream Deliverables**: Production Build (`dist/`), GitHub Repository (`main`), Comprehensive README.md  
**Strict Rule**: No emojis anywhere; clean typographic badges only.

---

## 1. Executive Mission & Architectural Invariants

Phase 7 brings together every modular layer constructed in Phases 0–6 into a unified, high-performance web application. It integrates the TopBar, Visual Canvas, Docked Inspector Sidebar, Monaco Code Editor, Deterministic AI Assistant, and History Drawer into `App.tsx` with prioritized keyboard shortcuts, shortcut conflict guards, session-only undo stacks, lossless LocalStorage persistence, and a verified production build.

```mermaid
graph TD
    subgraph App Shell Architecture (App.tsx)
        TOP[TopBar.tsx: Brand + Viewport + Undo/Redo + Tools]
        MAIN[Main Workspace Layout]
        CANVAS[CanvasFrame.tsx + TemplateRenderer.tsx]
        INSP[Inspector.tsx: Docked Right Sidebar]
    end

    subgraph Modal & Drawer Overlays
        CODE[CodeEditor.tsx: Monaco-Style Markup Modal]
        AI[AiAssistant.tsx + ProposalCard.tsx: Bottom Command Surface]
        HIST[HistoryDrawer.tsx: Audit History Slide-over]
    end

    subgraph State & Persistence Foundation
        STATE[Canonical State: TemplateModel + RevisionEntry[]]
        STORE[storage.ts: LocalStorage with Fallback]
        STACK[undoStack: max 50 session snapshots + redoStack]
    end

    STATE --> STORE
    STATE --> STACK
    STATE --> CANVAS
    STATE --> INSP
    STATE --> CODE
    STATE --> AI
    STATE --> HIST

    TOP --> MAIN
    MAIN --> CANVAS
    MAIN --> INSP
```

### The 6 Ironclad Invariants of Phase 7:
1. **Docked Right Inspector & Single Transaction Entrypoint**:
   - The workspace layout features a centered Visual Canvas with a permanently docked right-hand Inspector panel (`w-80 border-l border-zinc-800`).
   - All mutations flow through `executeCommit(model, command)`.
2. **Prioritized Escape Key Stack**:
   - `Escape` evaluates in strict descending priority:
     1. Active inline text edit $\to$ cancels edit without commit.
     2. Code Editor open $\to$ closes Code modal.
     3. History Drawer open $\to$ closes History drawer.
     4. AI Assistant open $\to$ closes AI assistant.
     5. Canvas element selected $\to$ clears canvas selection.
3. **Shortcut Conflict Protection**:
   - Global application shortcuts (`⌘Z`, `⌘⇧Z`) are bypassed when focus is inside `<input>`, `<textarea>`, or active `contentEditable` elements so native text input is never hijacked.
4. **Session-Only Undo/Redo & Clean Persistence**:
   - `TemplateModel` and `RevisionEntry[]` are persisted to LocalStorage on state transition.
   - `undoStack` and `redoStack` remain clean in-memory session state (`[]` on reload).
5. **Cross-Feature Integration Coverage**:
   - A dedicated `integration.test.ts` suite verifies the complete cross-feature lifecycle (Canvas $\to$ Inspector $\to$ Mobile Override $\to$ Code Editor $\to$ AI Proposal $\to$ History Restore $\to$ Undo/Redo $\to$ Persistence).
6. **Production Build Quality**:
   - `npx tsc --noEmit` must pass with 0 errors.
   - All automated unit and integration tests pass.
   - `npm run build` compiles `dist/` bundle cleanly without warnings.

---

## 2. File Organization

```
scope-editor/
├── index.html                   # HTML entrypoint with font preconnects and responsive viewport meta
├── src/
│   ├── index.css                # Global design system, typography tokens, custom scrollbars
│   ├── main.tsx                 # React DOM mount point
│   ├── App.tsx                  # Master application shell integrating all modules
│   ├── components/
│   │   ├── TopBar.tsx           # Header bar with viewport switcher and action buttons
│   │   ├── CanvasFrame.tsx      # Responsive device frame and canvas container
│   │   ├── TemplateRenderer.tsx # Recursive visual renderer with inline editing
│   │   ├── Inspector.tsx        # Right property inspector with viewport overrides
│   │   ├── CodeEditor.tsx       # Monaco dark code editor modal
│   │   ├── AiAssistant.tsx      # AI assistant command drawer
│   │   ├── ProposalCard.tsx     # Before/after diff review card
│   │   ├── HistoryDrawer.tsx    # Slide-over audit history drawer
│   │   └── icons.tsx            # Handcrafted native SVG micro-icons
│   └── lib/
│       ├── __tests__/
│       │   └── integration.test.ts # End-to-end integration smoke test suite
│       └── [core modules]
└── README.md                    # Comprehensive repository documentation
```

---

*This document serves as the exact specification for executing Phase 7.*
