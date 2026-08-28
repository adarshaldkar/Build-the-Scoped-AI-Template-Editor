import type { ElementNode, Viewport } from "../lib/types";
import { VIEWPORT_LABELS, VIEWPORT_WIDTHS } from "../lib/types";
import { HERO_IMG, STUDIO_IMG } from "../lib/data";

/* ---------- helper to find a node by id ---------- */
function findNode(tree: ElementNode[], id: string): ElementNode | null {
  for (const n of tree) {
    if (n.id === id) return n;
    if (n.children) {
      const f = findNode(n.children, id);
      if (f) return f;
    }
  }
  return null;
}

/* ---------- the website template ---------- */
function WebsiteTemplate({
  tree,
  viewport,
  selectedIds,
  hidden,
  onSelect,
}: {
  tree: ElementNode[];
  viewport: Viewport;
  selectedIds: string[];
  hidden: Set<string>;
  onSelect: (id: string, shift: boolean) => void;
}) {
  const get = (id: string) => findNode(tree, id);
  const cls = (id: string) => {
    const sel = selectedIds.includes(id);
    const hid = hidden.has(id);
    return `relative cursor-pointer transition-shadow-base ${
      sel ? "elem-selected" : "elem-hover"
    } ${hid ? "opacity-30" : ""}`;
  };
  const click = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(id, e.shiftKey);
  };

  const heroHeading = get("hero-heading");
  const heroDesc = get("hero-desc");
  const heroBtn1 = get("hero-btn-1");
  const heroBtn2 = get("hero-btn-2");
  const heroImg = get("hero-image");
  const featEyebrow = get("feat-eyebrow");
  const featHeading = get("feat-heading");
  const feat1 = get("feat-1");
  const feat2 = get("feat-2");
  const feat3 = get("feat-3");
  const aboutHeading = get("about-heading");
  const aboutDesc = get("about-desc");
  const aboutImg = get("about-image");
  const ctaHeading = get("cta-heading");
  const ctaBtn = get("cta-btn");
  const footerBrand = get("footer-brand");
  const footerCopy = get("footer-copy");

  const isMobile = viewport === "mobile";
  const isTablet = viewport === "tablet";

  const p = (n: ElementNode | null) => n?.props ?? {};
  const tx = (n: ElementNode | null) => ({
    fontFamily: p(n).font ?? "Inter",
    fontWeight: p(n).weight ?? 400,
    fontSize: (p(n).size ?? 16) * (isMobile ? 0.82 : isTablet ? 0.9 : 1),
    lineHeight: p(n).lineHeight ?? 1.5,
    color: p(n).color ?? "#1A1A1A",
    marginTop: p(n).marginTop ? `${p(n).marginTop! * (isMobile ? 0.7 : isTablet ? 0.85 : 1)}px` : undefined,
    marginBottom: p(n).marginBottom ? `${p(n).marginBottom! * (isMobile ? 0.7 : isTablet ? 0.85 : 1)}px` : undefined,
    textAlign: p(n).align ?? "left",
  });

  return (
    <div className="bg-canvas-paper text-canvas-ink" style={{ width: "100%" }}>
      {/* NAV */}
      <nav
        className={`flex items-center justify-between px-10 ${isMobile ? "px-5 py-4" : "py-5"}`}
        style={{ borderBottom: "1px solid #F4F3F0" }}
      >
        <div onClick={click("logo")} className={cls("logo")}>
          <span style={tx(get("logo"))}>{get("logo")?.content}</span>
        </div>
        {!isMobile ? (
          <div onClick={click("nav-links")} className={cls("nav-links") + " flex gap-7"}>
            {["nav-1", "nav-2", "nav-3", "nav-4"].map((id) => (
              <span key={id} onClick={click(id)} className={cls(id)}>
                {get(id)?.content}
              </span>
            ))}
          </div>
        ) : (
          <div onClick={click("nav-links")} className={cls("nav-links") + " flex flex-col gap-1 items-end"}>
            {["nav-1", "nav-2"].map((id) => (
              <span key={id} onClick={click(id)} className={cls(id)} style={{ fontSize: 13 }}>
                {get(id)?.content}
              </span>
            ))}
          </div>
        )}
      </nav>

      {/* HERO */}
      <section
        className={cls("hero") + ` px-10 ${isMobile ? "px-5 pt-10 pb-12" : "pt-20 pb-16"}`}
        onClick={click("hero")}
      >
        <div className={isMobile ? "" : "max-w-2xl"}>
          <div onClick={click("hero-heading")} className={cls("hero-heading")}>
            <h1 style={tx(heroHeading)}>{heroHeading?.content}</h1>
          </div>
          <div onClick={click("hero-desc")} className={cls("hero-desc")}>
            <p style={tx(heroDesc)}>{heroDesc?.content}</p>
          </div>
          <div onClick={click("hero-cta")} className={cls("hero-cta") + ` flex ${isMobile ? "flex-col" : "flex-row"} gap-3`}>
            <button
              onClick={click("hero-btn-1")}
              className={cls("hero-btn-1") + " px-6 py-3"}
              style={{
                background: p(heroBtn1).bg,
                color: p(heroBtn1).color,
                borderRadius: p(heroBtn1).radius ?? 8,
                fontSize: p(heroBtn1).size,
                fontWeight: p(heroBtn1).weight,
              }}
            >
              {heroBtn1?.content}
            </button>
            <button
              onClick={click("hero-btn-2")}
              className={cls("hero-btn-2") + " px-6 py-3 border"}
              style={{
                background: p(heroBtn2).bg,
                color: p(heroBtn2).color,
                borderRadius: p(heroBtn2).radius ?? 8,
                fontSize: p(heroBtn2).size,
                fontWeight: p(heroBtn2).weight,
                borderColor: "#E4E2DE",
              }}
            >
              {heroBtn2?.content}
            </button>
          </div>
        </div>
        <div onClick={click("hero-image")} className={cls("hero-image") + " mt-12"} style={{ marginTop: 48 }}>
          <img
            src={HERO_IMG}
            alt="Studio"
            className="w-full object-cover"
            style={{
              borderRadius: p(heroImg).radius ?? 16,
              height: isMobile ? 240 : p(heroImg).height ?? 420,
            }}
          />
        </div>
      </section>

      {/* FEATURES */}
      <section className={cls("features") + ` px-10 ${isMobile ? "px-5 py-12" : "py-20"}`} onClick={click("features")}>
        <div onClick={click("feat-eyebrow")} className={cls("feat-eyebrow")}>
          <span style={tx(featEyebrow)} className="uppercase tracking-wider">{featEyebrow?.content}</span>
        </div>
        <div onClick={click("feat-heading")} className={cls("feat-heading")}>
          <h2 style={tx(featHeading)}>{featHeading?.content}</h2>
        </div>
        <div
          onClick={click("feat-cards")}
          className={cls("feat-cards") + ` grid gap-5 mt-10 ${isMobile ? "grid-cols-1" : isTablet ? "grid-cols-2" : "grid-cols-3"}`}
        >
          {[
            { n: feat1, id: "feat-1", num: "01" },
            { n: feat2, id: "feat-2", num: "02" },
            { n: feat3, id: "feat-3", num: "03" },
          ].map((c) => (
            <div
              key={c.id}
              onClick={click(c.id)}
              className={cls(c.id) + " p-6 border"}
              style={{
                borderRadius: p(c.n).radius ?? 12,
                borderColor: "#EDEBE7",
                background: "#FBFBFA",
              }}
            >
              <span className="text-meta font-mono text-canvas-faint">{c.num}</span>
              <h3 className="mt-4" style={{ fontSize: 18, fontWeight: 600, color: "#18181B" }}>
                {c.n?.content}
              </h3>
              <p className="mt-2 text-ctrl" style={{ color: "#71717A", fontSize: 14, lineHeight: 1.55 }}>
                {c.id === "feat-1" && "Identity systems, visual language, and brand guidelines that scale across every touchpoint."}
                {c.id === "feat-2" && "End-to-end product design from research and wireframes to polished, tested interfaces."}
                {c.id === "feat-3" && "Fast, accessible front-end engineering built with modern frameworks and tooling."}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT */}
      <section className={cls("about") + ` px-10 ${isMobile ? "px-5 py-12" : "py-20"}`} onClick={click("about")}>
        <div className={`grid gap-10 ${isMobile ? "grid-cols-1" : "grid-cols-2"} items-center`}>
          <div>
            <div onClick={click("about-heading")} className={cls("about-heading")}>
              <h2 style={tx(aboutHeading)}>{aboutHeading?.content}</h2>
            </div>
            <div onClick={click("about-desc")} className={cls("about-desc") + " mt-4"}>
              <p style={tx(aboutDesc)}>{aboutDesc?.content}</p>
            </div>
          </div>
          <div onClick={click("about-image")} className={cls("about-image")}>
            <img
              src={STUDIO_IMG}
              alt="Studio workspace"
              className="w-full object-cover"
              style={{ borderRadius: p(aboutImg).radius ?? 16, height: isMobile ? 240 : 360 }}
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={cls("cta") + " px-10 py-20"} style={{ background: "#18181B" }} onClick={click("cta")}>
        <div className="text-center max-w-xl mx-auto">
          <div onClick={click("cta-heading")} className={cls("cta-heading")}>
            <h2 style={tx(ctaHeading)}>{ctaHeading?.content}</h2>
          </div>
          <div onClick={click("cta-btn")} className={cls("cta-btn") + " mt-8 inline-block"}>
            <button
              className="px-6 py-3"
              style={{
                background: p(ctaBtn).bg,
                color: p(ctaBtn).color,
                borderRadius: p(ctaBtn).radius ?? 8,
                fontSize: p(ctaBtn).size,
                fontWeight: p(ctaBtn).weight,
              }}
            >
              {ctaBtn?.content}
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={cls("footer") + ` px-10 ${isMobile ? "px-5" : ""} py-8 flex justify-between items-center`} onClick={click("footer")}>
        <div onClick={click("footer-brand")} className={cls("footer-brand")}>
          <span style={tx(footerBrand)}>{footerBrand?.content}</span>
        </div>
        <div onClick={click("footer-copy")} className={cls("footer-copy")}>
          <span style={tx(footerCopy)}>{footerCopy?.content}</span>
        </div>
      </footer>
    </div>
  );
}

/* ---------- the canvas workspace ---------- */
export function Canvas({
  tree,
  viewport,
  selectedIds,
  hidden,
  onSelect,
  onClearSelection,
}: {
  tree: ElementNode[];
  viewport: Viewport;
  selectedIds: string[];
  hidden: Set<string>;
  onSelect: (id: string, shift: boolean) => void;
  onClearSelection: () => void;
}) {
  const width = VIEWPORT_WIDTHS[viewport];
  const label = VIEWPORT_LABELS[viewport];

  return (
    <div className="flex-1 flex flex-col bg-canvas-bg overflow-hidden" onClick={onClearSelection}>
      {/* Canvas toolbar */}
      <div className="h-10 shrink-0 flex items-center justify-between px-4 border-b border-canvas-line bg-canvas-surface">
        <div className="flex items-center gap-2">
          <span className="text-ctrl font-medium text-canvas-ink">{label}</span>
          <span className="text-meta text-canvas-faint">·</span>
          <span className="text-meta text-canvas-faint font-mono">{width}px</span>
        </div>
        <div className="flex items-center gap-3 text-meta text-canvas-faint">
          <span>100%</span>
          <span className="text-canvas-line">|</span>
          <span>Auto-scroll on</span>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-auto scroll-thin flex justify-center p-8">
        <div
          className="bg-canvas-paper shadow-[0_1px_3px_rgba(0,0,0,0.06),0_12px_32px_rgba(0,0,0,0.08)] transition-all-base"
          style={{
            width: width <= 375 ? width : Math.min(width, 1280),
            maxWidth: "100%",
            borderRadius: 6,
            overflow: "hidden",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <WebsiteTemplate
            tree={tree}
            viewport={viewport}
            selectedIds={selectedIds}
            hidden={hidden}
            onSelect={onSelect}
          />
        </div>
      </div>
    </div>
  );
}
