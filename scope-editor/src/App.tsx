import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { initialTemplateModel } from "./lib/templateData";
import type { EditCommand, ElementNode, RevisionEntry, TemplateModel, Viewport } from "./lib/types";
import { findNodeById } from "./lib/treeUtils";
import { executeCommit } from "./lib/commitPipeline";
import { loadStoredState, saveStoredState, clearStoredState } from "./lib/storage";
import { pushUndoSnapshot } from "./lib/historyManager";
import { TopBar } from "./components/TopBar";
import { LayersPanel } from "./components/LayersPanel";
import { CanvasFrame } from "./components/CanvasFrame";
import { TemplateRenderer } from "./components/TemplateRenderer";
import { Inspector } from "./components/Inspector";
import { CodeEditor } from "./components/CodeEditor";
import { AiAssistant } from "./components/AiAssistant";
import { HistoryDrawer } from "./components/HistoryDrawer";

const clone = <T,>(v: T): T => structuredClone(v);

export default function App() {
  const [model, setModel] = useState<TemplateModel>(() => loadStoredState().model);
  const [history, setHistory] = useState<RevisionEntry[]>(() => loadStoredState().history);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeViewport, setActiveViewport] = useState<Viewport>("desktop");
  const [undoStack, setUndoStack] = useState<TemplateModel[]>([]);
  const [redoStack, setRedoStack] = useState<TemplateModel[]>([]);
  const [codeOpen, setCodeOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [saved, setSaved] = useState(true);

  // Toggleable panel states (open by default on desktop)
  const [layersOpen, setLayersOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);

  const revisionClock = useRef(model.revision);
  useEffect(() => { revisionClock.current = Math.max(revisionClock.current, model.revision); }, [model.revision]);
  useEffect(() => { saveStoredState(model, history); setSaved(true); }, [model, history]);

  const selectedNodes = useMemo(() => selectedIds.map((id) => findNodeById(model.elements, id)).filter((n): n is ElementNode => Boolean(n)), [model.elements, selectedIds]);
  const selectedNode = selectedNodes[0] ?? null;

  const commit = useCallback((command: EditCommand) => {
    setSaved(false);
    const result = executeCommit(model, command);
    if (!result.success) return result;
    setUndoStack((prev) => pushUndoSnapshot(prev, model));
    setRedoStack([]);
    revisionClock.current = result.model.revision;
    setModel(result.model);
    setHistory((prev) => [...prev, ...result.historyEntries]);
    return result;
  }, [model]);

  const handleSelection = (id: string, additive: boolean) => {
    setSelectedIds((prev) => additive ? (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]) : [id]);
  };

  const undo = () => setUndoStack((prev) => {
    if (!prev.length) return prev;
    const next = [...prev];
    const snapshot = next.pop()!;
    setRedoStack((r) => [...r, clone(model)]);
    const restored = clone(snapshot);
    restored.revision = ++revisionClock.current;
    restored.updatedAt = new Date().toISOString();
    setModel(restored);
    setSaved(false);
    return next;
  });

  const redo = () => setRedoStack((prev) => {
    if (!prev.length) return prev;
    const next = [...prev];
    const snapshot = next.pop()!;
    setUndoStack((u) => pushUndoSnapshot(u, model));
    const restored = clone(snapshot);
    restored.revision = ++revisionClock.current;
    restored.updatedAt = new Date().toISOString();
    setModel(restored);
    setSaved(false);
    return next;
  });

  const reset = () => {
    setModel(clone(initialTemplateModel));
    setHistory([]);
    setUndoStack([]);
    setRedoStack([]);
    setSelectedIds([]);
    revisionClock.current = initialTemplateModel.revision;
    clearStoredState();
    setSaved(false);
    setResetConfirm(false);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const editing = target?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "");
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === "z" && !editing) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if (meta && e.key.toLowerCase() === "k" && !editing) { e.preventDefault(); setCodeOpen((v) => !v); return; }
      if (meta && e.key === "/" && !editing) { e.preventDefault(); setAssistantOpen((v) => !v); return; }
      if (meta && e.key.toLowerCase() === "b" && !editing) { e.preventDefault(); setLayersOpen((v) => !v); return; }
      if (meta && e.key.toLowerCase() === "i" && !editing) { e.preventDefault(); setInspectorOpen((v) => !v); return; }
      if (e.key === "Escape") {
        if (resetConfirm) { setResetConfirm(false); return; }
        if (codeOpen) { setCodeOpen(false); return; }
        if (historyOpen) { setHistoryOpen(false); return; }
        if (assistantOpen) { setAssistantOpen(false); return; }
        if (selectedIds.length) { setSelectedIds([]); return; }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [codeOpen, historyOpen, assistantOpen, selectedIds, resetConfirm, model, undoStack, redoStack]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#efede8] text-zinc-900 flex flex-col font-sans">
      {/* Top Navigation Bar with Working Menus & Panel Toggles */}
      <TopBar
        revision={model.revision}
        activeViewport={activeViewport}
        onViewportChange={setActiveViewport}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={undo}
        onRedo={redo}
        onToggleCodeEditor={() => setCodeOpen(true)}
        onToggleAssistant={() => setAssistantOpen(true)}
        onToggleHistory={() => setHistoryOpen(true)}
        onReset={() => setResetConfirm(true)}
        saved={saved}
        layersOpen={layersOpen}
        onToggleLayers={() => setLayersOpen((v) => !v)}
        inspectorOpen={inspectorOpen}
        onToggleInspector={() => setInspectorOpen((v) => !v)}
      />

      {/* Main Studio Body Workspace */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Docked Left Sidebar: Layers Panel on Large Screens (Collapsible) */}
        <div
          className={`${
            layersOpen ? "w-60" : "w-0"
          } hidden lg:flex shrink-0 h-full overflow-hidden transition-[width] duration-200 border-r border-zinc-200/80 bg-[#fbfbfa]`}
        >
          <div className="w-60 h-full shrink-0">
            <LayersPanel model={model} selectedIds={selectedIds} onSelect={handleSelection} />
          </div>
        </div>

        {/* Mobile/Tablet Off-Canvas Layers Drawer */}
        {layersOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity"
              onClick={() => setLayersOpen(false)}
            />
            <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl z-10 flex flex-col animate-slide-right">
              <div className="h-10 px-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
                <span className="text-xs font-semibold text-zinc-700">Layers Explorer</span>
                <button
                  type="button"
                  onClick={() => setLayersOpen(false)}
                  className="text-xs text-zinc-400 hover:text-zinc-700 px-2 py-1"
                >
                  Close
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <LayersPanel model={model} selectedIds={selectedIds} onSelect={handleSelection} />
              </div>
            </div>
          </div>
        )}

        {/* Center Main Canvas Area */}
        <main className="flex-1 min-w-0 h-full flex flex-col overflow-hidden relative">
          <CanvasFrame
            activeViewport={activeViewport}
            onClearSelection={() => setSelectedIds([])}
          >
            <TemplateRenderer
              model={model}
              activeViewport={activeViewport}
              selectedNodeIds={selectedIds}
              onSelectNode={handleSelection}
              onCommitCommand={(c) => commit(c)}
            />
          </CanvasFrame>
        </main>

        {/* Docked Right Sidebar: Inspector on Large Screens (Collapsible) */}
        <div
          className={`${
            inspectorOpen ? "w-[300px]" : "w-0"
          } hidden lg:flex shrink-0 h-full overflow-hidden transition-[width] duration-200 border-l border-zinc-200/80 bg-[#fbfbfa]`}
        >
          <div className="w-[300px] h-full shrink-0">
            <Inspector
              model={model}
              selectedNodes={selectedNodes}
              activeViewport={activeViewport}
              onCommitCommand={(c) => commit(c)}
            />
          </div>
        </div>

        {/* Mobile/Tablet Off-Canvas Inspector Drawer */}
        {inspectorOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity"
              onClick={() => setInspectorOpen(false)}
            />
            <div className="relative w-80 max-w-[90vw] bg-white h-full shadow-2xl z-10 flex flex-col animate-slide-left">
              <div className="h-10 px-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
                <span className="text-xs font-semibold text-zinc-700">Property Inspector</span>
                <button
                  type="button"
                  onClick={() => setInspectorOpen(false)}
                  className="text-xs text-zinc-400 hover:text-zinc-700 px-2 py-1"
                >
                  Close
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <Inspector
                  model={model}
                  selectedNodes={selectedNodes}
                  activeViewport={activeViewport}
                  onCommitCommand={(c) => commit(c)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Drawers & Modals */}
      <CodeEditor
        model={model}
        selectedNode={selectedNode}
        isOpen={codeOpen}
        onClose={() => setCodeOpen(false)}
        onApplyCommit={(c) => commit(c)}
      />

      <AiAssistant
        model={model}
        selectedNodes={selectedNodes}
        activeViewport={activeViewport}
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        onCommitProposal={(c) =>
          c
            ? commit(c)
            : {
                success: false,
                error: { code: "NO_CHANGES", message: "No accepted changes." },
              }
        }
      />

      <HistoryDrawer
        model={model}
        history={history}
        selectedNode={selectedNode}
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onCommitCommand={(c) => commit(c)}
      />

      {/* Reset Confirmation Dialog */}
      {resetConfirm && (
        <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-[360px] bg-white rounded-xl border border-zinc-200 shadow-2xl p-5">
            <h2 className="text-sm font-semibold text-zinc-900">Reset template?</h2>
            <p className="mt-2 text-xs text-zinc-500 leading-relaxed">
              This action restores the initial NOVA Studio template. Your session history and overrides will be reset.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setResetConfirm(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={reset}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-zinc-900 text-white hover:bg-zinc-800"
              >
                Reset Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
