import { describe, it, expect, beforeEach } from "vitest";
import { initialTemplateModel } from "../templateData";
import { findNodeById } from "../treeUtils";
import {
  templateToMarkup,
  validateMarkupSyntax,
  parseMarkupToAst,
  parseStyleString,
  reconcileMarkupToCommand,
  escapeHtml,
  unescapeHtml,
} from "../codeReconciler";
import { executeCommit } from "../commitPipeline";
import type { TemplateModel } from "../types";

describe("Phase 2: Hardened Code Serializer, AST Parser, and Reconciler", () => {
  let model: TemplateModel;

  beforeEach(() => {
    model = JSON.parse(JSON.stringify(initialTemplateModel));
  });

  // ============================================================
  // 1. SERIALIZER & ESCAPING TESTS
  // ============================================================
  it("[ACCEPT] serializes single selected element to clean HTML markup with baseProps only", () => {
    const heroHeading = findNodeById(model.elements, "hero-heading")!;
    const markup = templateToMarkup(heroHeading, "selected");

    expect(markup).toContain('<h1 id="hero-heading"');
    expect(markup).toContain('style="font-family: Inter; font-weight: 700; font-size: 56px;');
    expect(markup).toContain("Designing digital experiences that move businesses forward.");
    expect(markup).toContain("</h1>");
  });

  it("[ACCEPT] serializes full template model with nested indentation and self-closing tags", () => {
    const fullMarkup = templateToMarkup(model, "full");

    expect(fullMarkup).toContain('<main id="nova-studio-landing">');
    expect(fullMarkup).toContain('<section id="nav"');
    expect(fullMarkup).toContain('<img id="hero-image"');
    expect(fullMarkup).toContain('alt="Hero Image"');
    expect(fullMarkup).toContain("/>");
    expect(fullMarkup).toContain("</main>");
  });

  it("[ACCEPT] does not serialize resolved viewport overrides into base markup", () => {
    const heroHeading = findNodeById(model.elements, "hero-heading")!;
    const markup = templateToMarkup(heroHeading, "selected");

    expect(markup).toContain("font-size: 56px;");
    expect(markup).not.toContain("font-size: 34px;");
  });

  it("[ACCEPT] properly escapes and unescapes HTML entities", () => {
    const raw = `Design < faster & "better" >`;
    const escaped = escapeHtml(raw);
    expect(escaped).toBe("Design &lt; faster &amp; &quot;better&quot; &gt;");
    expect(unescapeHtml(escaped)).toBe(raw);
  });

  // ============================================================
  // 2. AST PARSER & SYNTAX SCANNER TESTS
  // ============================================================
  it("[ACCEPT] parses nested HTML markup into a true AST tree structure", () => {
    const nestedMarkup = `<section id="hero">\n  <div id="content">\n    <h1 id="hero-heading">Hello World</h1>\n  </div>\n</section>`;
    const result = parseMarkupToAst(nestedMarkup);

    expect(result.valid).toBe(true);
    expect(result.ast).toBeDefined();
    expect(result.ast!.length).toBe(1);
    expect(result.ast![0].id).toBe("hero");
    expect(result.ast![0].children.length).toBe(1);
    const childDiv = result.ast![0].children[0] as unknown as { id: string; children: unknown[] };
    expect(childDiv.id).toBe("content");
  });

  it("[REJECT] rejects mismatched closing tags with line diagnostic", () => {
    const brokenMarkup = `<section id="hero">\n  <h1 id="hero-heading">Hello World</p>\n</section>`;
    const result = validateMarkupSyntax(brokenMarkup);

    expect(result.valid).toBe(false);
    expect(result.error).toContain("Tag mismatch");
    expect(result.line).toBe(2);
  });

  it("[REJECT] rejects unclosed tags at EOF", () => {
    const unclosedMarkup = `<section id="hero">\n  <h1 id="hero-heading">Hello World</h1>`;
    const result = validateMarkupSyntax(unclosedMarkup);

    expect(result.valid).toBe(false);
    expect(result.error).toContain("Unclosed tag <section>");
    expect(result.line).toBe(1);
  });

  it("[REJECT] rejects dynamic JavaScript expressions ({...})", () => {
    const jsMarkup = `<section id="hero">\n  <h1 id="hero-heading">{items.map((i) => i)}</h1>\n</section>`;
    const result = validateMarkupSyntax(jsMarkup);

    expect(result.valid).toBe(false);
    expect(result.error).toContain("Dynamic JavaScript expressions are not supported");
    expect(result.line).toBe(2);
  });

  // ============================================================
  // 3. STYLE PARSER & RANGE VALIDATOR TESTS
  // ============================================================
  it("[ACCEPT] parses valid standard CSS style declarations into typed ElementStyleProps", () => {
    const styleStr = "font-size: 48px; font-weight: 600; color: #18181B; margin-bottom: 32px; display: flex;";
    const parsed = parseStyleString(styleStr);

    expect(parsed.valid).toBe(true);
    if (parsed.valid) {
      expect(parsed.props.fontSize).toBe(48);
      expect(parsed.props.fontWeight).toBe(600);
      expect(parsed.props.color).toBe("#18181B");
      expect(parsed.props.marginBottom).toBe(32);
      expect(parsed.props.display).toBe("flex");
    }
  });

  it("[REJECT] rejects invalid numeric style values (font-size: banana)", () => {
    const badStyle = "font-size: banana; color: #000;";
    const parsed = parseStyleString(badStyle);

    expect(parsed.valid).toBe(false);
    if (!parsed.valid) {
      expect(parsed.error).toContain("Invalid value for font-size");
    }
  });

  it("[REJECT] rejects out-of-bounds numeric style values (font-size: 9999px)", () => {
    const outOfBoundsStyle = "font-size: 9999px;";
    const parsed = parseStyleString(outOfBoundsStyle);

    expect(parsed.valid).toBe(false);
    if (!parsed.valid) {
      expect(parsed.error).toContain("Expected a number between 8 and 160");
    }
  });

  it("[REJECT] rejects unwhitelisted CSS properties in style attribute", () => {
    const invalidStyleStr = "font-size: 48px; z-index: 99999; animation: rotate 2s;";
    const parsed = parseStyleString(invalidStyleStr);

    expect(parsed.valid).toBe(false);
    if (!parsed.valid) {
      expect(parsed.error).toContain("Unsupported CSS property");
    }
  });

  // ============================================================
  // 4. DIFF RECONCILER & PIPELINE INTEGRATION TESTS
  // ============================================================
  it("[ACCEPT] reconciles text content edit on selected component and commits through pipeline", () => {
    const modifiedMarkup = `<h1 id="hero-heading" style="font-family: Inter; font-weight: 700; font-size: 56px; color: #18181B; margin-bottom: 24px;">\n  Crafting high-impact digital experiences.\n</h1>`;

    const reconciled = reconcileMarkupToCommand(model, modifiedMarkup, model.revision, "selected", "hero-heading");

    expect(reconciled.success).toBe(true);
    if (reconciled.success) {
      expect(reconciled.command.source).toBe("code_editor");
      expect(reconciled.command.scope).toBe("all");
      expect(reconciled.command.targetIds).toEqual(["hero-heading"]);
      expect(reconciled.command.changes.patches?.["hero-heading"]?.content).toBe(
        "Crafting high-impact digital experiences."
      );

      // Commit through Phase 1 transactional pipeline
      const commitResult = executeCommit(model, reconciled.command);
      expect(commitResult.success).toBe(true);
      if (commitResult.success) {
        expect(commitResult.model.revision).toBe(2);
        const updatedNode = findNodeById(commitResult.model.elements, "hero-heading")!;
        expect(updatedNode.content).toBe("Crafting high-impact digital experiences.");
        expect(commitResult.historyEntries.length).toBe(1);
        expect(commitResult.historyEntries[0].source).toBe("code_editor");
      }
    }
  });

  it("[ACCEPT] reconciles independent multi-element content and style changes in full template mode", () => {
    const fullMarkup = templateToMarkup(model, "full");
    // Modify hero-heading content and hero-btn-1 content independently
    const modifiedFullMarkup = fullMarkup
      .replace(
        "Designing digital experiences that move businesses forward.",
        "Transformed Agency Heading"
      )
      .replace("Start a project", "Book Consultation");

    const reconciled = reconcileMarkupToCommand(model, modifiedFullMarkup, model.revision, "full");

    expect(reconciled.success).toBe(true);
    if (reconciled.success) {
      expect(reconciled.command.targetIds).toContain("hero-heading");
      expect(reconciled.command.targetIds).toContain("hero-btn-1");

      const commitResult = executeCommit(model, reconciled.command);
      expect(commitResult.success).toBe(true);
      if (commitResult.success) {
        const headingNode = findNodeById(commitResult.model.elements, "hero-heading")!;
        const btnNode = findNodeById(commitResult.model.elements, "hero-btn-1")!;

        expect(headingNode.content).toBe("Transformed Agency Heading");
        expect(btnNode.content).toBe("Book Consultation");
        expect(commitResult.historyEntries.length).toBe(2);
      }
    }
  });

  it("[REJECT] rejects markup where an element is missing an id attribute", () => {
    const missingIdMarkup = `<section id="hero">\n  <h1>No ID Heading</h1>\n</section>`;
    const reconciled = reconcileMarkupToCommand(model, missingIdMarkup, model.revision, "selected");

    expect(reconciled.success).toBe(false);
    if (!reconciled.success) {
      expect(reconciled.error.message).toContain("missing a required 'id' attribute");
    }
  });

  it("[REJECT] rejects markup in Full Template mode when a required canonical ID is deleted", () => {
    const fullMarkup = templateToMarkup(model, "full");
    // Remove hero-btn-2 from full markup
    const strippedMarkup = fullMarkup.replace(/<button id="hero-btn-2"[\s\S]*?<\/button>/, "");

    const reconciled = reconcileMarkupToCommand(model, strippedMarkup, model.revision, "full");

    expect(reconciled.success).toBe(false);
    if (!reconciled.success) {
      expect(reconciled.error.code).toBe("DELETED_REQUIRED_ID");
      expect(reconciled.error.message).toContain("hero-btn-2");
    }
  });

  it("[REJECT] rejects markup in Selected mode if root element does not match selectedId", () => {
    const ctaMarkup = `<div id="hero-cta"><button id="hero-btn-1">Click</button></div>`;
    // Attempting to submit hero-cta markup when hero-heading is selected
    const reconciled = reconcileMarkupToCommand(model, ctaMarkup, model.revision, "selected", "hero-heading");

    expect(reconciled.success).toBe(false);
    if (!reconciled.success) {
      expect(reconciled.error.code).toBe("INVALID_SCOPE_SELECTION");
    }
  });

  it("[REJECT] returns NO_CHANGES when applied markup is identical to canonical state", () => {
    const heroHeading = findNodeById(model.elements, "hero-heading")!;
    const identicalMarkup = templateToMarkup(heroHeading, "selected");

    const reconciled = reconcileMarkupToCommand(model, identicalMarkup, model.revision, "selected", "hero-heading");

    expect(reconciled.success).toBe(false);
    if (!reconciled.success) {
      expect(reconciled.error.code).toBe("NO_CHANGES");
    }
  });

  it("[REJECT] returns TARGET_NOT_FOUND if user introduces non-existent element ID", () => {
    const unknownMarkup = `<h1 id="ghost-heading-id" style="font-size: 48px;">\n  Ghost heading\n</h1>`;

    const reconciled = reconcileMarkupToCommand(model, unknownMarkup, model.revision, "selected");

    expect(reconciled.success).toBe(false);
    if (!reconciled.success) {
      expect(reconciled.error.code).toBe("TARGET_NOT_FOUND");
    }
  });

  it("[IMMUTABILITY] syntax errors leave canonical template model strictly unmodified", () => {
    const originalRevision = model.revision;
    const brokenMarkup = `<h1 id="hero-heading">Broken tag</section>`;

    const reconciled = reconcileMarkupToCommand(model, brokenMarkup, model.revision, "selected", "hero-heading");

    expect(reconciled.success).toBe(false);
    expect(model.revision).toBe(originalRevision);
  });
});
