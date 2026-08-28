import type { ElementNode, Revision } from "./types";

export const HERO_IMG =
  "https://images.pexels.com/photos/7078411/pexels-photo-7078411.jpeg?auto=compress&cs=tinysrgb&h=650&w=940";

export const STUDIO_IMG =
  "https://images.pexels.com/photos/16307279/pexels-photo-16307279.jpeg?auto=compress&cs=tinysrgb&h=650&w=940";

export const initialTree: ElementNode[] = [
  {
    id: "nav",
    name: "Navigation",
    kind: "section",
    icon: "nav",
    children: [
      { id: "logo", name: "Logo", kind: "text", icon: "text", content: "NOVA", props: { font: "Inter", weight: 700, size: 20, color: "#18181B" } },
      {
        id: "nav-links",
        name: "Nav Links",
        kind: "container",
        icon: "container",
        children: [
          { id: "nav-1", name: "Work", kind: "link", icon: "link", content: "Work", props: { font: "Inter", weight: 500, size: 14, color: "#3F3F46" } },
          { id: "nav-2", name: "Services", kind: "link", icon: "link", content: "Services", props: { font: "Inter", weight: 500, size: 14, color: "#3F3F46" } },
          { id: "nav-3", name: "About", kind: "link", icon: "link", content: "About", props: { font: "Inter", weight: 500, size: 14, color: "#3F3F46" } },
          { id: "nav-4", name: "Contact", kind: "link", icon: "link", content: "Contact", props: { font: "Inter", weight: 500, size: 14, color: "#3F3F46" } },
        ],
        props: {},
      },
    ],
    props: {},
  },
  {
    id: "hero",
    name: "Hero",
    kind: "section",
    icon: "section",
    children: [
      { id: "hero-heading", name: "Heading", kind: "text", icon: "text", content: "Designing digital experiences that move businesses forward.", props: { font: "Inter", weight: 700, size: 56, lineHeight: 1.05, color: "#18181B", marginTop: 0, marginBottom: 24, align: "left" } },
      { id: "hero-desc", name: "Description", kind: "text", icon: "text", content: "We partner with ambitious teams to design, build, and ship products that feel effortless to use.", props: { font: "Inter", weight: 400, size: 18, lineHeight: 1.55, color: "#52525B", marginTop: 0, marginBottom: 32, align: "left" } },
      {
        id: "hero-cta",
        name: "CTA Group",
        kind: "container",
        icon: "container",
        children: [
          { id: "hero-btn-1", name: "Primary Button", kind: "button", icon: "button", content: "Start a project", props: { font: "Inter", weight: 600, size: 15, color: "#FFFFFF", bg: "#18181B", radius: 8, marginTop: 0, marginBottom: 0 } },
          { id: "hero-btn-2", name: "Secondary Button", kind: "button", icon: "button", content: "View our work", props: { font: "Inter", weight: 600, size: 15, color: "#18181B", bg: "transparent", radius: 8, marginTop: 0, marginBottom: 0 } },
        ],
        props: {},
      },
      { id: "hero-image", name: "Hero Image", kind: "image", icon: "image", content: HERO_IMG, props: { radius: 16, marginTop: 48, marginBottom: 0, width: 100, height: 420 } },
    ],
    props: {},
  },
  {
    id: "features",
    name: "Features",
    kind: "section",
    icon: "section",
    children: [
      { id: "feat-eyebrow", name: "Eyebrow", kind: "text", icon: "text", content: "What we do", props: { font: "Inter", weight: 600, size: 13, color: "#71717A", marginTop: 0, marginBottom: 12 } },
      { id: "feat-heading", name: "Heading", kind: "text", icon: "text", content: "Services built for teams that ship.", props: { font: "Inter", weight: 700, size: 36, lineHeight: 1.1, color: "#18181B", marginTop: 0, marginBottom: 40 } },
      {
        id: "feat-cards",
        name: "Feature Cards",
        kind: "container",
        icon: "container",
        children: [
          { id: "feat-1", name: "Feature Card 1", kind: "container", icon: "container", content: "Brand & Identity", props: { font: "Inter", weight: 600, size: 18, color: "#18181B", radius: 12, marginTop: 0, marginBottom: 0 } },
          { id: "feat-2", name: "Feature Card 2", kind: "container", icon: "container", content: "Product Design", props: { font: "Inter", weight: 600, size: 18, color: "#18181B", radius: 12, marginTop: 0, marginBottom: 0 } },
          { id: "feat-3", name: "Feature Card 3", kind: "container", icon: "container", content: "Web Development", props: { font: "Inter", weight: 600, size: 18, color: "#18181B", radius: 12, marginTop: 0, marginBottom: 0 } },
        ],
        props: {},
      },
    ],
    props: {},
  },
  {
    id: "about",
    name: "About",
    kind: "section",
    icon: "section",
    children: [
      { id: "about-heading", name: "Heading", kind: "text", icon: "text", content: "A studio focused on craft and outcomes.", props: { font: "Inter", weight: 700, size: 32, lineHeight: 1.15, color: "#18181B" } },
      { id: "about-desc", name: "Description", kind: "text", icon: "text", content: "Since 2019, we've helped over 40 companies turn complex problems into clear, beautiful products.", props: { font: "Inter", weight: 400, size: 17, lineHeight: 1.6, color: "#52525B" } },
      { id: "about-image", name: "Studio Image", kind: "image", icon: "image", content: STUDIO_IMG, props: { radius: 16, width: 100, height: 360 } },
    ],
    props: {},
  },
  {
    id: "cta",
    name: "CTA",
    kind: "section",
    icon: "section",
    children: [
      { id: "cta-heading", name: "Heading", kind: "text", icon: "text", content: "Let's build something together.", props: { font: "Inter", weight: 700, size: 40, lineHeight: 1.1, color: "#FFFFFF" } },
      { id: "cta-btn", name: "Button", kind: "button", icon: "button", content: "Start a project", props: { font: "Inter", weight: 600, size: 15, color: "#18181B", bg: "#FFFFFF", radius: 8 } },
    ],
    props: {},
  },
  {
    id: "footer",
    name: "Footer",
    kind: "section",
    icon: "section",
    children: [
      { id: "footer-brand", name: "Brand", kind: "text", icon: "text", content: "NOVA", props: { font: "Inter", weight: 700, size: 18, color: "#18181B" } },
      { id: "footer-copy", name: "Copyright", kind: "text", icon: "text", content: "© 2026 NOVA Studio. All rights reserved.", props: { font: "Inter", weight: 400, size: 13, color: "#A1A1AA" } },
    ],
    props: {},
  },
];

export const initialHistory: Revision[] = [
  { id: "r1", time: "13:42", kind: "ai", element: "Hero Heading", scope: "desktop", before: "Build websites faster", after: "Designing digital experiences that move businesses forward." },
  { id: "r2", time: "13:37", kind: "manual", element: "CTA Button", scope: "all", before: "Get started", after: "Start a project" },
  { id: "r3", time: "13:31", kind: "ai", element: "Hero Description", scope: "mobile", before: "We build websites.", after: "We partner with ambitious teams to design, build, and ship products that feel effortless to use." },
  { id: "r4", time: "13:05", kind: "manual", element: "Feature Card 1", scope: "all", before: "Design", after: "Brand & Identity" },
];

export const aiSuggestions = [
  "Rewrite this heading",
  "Make this button larger",
  "Move this section down",
  "Make the hero smaller on mobile",
];

export const sampleCode = `<section id="hero">
  <h1>Designing digital experiences that move businesses forward.</h1>
  <p>We partner with ambitious teams to design, build, and ship products that feel effortless to use.</p>
  <div class="cta-group">
    <button>Start a project</button>
    <button>View our work</button>
  </div>
  <img src="hero.jpg" alt="Studio" />
</section>`;
