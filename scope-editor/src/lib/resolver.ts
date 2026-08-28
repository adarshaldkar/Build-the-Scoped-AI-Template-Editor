import type { ElementNode, ElementStyleProps, Viewport } from "./types";

/**
 * Resolves the computed style properties for an element at a given viewport.
 * Cascade Rule: Viewport Override -> Base Props -> Default Empty
 */
export function resolveElementProps(
  node: ElementNode,
  viewport: Viewport
): ElementStyleProps {
  const base = node.baseProps || {};
  const override = node.overrides?.[viewport] || {};

  return {
    ...base,
    ...override,
  };
}
