import React, { useState, useEffect, useRef, useMemo } from "react";
import type { ElementNode, TemplateModel, ValidationError } from "../lib/types";
import {
  templateToMarkup,
  validateMarkupSyntax,
} from "../lib/codeReconciler";
import { IconCode, IconClose, IconCheck, IconAlertCircle } from "./icons";

export interface CodeEditorProps {
  model: TemplateModel;
  selectedNode: ElementNode | null;
  isOpen: boolean;
  onClose: () => void;
  onApplyCommit: (markup: string, mode: "selected" | "full") => { success: boolean; error?: ValidationError };
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  model,
  selectedNode,
  isOpen,
  onClose,
  onApplyCommit,
}) => {
  const [mode, setMode] = useState<"selected" | "full">(
    selectedNode ? "selected" : "full"
  );
  const [draftCode, setDraftCode] = useState<string>("");
  const [commitError, setCommitError] = useState<ValidationError | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Sync draft code when modal opens or canonical model / target changes
  useEffect(() => {
    if (isOpen) {
      const initialMode = selectedNode ? "selected" : "full";
      setMode(initialMode);
      const initialMarkup =
        initialMode === "selected" && selectedNode
          ? templateToMarkup(selectedNode, "selected")
          : templateToMarkup(model, "full");
      setDraftCode(initialMarkup);
      setCommitError(null);
    }
  }, [isOpen, selectedNode?.id, model.revision]);

  // When toggling mode explicitly
  const handleModeChange = (newMode: "selected" | "full") => {
    setMode(newMode);
    setCommitError(null);
    const newMarkup =
      newMode === "selected" && selectedNode
        ? templateToMarkup(selectedNode, "selected")
        : templateToMarkup(model, "full");
    setDraftCode(newMarkup);
  };

  // Live syntax check on keystrokes
  const syntax = useMemo(() => {
    return validateMarkupSyntax(draftCode);
  }, [draftCode]);

  // Line numbers calculation
  const lineCount = useMemo(() => {
    return Math.max(1, draftCode.split("\n").length);
  }, [draftCode]);

  // Scroll sync between line numbers gutter and textarea
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Keyboard ergonomics: Tab (2 spaces), Shift+Tab, Cmd/Ctrl+Enter, Escape
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleApply();
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      if (!e.shiftKey) {
        // Insert 2 spaces
        const updated = draftCode.substring(0, start) + "  " + draftCode.substring(end);
        setDraftCode(updated);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        });
      } else {
        // Shift+Tab unindent
        const lineStart = draftCode.lastIndexOf("\n", start - 1) + 1;
        if (draftCode.substring(lineStart, lineStart + 2) === "  ") {
          const updated = draftCode.substring(0, lineStart) + draftCode.substring(lineStart + 2);
          setDraftCode(updated);
          requestAnimationFrame(() => {
            textarea.selectionStart = textarea.selectionEnd = Math.max(lineStart, start - 2);
          });
        }
      }
    }
  };

  // Discard changes & close
  const handleCancel = () => {
    setCommitError(null);
    onClose();
  };

  // Apply changes via reconciler & Phase 1 commit
  const handleApply = () => {
    if (!syntax.valid) return;

    setCommitError(null);
    const result = onApplyCommit(draftCode, mode);
    if (result.success) {
      onClose();
    } else if (result.error) {
      setCommitError(result.error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-fadeIn">
      <div
        className="w-full max-w-4xl h-[85vh] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden text-zinc-100 font-sans"
        role="dialog"
        aria-modal="true"
        aria-labelledby="code-editor-title"
      >
        {/* Top Header */}
        <div className="h-14 px-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90 select-none">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-md bg-zinc-800 text-zinc-300">
              <IconCode size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span id="code-editor-title" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Code Editor
                </span>
                <span className="text-zinc-600">/</span>
                <span className="text-xs font-medium text-zinc-200 truncate max-w-[200px]">
                  {mode === "selected" && selectedNode
                    ? selectedNode.name
                    : "Full Template"}
                </span>
              </div>
            </div>
          </div>

          {/* Scope Toggle: Selected Component vs Full Template */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
              <button
                type="button"
                onClick={() => handleModeChange("selected")}
                disabled={!selectedNode}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  mode === "selected"
                    ? "bg-zinc-800 text-zinc-100 shadow-xs"
                    : selectedNode
                    ? "text-zinc-400 hover:text-zinc-200"
                    : "text-zinc-600 cursor-not-allowed"
                }`}
              >
                Selected Element
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("full")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  mode === "full"
                    ? "bg-zinc-800 text-zinc-100 shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Full Template
              </button>
            </div>

            {/* Validation Badge */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                syntax.valid && !commitError
                  ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                  : "bg-red-950/60 border-red-800 text-red-300"
              }`}
            >
              {syntax.valid && !commitError ? (
                <>
                  <IconCheck size={12} />
                  <span>Valid Markup</span>
                </>
              ) : (
                <>
                  <IconAlertCircle size={12} />
                  <span>Invalid Code</span>
                </>
              )}
            </div>

            {/* Close */}
            <button
              type="button"
              onClick={handleCancel}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title="Close (Escape)"
            >
              <IconClose size={18} />
            </button>
          </div>
        </div>

        {/* Editor Body */}
        <div className="flex-1 flex overflow-hidden bg-zinc-950 font-mono text-[13px] leading-relaxed">
          {/* Gutter / Line Numbers */}
          <div
            ref={lineNumbersRef}
            className="w-14 py-4 bg-zinc-900/50 border-r border-zinc-800/80 select-none text-right pr-3.5 text-zinc-600 overflow-hidden"
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i + 1} className="h-[21.5px]">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Text Area */}
          <div className="flex-1 relative overflow-hidden">
            <textarea
              ref={textareaRef}
              value={draftCode}
              onChange={(e) => {
                setDraftCode(e.target.value);
                setCommitError(null);
              }}
              onScroll={handleScroll}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              wrap="off"
              className="w-full h-full p-4 bg-transparent text-zinc-100 resize-none outline-none font-mono text-[13px] leading-relaxed selection:bg-zinc-700 whitespace-pre overflow-auto"
              placeholder="<!-- Edit HTML markup with id and style attributes -->"
            />
          </div>
        </div>

        {/* Bottom Status Bar */}
        <div className="h-14 px-5 border-t border-zinc-800 bg-zinc-900/90 flex items-center justify-between text-xs">
          {/* Diagnostics Message */}
          <div className="flex items-center gap-2 flex-1 mr-4 overflow-hidden">
            {!syntax.valid ? (
              <span className="text-red-400 truncate">
                Line {syntax.line}: {syntax.error} (Last valid version preserved)
              </span>
            ) : commitError ? (
              <span className="text-red-400 truncate">
                {commitError.message}
              </span>
            ) : (
              <span className="text-zinc-400 truncate">
                Valid markup. Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-[11px]">⌘↵</kbd> or click Apply to commit.
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!syntax.valid}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm ${
                syntax.valid
                  ? "bg-zinc-100 text-zinc-900 hover:bg-white active:scale-98"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              }`}
            >
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
