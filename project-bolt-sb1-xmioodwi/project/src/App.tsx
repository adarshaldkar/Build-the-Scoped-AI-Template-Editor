import { useState, useCallback } from "react";
import type { ElementNode, Viewport, Scope, Proposal, Revision } from "./lib/types";
import { initialTree, initialHistory } from "./lib/data";
import { TopBar } from "./components/TopBar";
import { LayersPanel } from "./components/LayersPanel";
import { Canvas } from "./components/Canvas";
import { Inspector } from "./components/Inspector";
import { AssistantBar } from "./components/AssistantBar";
import { ProposalReview } from "./components/ProposalReview";
import { HistoryDrawer } from "./components/HistoryDrawer";
import { CodeEditor } from "./components/CodeEditor";

function updateNode(tree: ElementNode[], id: string, fn: (n: ElementNode) => ElementNode): ElementNode[] {
  return tree.map((n) => {
    if (n.id === id) return fn(n);
    if (n.children) return { ...n, children: updateNode(n.children, id, fn) };
    return n;
  });
}

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

export default function App() {
  const [tree, setTree] = useState<ElementNode[]>(initialTree);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hidden] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<Revision[]>(initialHistory);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [showCode, setShowCode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [past, setPast] = useState<ElementNode[][]>([]);
  const [future, setFuture] = useState<ElementNode[][]>([]);

  /* ---------- selection ---------- */
  const handleSelect = useCallback((id: string, shift: boolean) => {
    setSelectedIds((prev) => {
      if (shift) {
        return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      }
      return [id];
    });
  }, []);

  const handleClearSelection = useCallback(() => setSelectedIds([]), []);
  const handleDeselect = useCallback((id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  }, []);

  /* ---------- editing ---------- */
  const pushHistory = (newTree: ElementNode[]) => {
    setPast((p) => [...p, tree]);
    setFuture([]);
    setTree(newTree);
  };

  const handlePropChange = (id: string, key: string, value: string | number) => {
    const newTree = updateNode(tree, id, (n) => ({
      ...n,
      props: { ...n.props, [key]: value },
    }));
    pushHistory(newTree);
  };

  const handleContentChange = (id: string, value: string) => {
    const newTree = updateNode(tree, id, (n) => ({ ...n, content: value }));
    pushHistory(newTree);
    const node = findNode(tree, id);
    if (node) {
      setHistory((h) => [
        {
          id: `r${Date.now()}`,
          time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
          kind: "manual",
          element: node.name,
          scope: "all",
          before: node.content ?? "",
          after: value,
        },
        ...h,
      ]);
    }
  };

  /* ---------- undo / redo ---------- */
  const handleUndo = () => {
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [tree, ...f]);
    setTree(prev);
  };
  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setPast((p) => [...p, tree]);
    setTree(next);
  };

  /* ---------- AI proposals ---------- */
  const handleAssistantSubmit = (prompt: string, scope: Scope) => {
    if (selectedIds.length === 0) {
      // Show a stale-style error proposal
      setProposals([
        {
          id: `p${Date.now()}`,
          elementId: "none",
          elementName: "No selection",
          before: "",
          after: "Select an element on the canvas before requesting an edit.",
          scope,
          status: "pending",
          stale: true,
        },
      ]);
      return;
    }

    const newProposals: Proposal[] = selectedIds.map((id) => {
      const node = findNode(tree, id);
      const before = node?.content ?? "";
      // Deterministic-ish edit simulation
      let after = before;
      const lower = prompt.toLowerCase();
      if (lower.includes("rewrite") || lower.includes("heading")) {
        after = before.replace(/faster|quickly|easy/i, "with confidence");
        if (after === before) after = "Launch your website with confidence";
      } else if (lower.includes("larger") || lower.includes("bigger")) {
        after = `${before} (scaled +20%)`;
      } else if (lower.includes("smaller")) {
        after = `${before} (scaled -15%)`;
      } else if (lower.includes("move") || lower.includes("down")) {
        after = `${before} (reordered)`;
      } else {
        after = before ? `${before} — refined` : "New content from assistant";
      }
      return {
        id: `p${Date.now()}-${id}`,
        elementId: id,
        elementName: node?.name ?? "Element",
        before,
        after,
        scope,
        status: "pending",
      };
    });
    setProposals(newProposals);
  };

  const handleAcceptProposal = (id: string) => {
    const proposal = proposals.find((p) => p.id === id);
    if (!proposal || proposal.status !== "pending") return;
    if (proposal.stale || proposal.elementId === "none") {
      setProposals((ps) => ps.map((p) => (p.id === id ? { ...p, status: "rejected" } : p)));
      return;
    }
    const newTree = updateNode(tree, proposal.elementId, (n) => ({
      ...n,
      content: proposal.after,
    }));
    pushHistory(newTree);
    setHistory((h) => [
      {
        id: `r${Date.now()}`,
        time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        kind: "ai",
        element: proposal.elementName,
        scope: proposal.scope,
        before: proposal.before,
        after: proposal.after,
      },
      ...h,
    ]);
    setProposals((ps) => ps.map((p) => (p.id === id ? { ...p, status: "accepted" } : p)));
  };

  const handleRejectProposal = (id: string) => {
    setProposals((ps) => ps.map((p) => (p.id === id ? { ...p, status: "rejected" } : p)));
  };

  const handleAcceptAll = () => {
    proposals.filter((p) => p.status === "pending" && !p.stale && p.elementId !== "none").forEach((p) => handleAcceptProposal(p.id));
  };

  const handleDismissProposals = () => setProposals([]);

  /* ---------- history restore ---------- */
  const handleRestore = (r: Revision) => {
    // find the element by name and set content
    const findByName = (nodes: ElementNode[]): ElementNode | null => {
      for (const n of nodes) {
        if (n.name === r.element) return n;
        if (n.children) {
          const f = findByName(n.children);
          if (f) return f;
        }
      }
      return null;
    };
    const node = findByName(tree);
    if (node) {
      const newTree = updateNode(tree, node.id, (n) => ({ ...n, content: r.after }));
      pushHistory(newTree);
      setSelectedIds([node.id]);
    }
    setShowHistory(false);
  };

  /* ---------- preview / reset / publish ---------- */
  const handlePreview = () => {};
  const handleReset = () => {
    setTree(initialTree);
    setSelectedIds([]);
    setPast([]);
    setFuture([]);
  };
  const handlePublish = () => {
    // no-op visual confirmation
  };

  const currentElementName = selectedIds.length === 1 ? findNode(tree, selectedIds[0])?.name ?? null : null;

  return (
    <div className="h-full flex flex-col bg-canvas-bg select-none">
      <TopBar
        viewport={viewport}
        onViewport={setViewport}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onPreview={handlePreview}
        onReset={handleReset}
        onPublish={handlePublish}
        onToggleCode={() => setShowCode((v) => !v)}
        onToggleHistory={() => setShowHistory((v) => !v)}
        showCode={showCode}
        showHistory={showHistory}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <LayersPanel tree={tree} selectedIds={selectedIds} onSelect={handleSelect} />

        <Canvas
          tree={tree}
          viewport={viewport}
          selectedIds={selectedIds}
          hidden={hidden}
          onSelect={handleSelect}
          onClearSelection={handleClearSelection}
        />

        <Inspector
          tree={tree}
          selectedIds={selectedIds}
          viewport={viewport}
          onViewport={setViewport}
          onPropChange={handlePropChange}
          onContentChange={handleContentChange}
          onDeselect={handleDeselect}
        />

        {/* Floating overlays */}
        <ProposalReview
          proposals={proposals}
          onAccept={handleAcceptProposal}
          onReject={handleRejectProposal}
          onAcceptAll={handleAcceptAll}
          onDismiss={handleDismissProposals}
        />

        <HistoryDrawer
          open={showHistory}
          history={history}
          onClose={() => setShowHistory(false)}
          onRestore={handleRestore}
        />

        <CodeEditor
          open={showCode}
          elementName={currentElementName}
          onClose={() => setShowCode(false)}
          onApply={() => {}}
        />
      </div>

      <AssistantBar tree={tree} selectedIds={selectedIds} onSubmit={handleAssistantSubmit} />
    </div>
  );
}
