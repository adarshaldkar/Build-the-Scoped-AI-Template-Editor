import React, { useEffect, useMemo, useRef, useState } from "react";
import type { EditCommand, ElementNode, TemplateModel } from "../lib/types";
import { reconcileMarkupToCommand, templateToMarkup, validateMarkupSyntax } from "../lib/codeReconciler";
import { IconCheck, IconAlertCircle, IconClose } from "./icons";

interface Props {
  model: TemplateModel;
  selectedNode: ElementNode | null;
  isOpen: boolean;
  onClose: () => void;
  onApplyCommit: (command: EditCommand) => { success: boolean; error?: { message: string } };
}

// Token types for restrained syntax highlighting
function highlightCodeLine(line: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  let pos = 0;
  let keyIndex = 0;

  while (pos < line.length) {
    // 1. Tag openings/closings: <tag, </tag, >, />
    const tagMatch = /^(<\/?[a-zA-Z0-9-]+|\/?>)/.exec(line.slice(pos));
    if (tagMatch) {
      tokens.push(
        <span key={keyIndex++} className="text-sky-400 font-medium">
          {tagMatch[0]}
        </span>
      );
      pos += tagMatch[0].length;
      continue;
    }

    // 2. Attribute names: id=, style=, src=, alt=, href=, type=
    const attrMatch = /^([a-zA-Z_:][-a-zA-Z0-9_:.]*)(\s*=\s*)/.exec(line.slice(pos));
    if (attrMatch) {
      tokens.push(
        <span key={keyIndex++} className="text-purple-300">
          {attrMatch[1]}
        </span>
      );
      tokens.push(
        <span key={keyIndex++} className="text-zinc-500">
          {attrMatch[2]}
        </span>
      );
      pos += attrMatch[0].length;
      continue;
    }

    // 3. Quoted attribute values: "..." or '...'
    const strMatch = /^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/.exec(line.slice(pos));
    if (strMatch) {
      const raw = strMatch[0];
      // Special highlighting for style="..." contents
      if (raw.includes(":") || raw.includes(";")) {
        tokens.push(
          <span key={keyIndex++} className="text-emerald-300">
            {raw[0]}
          </span>
        );
        const inner = raw.slice(1, -1);
        const declarations = inner.split(/(;)/);
        declarations.forEach((dec) => {
          if (dec === ";") {
            tokens.push(
              <span key={keyIndex++} className="text-zinc-500">
                ;
              </span>
            );
          } else {
            const colon = dec.indexOf(":");
            if (colon > 0) {
              const prop = dec.slice(0, colon);
              const val = dec.slice(colon + 1);
              tokens.push(
                <span key={keyIndex++} className="text-amber-300/90">
                  {prop}
                </span>
              );
              tokens.push(
                <span key={keyIndex++} className="text-zinc-400">
                  :
                </span>
              );
              tokens.push(
                <span key={keyIndex++} className="text-emerald-200">
                  {val}
                </span>
              );
            } else {
              tokens.push(
                <span key={keyIndex++} className="text-emerald-300">
                  {dec}
                </span>
              );
            }
          }
        });
        tokens.push(
          <span key={keyIndex++} className="text-emerald-300">
            {raw[raw.length - 1]}
          </span>
        );
      } else {
        tokens.push(
          <span key={keyIndex++} className="text-emerald-300">
            {raw}
          </span>
        );
      }
      pos += raw.length;
      continue;
    }

    // 4. HTML comments: <!-- ... -->
    const commentMatch = /^<!--.*?-->/.exec(line.slice(pos));
    if (commentMatch) {
      tokens.push(
        <span key={keyIndex++} className="text-zinc-500 italic">
          {commentMatch[0]}
        </span>
      );
      pos += commentMatch[0].length;
      continue;
    }

    // 5. Plain text content between tags
    const nextTag = line.indexOf("<", pos);
    const chunk = nextTag < 0 ? line.slice(pos) : line.slice(pos, nextTag);
    if (chunk) {
      tokens.push(
        <span key={keyIndex++} className="text-zinc-100">
          {chunk}
        </span>
      );
      pos += chunk.length;
    } else {
      tokens.push(
        <span key={keyIndex++} className="text-zinc-100">
          {line[pos]}
        </span>
      );
      pos++;
    }
  }

  return tokens.length ? tokens : [<span key="empty">&nbsp;</span>];
}

