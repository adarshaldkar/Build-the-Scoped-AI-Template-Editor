import { useState } from "react";
import { sampleCode } from "../lib/data";
import { IconCode, IconClose, IconCheck, IconAlert } from "./icons";

export function CodeEditor({
  open,
  elementName,
  onClose,
  onApply,
}: {
  open: boolean;
  elementName: string | null;
  onClose: () => void;
  onApply: (code: string) => void;
}) {
  const [code, setCode] = useState(sampleCode);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  if (!open) return null;

  const validate = (c: string) => {
    const openTags = (c.match(/<(\w+)[\s>]/g) || []).length;
    const closeTags = (c.match(/<\/(\w+)>/g) || []).length;
    const selfClosing = (c.match(/<(\w+)[^>]*\/>/g) || []).length;
    if (openTags - selfClosing !== closeTags) {
      return "Invalid template structure — unmatched tags.";
    }
    return null;
  };

  const handleChange = (v: string) => {
    setCode(v);
    setApplied(false);
    setError(validate(v));
  };

  const handleApply = () => {
    const err = validate(code);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setApplied(true);
    onApply(code);
    setTimeout(() => setApplied(false), 2000);
  };

  const lines = code.split("\n");

  return (
    <div className="absolute inset-0 z-50 bg-canvas-bg/95 backdrop-blur-[2px] flex flex-col">
      {/* Top bar */}
      <div className="h-11 shrink-0 bg-canvas-surface border-b border-canvas-line flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <IconCode size={15} className="text-canvas-sub" />
          <span className="text-ctrl font-semibold text-canvas-ink">Code</span>
          <span className="text-meta text-canvas-faint">·</span>
          <span className="text-meta text-canvas-faint">
            Current element: {elementName ?? "None"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {error ? (
            <div className="flex items-center gap-1.5 px-2 h-7 rounded-md bg-[#FBEEEC] border border-[#F3D4D0]">
              <IconAlert size={13} className="text-canvas-err" />
              <span className="text-meta text-canvas-err font-medium">Invalid code</span>
            </div>
          ) : applied ? (
            <div className="flex items-center gap-1.5 px-2 h-7 rounded-md bg-[#EAF5EE] border border-[#C9E4D2]">
              <IconCheck size={13} className="text-canvas-ok" />
              <span className="text-meta text-canvas-ok font-medium">Applied</span>
            </div>
          ) : null}
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-canvas-sub hover:bg-canvas-line2 hover:text-canvas-ink transition-colors-fast focus-ring"
          >
            <IconClose size={16} />
          </button>
        </div>
      </div>

      {/* Editor body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Line numbers */}
        <div className="shrink-0 w-12 bg-canvas-surface border-r border-canvas-line py-3 text-right pr-3 select-none">
          {lines.map((_, i) => (
            <div key={i} className="text-meta text-canvas-faint font-mono leading-[1.65]">
              {i + 1}
            </div>
          ))}
        </div>
        {/* Code */}
        <textarea
          value={code}
          onChange={(e) => handleChange(e.target.value)}
          spellCheck={false}
          className="code-area flex-1 bg-canvas-paper border-0 resize-none p-3 text-canvas-ink focus:outline-none"
          style={{ whiteSpace: "pre", overflowX: "auto" }}
        />
      </div>

      {/* Error / status bar */}
      <div className="h-10 shrink-0 bg-canvas-surface border-t border-canvas-line flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          {error ? (
            <>
              <IconAlert size={13} className="text-canvas-err" />
              <span className="text-ctrl text-canvas-err">{error}</span>
              <span className="text-meta text-canvas-faint">Last valid version preserved.</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-canvas-ok" />
              <span className="text-ctrl text-canvas-sub">Valid markup</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="inline-flex items-center px-3 h-7 rounded-md text-ctrl text-canvas-sub hover:bg-canvas-line2 transition-colors-fast focus-ring"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!!error}
            className="inline-flex items-center gap-1.5 px-3 h-7 rounded-md bg-canvas-ink text-white text-ctrl font-medium hover:bg-canvas-ink/90 transition-colors-fast focus-ring disabled:opacity-40 disabled:pointer-events-none"
          >
            <IconCheck size={13} />
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
}
