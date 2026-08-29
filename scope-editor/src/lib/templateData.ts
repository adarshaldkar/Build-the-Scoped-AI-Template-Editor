import type { TemplateModel } from "./types";

export const HERO_IMG =
  "https://images.pexels.com/photos/7078411/pexels-photo-7078411.jpeg?auto=compress&cs=tinysrgb&h=650&w=940";

export const STUDIO_IMG =
  "https://images.pexels.com/photos/16307279/pexels-photo-16307279.jpeg?auto=compress&cs=tinysrgb&h=650&w=940";

const baseTemplateModel: TemplateModel = {
  templateId: "nova-studio-landing",
  templateName: "NOVA Digital Studio",
  schemaVersion: "1.0.0",
  revision: 1,
  updatedAt: "2026-08-28T12:00:00.000Z",
  elements: [
    {
      id: "nav",
      name: "Navigation",
      kind: "section",
      icon: "section",
      version: 1,
      baseProps: {
        backgroundColor: "#FFFFFF",
        paddingTop: 20,
        paddingBottom: 20,
        paddingLeft: 40,
        paddingRight: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: "#F4F3F0",
      },
      overrides: {
        mobile: {
          paddingTop: 12,
          paddingBottom: 12,
          paddingLeft: 12,
          paddingRight: 12,
        },
      },
      children: [
        {
          id: "logo",
          name: "Logo",
          kind: "text",
          icon: "text",
          content: "NOVA",
          version: 1,
          baseProps: {
            fontFamily: "Inter",
            fontWeight: 700,
            fontSize: 20,
            color: "#18181B",
            letterSpacing: -0.5,
          },
          overrides: {
            mobile: {
              fontSize: 16,
            },
          },
        },
        {
          id: "nav-links",
          name: "Nav Links",
          kind: "container",
          icon: "container",
          version: 1,
          baseProps: {
            display: "flex",
            gap: 28,
            alignItems: "center",
          },
          overrides: {
            mobile: {
              gap: 8,
            },
          },
          children: [
            {
              id: "nav-1",
              name: "Work Link",
              kind: "link",
              icon: "link",
              content: "Work",
              version: 1,
              baseProps: {
                fontFamily: "Inter",
                fontWeight: 500,
                fontSize: 14,
                color: "#3F3F46",
              },
              overrides: {
                mobile: {
                  fontSize: 12,
                },
              },
            },
            {
              id: "nav-2",
              name: "Services Link",
              kind: "link",
              icon: "link",
              content: "Services",
              version: 1,
              baseProps: {
                fontFamily: "Inter",
                fontWeight: 500,
                fontSize: 14,
                color: "#3F3F46",
              },
              overrides: {
                mobile: {
                  fontSize: 12,
                },
              },
            },
            {
              id: "nav-3",
              name: "About Link",
              kind: "link",
              icon: "link",
              content: "About",
              version: 1,
              baseProps: {
                fontFamily: "Inter",
                fontWeight: 500,
                fontSize: 14,
                color: "#3F3F46",
              },
              overrides: {
                mobile: {
                  fontSize: 12,
                },
              },
            },
            {
              id: "nav-4",
              name: "Contact Link",
              kind: "link",
              icon: "link",
              content: "Contact",
              version: 1,
              baseProps: {
                fontFamily: "Inter",
                fontWeight: 500,
                fontSize: 14,
                color: "#3F3F46",
              },
              overrides: {
                mobile: {
                  fontSize: 12,
                },
              },
            },
          ],
        },
      ],
    },
    {
      id: "hero",
      name: "Hero Section",
      kind: "section",
      icon: "section",
      version: 1,
      baseProps: {
        paddingTop: 80,
        paddingBottom: 64,
        paddingLeft: 40,
        paddingRight: 40,
        backgroundColor: "#FFFFFF",
      },
      overrides: {
        mobile: {
          paddingTop: 40,
          paddingBottom: 48,
          paddingLeft: 20,
          paddingRight: 20,
        },
      },
      children: [
        {
          id: "hero-eyebrow",
          name: "Hero Eyebrow",
          kind: "text",
          icon: "text",
          content: "DIGITAL PRODUCT STUDIO",
          version: 1,
          baseProps: {
            fontFamily: "Inter",
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: 1.5,
            color: "#71717A",
            marginBottom: 16,
          },
          overrides: {
            mobile: {
              fontSize: 11,
              marginBottom: 12,
            },
          },
        },
        {
          id: "hero-heading",
          name: "Hero Heading",
          kind: "text",
          icon: "text",
          content: "Designing digital experiences that move businesses forward.",
          version: 1,
          baseProps: {
            fontFamily: "Inter",
            fontWeight: 700,
            fontSize: 56,
            lineHeight: 1.08,
            letterSpacing: -1.2,
            color: "#18181B",
            marginBottom: 24,
            textAlign: "left",
          },
          overrides: {
            tablet: {
              fontSize: 44,
              lineHeight: 1.12,
            },
            mobile: {
              fontSize: 34,
              lineHeight: 1.15,
              marginBottom: 16,
            },
          },
        },
        {
          id: "hero-desc",
          name: "Hero Description",
          kind: "text",
          icon: "text",
          content: "We partner with ambitious teams to design, build, and ship products that feel effortless to use.",
          version: 1,
          baseProps: {
            fontFamily: "Inter",
            fontWeight: 400,
            fontSize: 18,
            lineHeight: 1.6,
            color: "#52525B",
            marginBottom: 32,
            textAlign: "left",
          },
          overrides: {
            mobile: {
              fontSize: 15,
              lineHeight: 1.5,
              marginBottom: 24,
            },
          },
        },
        {
          id: "hero-cta",
          name: "Hero CTA Group",
          kind: "container",
          icon: "container",
          version: 1,
          baseProps: {
            display: "flex",
            flexDirection: "row",
            gap: 12,
            marginBottom: 48,
          },
          overrides: {
            mobile: {
              flexDirection: "column",
              gap: 8,
              marginBottom: 32,
            },
          },
          children: [
            {
              id: "hero-btn-1",
              name: "Primary CTA Button",
              kind: "button",
              icon: "button",
              content: "Start a project",
              version: 1,
              baseProps: {
                fontFamily: "Inter",
                fontWeight: 600,
                fontSize: 15,
                color: "#FFFFFF",
                backgroundColor: "#18181B",
                borderRadius: 8,
                paddingTop: 12,
                paddingBottom: 12,
                paddingLeft: 24,
                paddingRight: 24,
              },
              overrides: {
                mobile: {
                  width: "100%",
                },
              },
            },
            {
              id: "hero-btn-2",
              name: "Secondary CTA Button",
              kind: "button",
              icon: "button",
              content: "View our work",
              version: 1,
              baseProps: {
                fontFamily: "Inter",
                fontWeight: 600,
                fontSize: 15,
                color: "#18181B",
                backgroundColor: "transparent",
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#E4E2DE",
                paddingTop: 12,
                paddingBottom: 12,
                paddingLeft: 24,
                paddingRight: 24,
              },
              overrides: {
                mobile: {
                  width: "100%",
                },
              },
            },
          ],
        },
        {
          id: "hero-image",
          name: "Hero Image",
          kind: "image",
          icon: "image",
          content: HERO_IMG,
          version: 1,
          baseProps: {
            width: "100%",
            height: 440,
            borderRadius: 16,
          },
          overrides: {
            mobile: {
              height: 240,
              borderRadius: 12,
            },
          },
        },
      ],
    },
    {
      id: "services",
      name: "Services Section",
      kind: "section",
      icon: "section",
      version: 1,
      baseProps: {
        paddingTop: 80,
        paddingBottom: 80,
        paddingLeft: 40,
        paddingRight: 40,
        backgroundColor: "#FFFFFF",
      },
      overrides: {
        mobile: {
          paddingTop: 48,
          paddingBottom: 48,
          paddingLeft: 20,
          paddingRight: 20,
        },
      },
      children: [
        {
          id: "serv-eyebrow",
          name: "Services Eyebrow",
          kind: "text",
          icon: "text",
          content: "WHAT WE DO",
          version: 1,
          baseProps: {
            fontFamily: "Inter",
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: 1.5,
            color: "#71717A",
            marginBottom: 12,
          },
          overrides: {},
        },
        {
          id: "serv-heading",
          name: "Services Heading",
          kind: "text",
          icon: "text",
          content: "Services built for teams that ship.",
          version: 1,
          baseProps: {
            fontFamily: "Inter",
            fontWeight: 700,
            fontSize: 36,
            lineHeight: 1.15,
            letterSpacing: -0.8,
            color: "#18181B",
            marginBottom: 40,
          },
          overrides: {
            mobile: {
              fontSize: 26,
              marginBottom: 28,
            },
          },
        },
        {
          id: "serv-cards",
          name: "Service Cards Grid",
          kind: "container",
          icon: "container",
          version: 1,
          baseProps: {
            display: "grid",
            gap: 20,
          },
          overrides: {
            mobile: {
              gap: 16,
            },
          },
          children: [
            {
              id: "serv-card-1",
              name: "Brand & Identity Card",
              kind: "card",
              icon: "card",
              content: "01\nBrand & Identity\nIdentity systems, visual language, and brand guidelines that scale across every touchpoint.",
              version: 1,
              baseProps: {
                backgroundColor: "#FBFBFA",
                borderWidth: 1,
                borderColor: "#EDEBE7",
                borderRadius: 12,
                paddingTop: 24,
                paddingBottom: 24,
                paddingLeft: 24,
                paddingRight: 24,
              },
              overrides: {},
            },
            {
              id: "serv-card-2",
              name: "Product Design Card",
              kind: "card",
              icon: "card",
              content: "02\nProduct Design\nEnd-to-end product design from research and wireframes to polished, tested interfaces.",
              version: 1,
              baseProps: {
                backgroundColor: "#FBFBFA",
                borderWidth: 1,
                borderColor: "#EDEBE7",
                borderRadius: 12,
                paddingTop: 24,
                paddingBottom: 24,
                paddingLeft: 24,
                paddingRight: 24,
              },
              overrides: {},
            },
            {
              id: "serv-card-3",
              name: "Web Development Card",
              kind: "card",
              icon: "card",
              content: "03\nWeb Development\nFast, accessible front-end engineering built with modern frameworks and tooling.",
              version: 1,
              baseProps: {
                backgroundColor: "#FBFBFA",
                borderWidth: 1,
                borderColor: "#EDEBE7",
                borderRadius: 12,
                paddingTop: 24,
                paddingBottom: 24,
                paddingLeft: 24,
                paddingRight: 24,
              },
              overrides: {},
            },
          ],
        },
      ],
    },
    {
      id: "about",
      name: "About Section",
      kind: "section",
      icon: "section",
      version: 1,
      baseProps: {
        paddingTop: 80,
        paddingBottom: 80,
        paddingLeft: 40,
        paddingRight: 40,
        backgroundColor: "#FFFFFF",
      },
      overrides: {
        mobile: {
          paddingTop: 48,
          paddingBottom: 48,
          paddingLeft: 20,
          paddingRight: 20,
        },
      },
      children: [
        {
          id: "about-heading",
          name: "About Heading",
          kind: "text",
          icon: "text",
          content: "A studio focused on craft and outcomes.",
          version: 1,
          baseProps: {
            fontFamily: "Inter",
            fontWeight: 700,
            fontSize: 32,
            lineHeight: 1.2,
            letterSpacing: -0.6,
            color: "#18181B",
            marginBottom: 16,
          },
          overrides: {
            mobile: {
              fontSize: 24,
            },
          },
        },
        {
          id: "about-desc",
          name: "About Description",
          kind: "text",
          icon: "text",
          content: "Since 2019, we have helped over 40 companies turn complex problems into clear, beautiful digital products.",
          version: 1,
          baseProps: {
            fontFamily: "Inter",
            fontWeight: 400,
            fontSize: 17,
            lineHeight: 1.6,
            color: "#52525B",
            marginBottom: 32,
          },
          overrides: {
            mobile: {
              fontSize: 15,
            },
          },
        },
        {
          id: "about-image",
          name: "Studio Image",
          kind: "image",
          icon: "image",
          content: STUDIO_IMG,
          version: 1,
          baseProps: {
            width: "100%",
            height: 380,
            borderRadius: 16,
          },
          overrides: {
            mobile: {
              height: 220,
              borderRadius: 12,
            },
          },
        },
      ],
    },
    {
      id: "cta",
      name: "CTA Section",
      kind: "section",
      icon: "section",
      version: 1,
      baseProps: {
        paddingTop: 80,
        paddingBottom: 80,
        paddingLeft: 40,
        paddingRight: 40,
        backgroundColor: "#18181B",
        textAlign: "center",
      },
      overrides: {
        mobile: {
          paddingTop: 48,
          paddingBottom: 48,
          paddingLeft: 20,
          paddingRight: 20,
        },
      },
      children: [
        {
          id: "cta-heading",
          name: "CTA Heading",
          kind: "text",
          icon: "text",
          content: "Let us build something together.",
          version: 1,
          baseProps: {
            fontFamily: "Inter",
            fontWeight: 700,
            fontSize: 40,
            lineHeight: 1.15,
            letterSpacing: -0.8,
            color: "#FFFFFF",
            marginBottom: 32,
            textAlign: "center",
          },
          overrides: {
            mobile: {
              fontSize: 28,
              marginBottom: 24,
            },
          },
        },
        {
          id: "cta-btn",
          name: "CTA Button",
          kind: "button",
          icon: "button",
          content: "Start a project",
          version: 1,
          baseProps: {
            fontFamily: "Inter",
            fontWeight: 600,
            fontSize: 15,
            color: "#18181B",
            backgroundColor: "#FFFFFF",
            borderRadius: 8,
            paddingTop: 12,
            paddingBottom: 12,
            paddingLeft: 24,
            paddingRight: 24,
          },
          overrides: {},
        },
      ],
    },
    {
      id: "footer",
      name: "Footer Section",
      kind: "section",
      icon: "section",
      version: 1,
      baseProps: {
        paddingTop: 32,
        paddingBottom: 32,
        paddingLeft: 40,
        paddingRight: 40,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#F4F3F0",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      },
      overrides: {
        mobile: {
          paddingLeft: 20,
          paddingRight: 20,
          flexDirection: "column",
          gap: 12,
        },
      },
      children: [
        {
          id: "footer-brand",
          name: "Footer Brand",
          kind: "text",
          icon: "text",
          content: "NOVA",
          version: 1,
          baseProps: {
            fontFamily: "Inter",
            fontWeight: 700,
            fontSize: 18,
            color: "#18181B",
          },
          overrides: {},
        },
        {
          id: "footer-copy",
          name: "Footer Copyright",
          kind: "text",
          icon: "text",
          content: "(c) 2026 NOVA Studio. All rights reserved.",
          version: 1,
          baseProps: {
            fontFamily: "Inter",
            fontWeight: 400,
            fontSize: 13,
            color: "#A1A1AA",
          },
          overrides: {},
        },
      ],
    },
  ],
};


function enrichSemanticTags(model: TemplateModel): TemplateModel {
  const visit = (node: any): any => {
    let tag: any = node.tag;
    if (!tag) {
      if (node.kind === "section") tag = "section";
      else if (node.kind === "container" || node.kind === "card") tag = "div";
      else if (node.kind === "button") tag = "button";
      else if (node.kind === "link") tag = "a";
      else if (node.kind === "image") tag = "img";
      else if (node.kind === "input") tag = "input";
      else if (node.kind === "text") {
        const name = String(node.name).toLowerCase();
        tag = name.includes("heading") ? "h2" : name.includes("eyebrow") || name.includes("logo") || name.includes("brand") ? "span" : "p";
        if (name === "hero heading") tag = "h1";
      }
    }
    return { ...node, tag, editable: true, children: node.children?.map(visit) };
  };
  return { ...model, elements: model.elements.map(visit) };
}

export const initialTemplateModel: TemplateModel = enrichSemanticTags(baseTemplateModel);
export const TEMPLATE_MEDIA_SOURCES = [HERO_IMG, STUDIO_IMG];