export const CodeEditor: React.FC<Props> = ({
  model,
  selectedNode,
  isOpen,
  onClose,
  onApplyCommit,
}) => {
  const [mode, setMode] = useState<"selected" | "full">("selected");
  const [draft, setDraft] = useState("");
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wordWrap, setWordWrap] = useState(true);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const preRef = useRef<HTMLPreElement | null>(null);
  const lineGutterRef = useRef<HTMLDivElement | null>(null);

  const lines = useMemo(() => draft.split("\n"), [draft]);
  const lineCount = Math.max(1, lines.length);

  const syncDraft = () => {
    const code =
      mode === "selected" && selectedNode
        ? templateToMarkup(selectedNode, "selected")
        : templateToMarkup(model, "full");
    setDraft(code);
    setDirty(false);
    setError(null);
  };

  useEffect(() => {
    if (isOpen && !dirty) syncDraft();
  }, [isOpen, selectedNode?.id, model.revision, mode]);

  useEffect(() => {
    if (!isOpen) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setDirty(false);
        setError(null);
        onClose();
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const syntax = validateMarkupSyntax(draft);
  const errorLine = error ? undefined : !syntax.valid ? syntax.line : undefined;

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const top = e.currentTarget.scrollTop;
    const left = e.currentTarget.scrollLeft;
    if (preRef.current) {
      preRef.current.scrollTop = top;
      preRef.current.scrollLeft = left;
    }
    if (lineGutterRef.current) {
      lineGutterRef.current.scrollTop = top;
    }
  };

  const apply = () => {
    setError(null);
    if (!syntax.valid) {
      setError(syntax.error ?? "Invalid markup.");
      return;
    }
    const result = reconcileMarkupToCommand(
      model,
      draft,
      model.revision,
      mode,
      selectedNode?.id
    );
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    const commit = onApplyCommit(result.command);
    if (!commit.success) {
      setError(commit.error?.message ?? "Commit failed.");
      return;
    }
    setDirty(false);
    syncDraft();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 sm:p-10 animate-fade-in">
      <div className="w-full max-w-5xl h-[82vh] bg-[#121214] text-zinc-100 rounded-2xl border border-zinc-800/80 shadow-2xl overflow-hidden flex flex-col">
        {/* Editor TopBar Header */}
        <div className="h-14 border-b border-zinc-800/80 bg-[#16161a] px-5 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold tracking-widest bg-zinc-800 text-zinc-200 border border-zinc-700">
                CODE
              </span>
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                <span>Current Element:</span>
                <span className="text-zinc-200 font-semibold truncate max-w-[180px]">
                  {mode === "selected" ? selectedNode?.name ?? "None" : "Full Template"}
                </span>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800 text-[10px] font-mono">
              <span>Rev</span>
              <span className="text-zinc-200 font-bold">{model.revision}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher */}
            <div className="flex items-center bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setMode("selected");
                  setDirty(false);
                  setError(null);
                }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  mode === "selected"
                    ? "bg-zinc-800 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Selected Component
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("full");
                  setDirty(false);
                  setError(null);
                }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  mode === "full"
                    ? "bg-zinc-800 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Full Template
              </button>
            </div>

            {/* Word Wrap Toggle */}
            <button
              type="button"
              onClick={() => setWordWrap((w) => !w)}
              className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-colors ${
                wordWrap
                  ? "bg-zinc-800/80 border-zinc-700 text-zinc-200"
                  : "bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-300"
              }`}
              title="Toggle Word Wrap"
            >
              Wrap: {wordWrap ? "On" : "Off"}
            </button>

            {/* Syntax Status Badge */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${
                syntax.valid && !error
                  ? "bg-emerald-950/40 border-emerald-800/80 text-emerald-400"
                  : "bg-rose-950/40 border-rose-800/80 text-rose-400"
              }`}
            >
              {syntax.valid && !error ? (
                <>
                  <IconCheck size={13} className="text-emerald-400" />
                  <span>Valid Markup</span>
                </>
              ) : (
                <>
                  <IconAlertCircle size={13} className="text-rose-400" />
                  <span>
                    {errorLine ? `Invalid · Line ${errorLine}` : "Invalid Code"}
                  </span>
                </>
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                setDirty(false);
                setError(null);
                onClose();
              }}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors ml-1"
              title="Close (Esc)"
            >
              <IconClose size={18} />
            </button>
          </div>
        </div>

        {/* Code Workspace Body */}
        <div className="flex-1 flex overflow-hidden font-mono text-[13px] leading-[22px] bg-[#121214] relative">
          {/* Line Numbers Gutter */}
          <div
            ref={lineGutterRef}
            className="w-14 shrink-0 bg-[#0e0e10] border-r border-zinc-800/60 text-right pr-3 pt-4 text-zinc-600 select-none overflow-hidden"
          >
            {Array.from({ length: lineCount }, (_, i) => {
              const lineNum = i + 1;
              const isErr = errorLine === lineNum;
              return (
                <div
                  key={i}
                  className={`h-[22px] flex items-center justify-end gap-1 ${
                    isErr ? "text-rose-400 font-bold bg-rose-950/40" : ""
                  }`}
                >
                  {isErr && <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>}
                  <span>{lineNum}</span>
                </div>
              );
            })}
          </div>

          {/* Code Container with Syntax Highlight Overlay */}
          <div className="relative flex-1 h-full overflow-hidden">
            {/* Syntax Highlighted Backdrop */}
            <pre
              ref={preRef}
              aria-hidden="true"
              className={`absolute inset-0 p-4 m-0 pointer-events-none font-mono text-[13px] leading-[22px] text-zinc-100 overflow-hidden ${
                wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre"
              }`}
            >
              {lines.map((l, idx) => (
                <div key={idx} className="min-h-[22px]">
                  {highlightCodeLine(l)}
                </div>
              ))}
            </pre>

            {/* Interactive Transparent Textarea */}
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setDirty(true);
                setError(null);
              }}
              onScroll={handleScroll}
              onKeyDown={(e) => {
                if (e.key === "Tab") {
                  e.preventDefault();
                  const ta = e.currentTarget;
                  const start = ta.selectionStart;
                  const end = ta.selectionEnd;
                  ta.setRangeText("  ", start, end, "end");
                  setDraft(ta.value);
                  setDirty(true);
                } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  if (syntax.valid) apply();
                }
              }}
              spellCheck={false}
              wrap={wordWrap ? "soft" : "off"}
              className={`absolute inset-0 w-full h-full p-4 bg-transparent outline-none resize-none font-mono text-[13px] leading-[22px] text-transparent caret-white selection:bg-blue-500/40 ${
                wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre"
              }`}
              aria-label="HTML code editor"
            />
          </div>
        </div>

        {/* Footer Actions & Diagnostics */}
        <div className="h-16 border-t border-zinc-800/80 bg-[#16161a] px-5 flex items-center justify-between gap-4 shrink-0">
          <div className="flex-1 text-xs truncate">
            {error ? (
              <span className="text-rose-400 flex items-center gap-1.5">
                <IconAlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
                <span className="text-zinc-500 ml-1">· No changes have been applied.</span>
              </span>
            ) : !syntax.valid ? (
              <span className="text-rose-400 flex items-center gap-1.5">
                <IconAlertCircle size={14} className="shrink-0" />
                <span>
                  Line {syntax.line ?? 1}: {syntax.error ?? "Invalid syntax"}
                </span>
                <span className="text-zinc-500 ml-1">· No changes have been applied.</span>
              </span>
            ) : (
              <span className="text-zinc-400 flex items-center gap-1.5">
                <IconCheck size={14} className="text-emerald-400 shrink-0" />
                <span>Valid markup. Apply to commit changes to the active document.</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setDirty(false);
                setError(null);
                syncDraft();
                onClose();
              }}
              className="px-4 py-2 rounded-lg border border-zinc-700 bg-zinc-800/60 hover:bg-zinc-800 text-xs font-medium text-zinc-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={!syntax.valid || !draft.trim()}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                syntax.valid && draft.trim()
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20"
                  : "bg-zinc-800 text-zinc-500 opacity-40 cursor-not-allowed border border-zinc-700/50"
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
