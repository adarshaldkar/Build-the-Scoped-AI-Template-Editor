import React, { useState, useEffect, useCallback, useMemo } from "react";
import type {
  TemplateModel,
  Viewport,
  ElementNode,
  EditCommand,
  RevisionEntry,
  ValidationError,
} from "./lib/types";
import { executeCommit } from "./lib/commitPipeline";
import { reconcileMarkupToCommand } from "./lib/codeReconciler";
import { loadStoredState, saveStoredState } from "./lib/storage";
import { findNodeById } from "./lib/treeUtils";
import { pushUndoSnapshot } from "./lib/historyManager";
import { TopBar } from "./components/TopBar";
import { CanvasFrame } from "./components/CanvasFrame";
import { TemplateRenderer } from "./components/TemplateRenderer";
import { Inspector } from "./components/Inspector";
import { CodeEditor } from "./components/CodeEditor";
import { AiAssistant } from "./components/AiAssistant";
import { HistoryDrawer } from "./components/HistoryDrawer";
import type { AiProposal } from "./lib/aiEngine";

export const App: React.FC = () => {
  // 1. Persistent Canonical State & History
  const [model, setModel] = useState<TemplateModel>(() => loadStoredState().model);
  const [history, setHistory] = useState<RevisionEntry[]>(() => loadStoredState().history);

  // 2. Session-Only Linear Undo / Redo Stacks (Capped at 50)
  const [undoStack, setUndoStack] = useState<TemplateModel[]>([]);
  const [redoStack, setRedoStack] = useState<TemplateModel[]>([]);

  // 3. Active Workspace & Selection State
  const [activeViewport, setActiveViewport] = useState<Viewport>("desktop");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // 4. Overlays & Tool Drawers
  const [isCodeEditorOpen, setIsCodeEditorOpen] = useState<boolean>(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  // Synchronize state changes to LocalStorage
  useEffect(() => {
    saveStoredState(model, history);
  }, [model, history]);

  // Resolve currently selected node
  const selectedNode = useMemo<ElementNode | null>(() => {
    if (!selectedNodeId) return null;
    return findNodeById(model.elements, selectedNodeId);
  }, [model, selectedNodeId]);

  // Master Transaction Commit Execution
  const handleCommitCommand = useCallback(
    (command: EditCommand): { success: boolean; error?: ValidationError } => {
      const result = executeCommit(model, command);
      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Push current snapshot to bounded undo stack and clear redo
      setUndoStack((prev) => pushUndoSnapshot(prev, model));
      setRedoStack([]);

      // Update canonical model and append history entries
      setModel(result.model);
      setHistory((prev) => [...prev, ...result.historyEntries]);

      return { success: true };
    },
    [model]
  );

  // Linear Undo
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previousModel = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, model]);
    setModel(previousModel);
  }, [undoStack, model]);

  // Linear Redo
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const nextModel = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => pushUndoSnapshot(prev, model));
    setModel(nextModel);
  }, [redoStack, model]);

  // Apply Code Editor Reconciliation
  const handleApplyCodeCommit = useCallback(
    (markup: string, mode: "selected" | "full") => {
      const reconciled = reconcileMarkupToCommand(
        model,
        markup,
        model.revision,
        mode,
        selectedNodeId || undefined
      );

      if (!reconciled.success) {
        return { success: false, error: reconciled.error };
      }

      return handleCommitCommand(reconciled.command);
    },
    [model, selectedNodeId, handleCommitCommand]
  );

  // Apply AI Assistant Proposal
  const handleCommitAiProposal = useCallback(
    (proposal: AiProposal) => {
      return handleCommitCommand(proposal.command);
    },
    [handleCommitCommand]
  );

  // Prioritized Keyboard Shortcuts & Conflict Guards
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.getAttribute("contenteditable") === "true");

      // Global Undo / Redo (bypassed if typing inside native input)
      if (!isInputFocused && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
        return;
      }

      // Toggle Code Editor (Cmd+K)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCodeEditorOpen((prev) => !prev);
        return;
      }

      // Toggle AI Assistant (Cmd+/)
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setIsAssistantOpen((prev) => !prev);
        return;
      }

      // Prioritized Escape Hierarchy
      if (e.key === "Escape") {
        // Priority 1: Handled by inline text edit inside TemplateRenderer
        // Priority 2: Code Editor Modal
        if (isCodeEditorOpen) {
          e.preventDefault();
          setIsCodeEditorOpen(false);
          return;
        }
        // Priority 3: History Drawer
        if (isHistoryOpen) {
          e.preventDefault();
          setIsHistoryOpen(false);
          return;
        }
        // Priority 4: AI Assistant
        if (isAssistantOpen) {
          e.preventDefault();
          setIsAssistantOpen(false);
          return;
        }
        // Priority 5: Canvas Selection
        if (selectedNodeId) {
          e.preventDefault();
          setSelectedNodeId(null);
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo, isCodeEditorOpen, isHistoryOpen, isAssistantOpen, selectedNodeId]);

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans select-none">
      {/* Top Bar Header */}
      <TopBar
        revision={model.revision}
        activeViewport={activeViewport}
        onViewportChange={setActiveViewport}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onToggleCodeEditor={() => setIsCodeEditorOpen((prev) => !prev)}
        onToggleAssistant={() => setIsAssistantOpen((prev) => !prev)}
        onToggleHistory={() => setIsHistoryOpen((prev) => !prev)}
        isCodeEditorOpen={isCodeEditorOpen}
        isAssistantOpen={isAssistantOpen}
        isHistoryOpen={isHistoryOpen}
      />

      {/* Main Workspace Layout: Visual Canvas + Docked Right Inspector */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Visual Canvas Frame */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <CanvasFrame
            activeViewport={activeViewport}
            onClearSelection={() => setSelectedNodeId(null)}
          >
            <TemplateRenderer
              model={model}
              activeViewport={activeViewport}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              onCommitCommand={handleCommitCommand}
              onOpenCodeEditor={() => setIsCodeEditorOpen(true)}
              onOpenAssistant={() => setIsAssistantOpen(true)}
            />
          </CanvasFrame>
        </main>

        {/* Docked Right Inspector Panel */}
        <Inspector
          model={model}
          selectedNode={selectedNode}
          activeViewport={activeViewport}
          onCommitCommand={handleCommitCommand}
        />
      </div>

      {/* Code Editor Modal (Cmd+K) */}
      <CodeEditor
        model={model}
        selectedNode={selectedNode}
        isOpen={isCodeEditorOpen}
        onClose={() => setIsCodeEditorOpen(false)}
        onApplyCommit={handleApplyCodeCommit}
      />

      {/* AI Assistant Command Drawer (Cmd+/) */}
      <AiAssistant
        model={model}
        selectedNode={selectedNode}
        activeViewport={activeViewport}
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        onCommitProposal={handleCommitAiProposal}
      />

      {/* Audit History Drawer */}
      <HistoryDrawer
        model={model}
        history={history}
        selectedNode={selectedNode}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onCommitCommand={handleCommitCommand}
      />
    </div>
  );
};
