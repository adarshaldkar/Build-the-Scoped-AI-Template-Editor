import type { ElementNode } from "./types";

export function findNodeById(nodes: ElementNode[], id: string): ElementNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) { const found = findNodeById(node.children, id); if (found) return found; }
  }
  return null;
}

export function findParentNode(nodes: ElementNode[], childId: string): ElementNode | null {
  for (const node of nodes) {
    if (node.children?.some((child) => child.id === childId)) return node;
    if (node.children) { const found = findParentNode(node.children, childId); if (found) return found; }
  }
  return null;
}

export function getAllNodeIds(nodes: ElementNode[], templateId?: string): Set<string> {
  const ids = new Set<string>();
  if (templateId) ids.add(templateId);
  const walk = (list: ElementNode[]) => list.forEach((node) => { ids.add(node.id); if (node.children) walk(node.children); });
  walk(nodes);
  return ids;
}

export function getAllNodes(nodes: ElementNode[]): ElementNode[] {
  const out: ElementNode[] = [];
  const walk = (list: ElementNode[]) => list.forEach((n) => { out.push(n); if (n.children) walk(n.children); });
  walk(nodes); return out;
}

export function getDescendantIds(node: ElementNode): string[] {
  const ids: string[] = [node.id];
  node.children?.forEach((child) => ids.push(...getDescendantIds(child)));
  return ids;
}

export function mapNodeTree(nodes: ElementNode[], targetId: string, transform: (node: ElementNode) => ElementNode): ElementNode[] {
  return nodes.map((node) => {
    const transformed = node.id === targetId ? transform(node) : node;
    return transformed.children
      ? { ...transformed, children: mapNodeTree(transformed.children, targetId, transform) }
      : transformed;
  });
}

export function reorderChildren(nodes: ElementNode[], parentId: string, sourceIndex: number, targetIndex: number): ElementNode[] {
  if (parentId === "__root__") {
    const next = [...nodes]; const [moved] = next.splice(sourceIndex, 1); next.splice(targetIndex, 0, moved); return next;
  }
  return mapNodeTree(nodes, parentId, (parent) => {
    if (!parent.children) return parent;
    const nextChildren = [...parent.children]; const [moved] = nextChildren.splice(sourceIndex, 1); nextChildren.splice(targetIndex, 0, moved);
    return { ...parent, children: nextChildren };
  });
}
