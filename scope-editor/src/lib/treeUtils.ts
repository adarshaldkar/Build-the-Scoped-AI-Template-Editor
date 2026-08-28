import type { ElementNode } from "./types";

/**
 * Recursively finds an element node by its unique ID.
 */
export function findNodeById(nodes: ElementNode[], id: string): ElementNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children && node.children.length > 0) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Recursively finds the parent element node of a given child ID.
 */
export function findParentNode(
  nodes: ElementNode[],
  childId: string
): ElementNode | null {
  for (const node of nodes) {
    if (node.children && node.children.some((c) => c.id === childId)) {
      return node;
    }
    if (node.children && node.children.length > 0) {
      const found = findParentNode(node.children, childId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Collects all stable element IDs from a node tree.
 */
export function getAllNodeIds(nodes: ElementNode[], templateId?: string): Set<string> {
  const ids = new Set<string>();
  if (templateId) {
    ids.add(templateId);
  }

  function traverse(list: ElementNode[]) {
    for (const item of list) {
      ids.add(item.id);
      if (item.children && item.children.length > 0) {
        traverse(item.children);
      }
    }
  }

  traverse(nodes);
  return ids;
}

/**
 * Pure immutable recursive transformer that updates a single target node.
 */
export function mapNodeTree(
  nodes: ElementNode[],
  targetId: string,
  transform: (node: ElementNode) => ElementNode
): ElementNode[] {
  return nodes.map((node) => {
    if (node.id === targetId) {
      return transform(node);
    }
    if (node.children && node.children.length > 0) {
      return {
        ...node,
        children: mapNodeTree(node.children, targetId, transform),
      };
    }
    return node;
  });
}

/**
 * Pure immutable sibling reordering inside a parent container (or top-level template sections).
 */
export function reorderChildren(
  nodes: ElementNode[],
  parentId: string,
  sourceIndex: number,
  targetIndex: number,
  templateId?: string
): ElementNode[] {
  // Case 1: Reordering top-level sections in the root template
  if (templateId && parentId === templateId) {
    const copy = [...nodes];
    if (
      sourceIndex < 0 ||
      sourceIndex >= copy.length ||
      targetIndex < 0 ||
      targetIndex >= copy.length
    ) {
      return nodes;
    }
    const [moved] = copy.splice(sourceIndex, 1);
    copy.splice(targetIndex, 0, moved);
    return copy;
  }

  // Case 2: Reordering children inside a nested container ElementNode
  return nodes.map((node) => {
    if (node.id === parentId && node.children) {
      const copy = [...node.children];
      if (
        sourceIndex < 0 ||
        sourceIndex >= copy.length ||
        targetIndex < 0 ||
        targetIndex >= copy.length
      ) {
        return node;
      }
      const [moved] = copy.splice(sourceIndex, 1);
      copy.splice(targetIndex, 0, moved);
      return {
        ...node,
        version: node.version + 1,
        children: copy,
      };
    }
    if (node.children && node.children.length > 0) {
      return {
        ...node,
        children: reorderChildren(node.children, parentId, sourceIndex, targetIndex, templateId),
      };
    }
    return node;
  });
}
