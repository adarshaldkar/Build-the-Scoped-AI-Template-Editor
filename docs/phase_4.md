# Phase 4: Visual Canvas, Viewport Switcher & Template Renderer Specification
**Document Name**: `phase_4.md`  
**Status**: Approved & Locked Architecture Specification  
**Prerequisites**: Phase 0 (Data Models), Phase 1 (Transactional Commit Pipeline), Phase 2 (Code Reconciler), Phase 3 (AI Assistant)  
**Downstream Dependents**: Phase 5 (Inspector Panel Overrides), Phase 6 (Undo/Redo History Drawer)  
**Strict Rule**: No emojis anywhere; clean typographic badges only.

---

## 1. Executive Mission & Architectural Invariants

Phase 4 builds the **interactive Visual Canvas, responsive Viewport Switcher, and recursive Template Renderer**. It transforms the canonical `TemplateModel` into a high-fidelity visual web page with live viewport simulation, instant click selection, hover bounding boxes, and inline direct text editing routed strictly through the Phase 1 commit pipeline.

```mermaid
graph TD
    subgraph Canonical State Store
        TM[TemplateModel - Durable Source of Truth]
        REV[Model Revision & Updated Nodes]
    end

    subgraph Phase 4 Canvas Engine
        VP[Viewport Switcher: Desktop / Tablet / Mobile]
        RES[resolveElementProps(node, activeViewport)]
        REN[Recursive TemplateRenderer: Tree -> React DOM]
        SEL[Direct Selection Ring & Understated Label]
        INL[Inline Text Editor: Double-Click ContentEditable]
    end

    subgraph User Visual Interaction
        CAN[CanvasFrame: Device Bezel & Viewport Constraints]
        CLK[Click Element -> Select ID]
        DBL[Double-Click -> Inline Edit Text]
        REO[Move Up/Down -> Sibling Reorder]
    end

    subgraph Phase 1 Processing Gate
        COM[executeCommit Pipeline: source = canvas]
    end

    TM --> RES
    VP --> RES
    RES --> REN
    REN --> CAN
    CAN --> CLK
    CAN --> DBL
    CAN --> REO

    CLK --> SEL
    DBL --> INL
    INL -->|Blur / Enter| COM
    REO -->|Move Section| COM
    COM -->|Commit Success| TM
```

### The 5 Ironclad Invariants of Phase 4:
1. **Inline React Tree Isolation (No Iframe)**:
   - The canvas renders as a direct recursive React component tree inside a strictly namespaced `.canvas-frame` wrapper.
   - Global stylesheet rules inside the editor shell do not leak into canvas typography or layouts.
2. **Pure Viewport Resolution Cascade**:
   - Every node rendered on canvas evaluates its styles dynamically via `resolveElementProps(node, activeViewport)`.
   - Desktop renders `baseProps` + `overrides.desktop`.
   - Tablet renders `baseProps` + `overrides.tablet`.
   - Mobile renders `baseProps` + `overrides.mobile`.
3. **Interactive Click Trapping & Selection Authority**:
   - In editor mode, all native navigation (`<a href="...">`) and native form submissions inside the canvas are trapped (`e.preventDefault()`). Clicking an element selects its canonical ID.
4. **Zero Silent Mutation on Inline Text Editing**:
   - Double-clicking allows live typing directly on the element via `contentEditable`.
   - Exiting edit mode (on `Blur` or `Enter` for short text) checks if content actually changed. If changed, constructs an `EditCommand` (`source: "canvas"`, `scope: "all"`, `changes: { content: newText }`) and commits through `executeCommit`.
   - Pressing `Escape` cancels inline edit and reverts to original content with zero commit.
5. **DOM-to-Node Contract (`data-node-id`)**:
   - Every rendered DOM element must have `data-node-id={node.id}` and `data-node-kind={node.kind}`, enabling single-pass event delegation for hover and selection.

---

## 2. File Organization & Boundaries

Phase 4 introduces 2 core UI components and an automated test suite:

```
src/
├── components/
│   ├── CanvasFrame.tsx          # Viewport container, device bezel, background grid, and scroll frame
│   └── TemplateRenderer.tsx     # Recursive pure React renderer mapping ElementNodes to DOM elements with selection and inline edit
└── lib/
    └── __tests__/
        └── canvasRenderer.test.ts # Automated test suite for viewport cascading, selection, inline edits, and reordering
```

---

## 3. Viewport Simulation Specifications

The `CanvasFrame` constrains rendered width based on the active viewport with hardware-accelerated transitions:

| Viewport | Frame Width | Visual Presentation | Device Scale |
|---|---|---|---|
| **Desktop** | `100%` (max `1440px`) | Full-bleed workspace, subtle outer border | 1.0x |
| **Tablet** | `768px` | Centered frame with rounded device corners (`rounded-2xl`), shadow | 1.0x |
| **Mobile** | `375px` | Centered phone frame with `rounded-3xl`, device bezel shadow | 1.0x |

---

## 4. Recursive Template Renderer Contract (`TemplateRenderer.tsx`)

The renderer recursively traverses `ElementNode[]` and maps each node kind to an appropriate HTML element with computed styles:

### 4.1 Node Kind to HTML Mapping:
- **`section`**: `<section data-node-id={node.id} style={resolvedStyle}>...</section>`
- **`container`**: `<div data-node-id={node.id} style={resolvedStyle}>...</div>`
- **`text`**:
  - Headings (`h1`, `h2`, `h3`): renders `<h1 data-node-id={node.id} ...>{node.content}</h1>`
  - Paragraphs / Eyebrows: renders `<p>` or `<span>`
  - When in active inline edit mode: renders with `contentEditable={true}` and auto-focus.
- **`button`**: `<button data-node-id={node.id} type="button" style={resolvedStyle}>{node.content}</button>`
- **`link`**: `<a data-node-id={node.id} href="#" onClick={e => e.preventDefault()} style={resolvedStyle}>{node.content}</a>`
- **`image`**: `<img data-node-id={node.id} src={node.content} alt={node.name} style={resolvedStyle} />`
- **`card`**: `<div data-node-id={node.id} style={resolvedStyle}>...</div>`

---

## 5. Selection Highlighting & Section Reordering

1. **Selection Ring**: Rendered directly on the active DOM element using `ring-1.5 ring-blue-600 ring-offset-1` with an attached understated label (`Hero Heading · text`).
2. **Section Actions**: When a top-level section is selected, renders subtle action buttons:
   - `[↑ Move Up]` (disabled on first section)
   - `[↓ Move Down]` (disabled on last section)
   - `[Code]` (opens Code Editor)
   - `[Assistant]` (opens AI Assistant)

---

## 6. Automated Test Matrix for Phase 4 (`canvasRenderer.test.ts`)

```typescript
describe("Phase 4: Visual Canvas & Template Renderer", () => {
  it("[ACCEPT] renders canonical template model elements recursively to DOM");
  it("[ACCEPT] applies baseProps styling on desktop viewport");
  it("[ACCEPT] applies overrides.mobile styling when viewport is mobile");
  it("[ACCEPT] applies overrides.tablet styling when viewport is tablet");
  it("[ACCEPT] traps native link navigation on canvas elements");
  it("[ACCEPT] commits inline text change through Phase 1 pipeline with scope: all");
  it("[IMMUTABILITY] inline text edit with unchanged content produces zero commit");
  it("[ACCEPT] section Move Up / Move Down dispatches structural reorder through commit pipeline");
  it("[REJECT] first section cannot move up and last section cannot move down");
});
```

---

*This document serves as the exact specification for executing Phase 4.*
