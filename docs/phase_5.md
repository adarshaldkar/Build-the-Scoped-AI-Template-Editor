# Phase 5: Inspector Panel & Granular Viewport Overrides Specification
**Document Name**: `phase_5.md`  
**Status**: Approved & Locked Architecture Specification  
**Prerequisites**: Phase 0 (Data Models), Phase 1 (Transactional Commit Pipeline), Phase 2 (Code Reconciler), Phase 3 (AI Assistant), Phase 4 (Visual Canvas & Template Renderer)  
**Downstream Dependents**: Phase 6 (Undo/Redo History Drawer), Phase 7 (Full App Assembly)  
**Strict Rule**: No emojis anywhere; clean typographic badges only.

---

## 1. Executive Mission & Architectural Invariants

Phase 5 builds the **right-hand visual Inspector Panel (`Inspector.tsx`)**. It gives users granular, typed visual controls over typography, colors, layout, spacing, dimensions, and responsive viewport overrides.

```mermaid
graph TD
    subgraph Selected Canvas Node
        SEL[Selected Element ID + Kind]
        BASE[node.baseProps: ElementStyleProps]
        OVR[node.overrides: { tablet?, mobile? }]
    end

    subgraph Phase 5 Inspector Engine
        VP[Active Viewport: Desktop / Tablet / Mobile]
        COMP[Computed Resolved Style: resolveElementProps]
        IND[Override Detection: isOverridden(prop, viewport)]
        UI[Inspector UI Controls: Typography / Spacing / Layout / Color]
    end

    subgraph Scope Targeting Decision
        DEC{Scope Mode}
        S_ALL[Desktop -> scope: 'all' -> Mutates baseProps]
        S_VP[Tablet/Mobile -> scope: activeViewport -> Mutates overrides[viewport]]
        RESET[Reset Override -> Deletes property key from overrides[viewport]]
    end

    subgraph Phase 1 Processing Gate
        COM[executeCommit Pipeline: source = 'inspector']
        TM[TemplateModel - Canonical State]
    end

    SEL --> COMP
    BASE --> COMP
    OVR --> COMP
    VP --> COMP
    COMP --> UI
    IND --> UI
    UI --> DEC
    S_ALL --> COM
    S_VP --> COM
    RESET --> COM
    COM --> TM
```

### The 6 Ironclad Invariants of Phase 5:
1. **Zero Direct Mutation**:
   - The Inspector panel never mutates `selectedNode` or `model` directly. Every slider, input, dropdown, and toggle emits a typed `EditCommand` (`source: "inspector"`) into Phase 1 `executeCommit(model, command)`.
2. **Explicit Responsive Scope Routing**:
   - When editing in **Desktop** viewport $\to$ writes to `scope: "all"` (updating `baseProps`).
   - When editing in **Tablet** or **Mobile** viewport $\to$ writes to `scope: activeViewport` (updating `overrides[viewport]`), leaving `baseProps` and other viewports 100% isolated.
3. **Explicit Override Key Deletion**:
   - When a property override is reset (or set to `undefined`), the commit pipeline deletes the key entirely from `overrides[viewport]`, ensuring clean JSON persistence and automatic inheritance fallback.
4. **Visual Override Indicator & Property-Level Reset**:
   - Any property on the active viewport that differs from `baseProps` displays a subtle amber indicator dot `●` showing an active viewport override.
   - Clicking the indicator resets **only that specific property's override**, preserving all other overrides on the viewport.
5. **Kind-Aware Field Filtering**:
   - Only properties valid for `node.kind` are shown:
     - `text`: Typography (font family, size, weight, line height, letter spacing, align, color), Spacing.
     - `container` / `section` / `card`: Flex layout (direction, gap, align, justify), background color, padding, margin, dimensions.
     - `button`: Typography, background color, padding, radius, border.
6. **Input Draft & Coalesced Commits**:
   - Sliders update visual preview live and emit one logical commit on release.
   - Text and number inputs maintain local draft state and commit only on `Blur` or `Enter`.

---

## 2. File Organization & Boundaries

Phase 5 introduces 1 core UI component and an automated test suite:

```
src/
├── components/
│   └── Inspector.tsx           # Right sidebar panel with typed property groups and override indicators
└── lib/
    └── __tests__/
        └── inspector.test.ts   # Automated test suite for property modifications, scope routing, and override resets
```

---

## 3. Property Groups & Controls Specification

### 3.1 Typography Group (for `text`, `button`, `link`)
- **Font Family**: Picker (`Inter`, `system-ui`, `monospace`).
- **Font Size**: Number input + slider (`8px` to `120px`).
- **Font Weight**: Dropdown (`400` Normal, `500` Medium, `600` SemiBold, `700` Bold, `800` ExtraBold).
- **Line Height**: Number input (`0.8` to `3.0`).
- **Letter Spacing**: Number input (`-2px` to `10px`).
- **Text Align**: Segmented control (`Left`, `Center`, `Right`).
- **Text Color**: Hex color input with live swatch.

### 3.2 Spacing & Dimensions Group (for all elements)
- **Padding**: 4-side inputs (`paddingTop`, `paddingBottom`, `paddingLeft`, `paddingRight`).
- **Margin**: 2-side inputs (`marginTop`, `marginBottom`).
- **Width & Height**: Text input supporting `auto`, `100%`, or numeric px values.
- **Border Radius**: Number input (`0px` to `48px`).
- **Border Width & Color**: Number input + hex color picker.

### 3.3 Layout & Flexbox Group (for `container`, `section`, `card`)
- **Display**: Dropdown (`block`, `flex`).
- **Direction**: Segmented control (`Row`, `Column`).
- **Gap**: Number input (`0px` to `64px`).
- **Align Items**: Segmented control (`Start`, `Center`, `End`, `Stretch`).
- **Justify Content**: Segmented control (`Start`, `Center`, `End`, `Between`).

### 3.4 Appearance & Color Group
- **Background Color**: Hex color input with live swatch.
- **Opacity**: Number slider (`0.0` to `1.0`).

---

## 4. Automated Test Matrix for Phase 5 (`inspector.test.ts`)

```typescript
describe("Phase 5: Inspector Panel & Viewport Overrides Invariants", () => {
  it("[ACCEPT] modifying style on Desktop viewport writes to baseProps (scope: all)");
  it("[ISOLATION] modifying style on Mobile viewport writes strictly to overrides.mobile (scope: mobile)");
  it("[ISOLATION] modifying style on Tablet viewport writes strictly to overrides.tablet (scope: tablet)");
  it("[ACCEPT] detects active viewport override on specific property");
  it("[ACCEPT] resetting viewport override deletes key from overrides and falls back to baseProps");
  it("[ISOLATION] resetting one property override preserves other sibling overrides on the same viewport");
});
```

---

*This document serves as the exact specification for Phase 5.*
