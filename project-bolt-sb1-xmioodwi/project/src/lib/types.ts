export type Viewport = "desktop" | "tablet" | "mobile";

export type Scope = "all" | Viewport;

export interface ElementNode {
  id: string;
  name: string;
  kind: "section" | "text" | "button" | "image" | "container" | "link" | "input";
  icon: string;
  content?: string;
  children?: ElementNode[];
  props: {
    font?: string;
    weight?: number;
    size?: number;
    lineHeight?: number;
    color?: string;
    bg?: string;
    marginTop?: number;
    marginBottom?: number;
    width?: number;
    height?: number;
    radius?: number;
    align?: "left" | "center" | "right";
  };
}

export interface Revision {
  id: string;
  time: string;
  kind: "manual" | "ai";
  element: string;
  scope: Scope;
  before: string;
  after: string;
}

export interface Proposal {
  id: string;
  elementId: string;
  elementName: string;
  before: string;
  after: string;
  scope: Scope;
  status: "pending" | "accepted" | "rejected";
  stale?: boolean;
}

export const VIEWPORT_WIDTHS: Record<Viewport, number> = {
  desktop: 1440,
  tablet: 768,
  mobile: 375,
};

export const VIEWPORT_LABELS: Record<Viewport, string> = {
  desktop: "Desktop",
  tablet: "Tablet",
  mobile: "Mobile",
};
