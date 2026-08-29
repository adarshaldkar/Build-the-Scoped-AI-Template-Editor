import type { ElementNode, ElementStyleProps, Viewport } from "./types";
const DEFAULTS: ElementStyleProps = { fontFamily: "Inter", lineHeight: 1.4, opacity: 1 };
export function resolveElementProps(node: ElementNode, viewport: Viewport): ElementStyleProps {
  return { ...DEFAULTS, ...node.baseProps, ...(node.overrides[viewport] ?? {}) };
}
export function isPropertyOverridden(node: ElementNode, viewport: Viewport, propertyKey: keyof ElementStyleProps): boolean {
  if (viewport === "desktop") return false;
  return node.overrides[viewport]?.[propertyKey] !== undefined;
}
