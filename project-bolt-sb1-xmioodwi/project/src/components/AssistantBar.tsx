import { useState } from "react";
import type { Scope, ElementNode } from "../lib/types";
import { aiSuggestions } from "../lib/data";
import { IconSpark, IconReturn, IconArrowRight } from "./icons";
import { SegmentedControl, Kbd } from "./ui";

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

export function AssistantBar({
  tree,
  selectedIds,
  onSubmit,
}: {
  tree: ElementNode[];
  selectedIds: string[];
  onSubmit: (prompt: string, scope: Scope) => void;
}) {
  const [value, setValue] = useState("");
  const [scope, setScope] = useState<Scope>("all");

  const submit = () => {
    if (!value.trim()) return;
    onSubmit(value.trim(), scope);
    setValue("");
  };

  const selectedNames = selectedIds
    .map((id) => findNode(tree, id)?.name)
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div className="shrink-0 bg-canvas-surface border-t border-canvas-line">
      <div className="px-4 py-2.5 flex items-center gap-3">
        {/* Selection context */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-meta uppercase tracking-wider font-semibold text-canvas-faint">Selection</span>
          <div className="flex items-center gap-1 flex-wrap max-w-[180px]">
            {selectedNames.length > 0 ? (
              selectedNames.map((n) => (
                <span key={n} className="text-meta px-1.5 py-0.5 rounded bg-canvas-line2 text-canvas-ink font-medium">
                  {n}
                </span>
              ))
            ) : (
              <span className="text-meta text-canvas-faint">None</span>
            )}
          </div>
        </div>

        <div className="w-px h-5 bg-canvas-line" />

        {/* Scope */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-meta uppercase tracking-wider font-semibold text-canvas-faint">Scope</span>
          <SegmentedControl
            size="sm"
            value={scope}
            onChange={(v) => setScope(v as Scope)}
            options={[
              { label: "All", value: "all" },
              { label: "Desk", value: "desktop" },
              { label: "Tab", value: "tablet" },
              { label: "Mob", value: "mobile" },
            ]}
          />
        </div>

        {/* Input */}
        <div className="flex-1 relative">
          <IconSpark size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-canvas-faint" />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Describe an edit…"
            className="w-full bg-canvas-paper border border-canvas-line rounded-md pl-8 pr-20 py-[7px] text-ctrl text-canvas-ink focus-ring placeholder:text-canvas-faint hover:border-canvas-faint/60 transition-colors-base"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <Kbd>⌘</Kbd>
            <Kbd>↵</Kbd>
          </div>
        </div>

        <button
          onClick={submit}
          disabled={!value.trim()}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 h-[30px] rounded-md bg-canvas-ink text-white text-ctrl font-medium hover:bg-canvas-ink/90 transition-colors-fast focus-ring disabled:opacity-40 disabled:pointer-events-none"
        >
          <IconReturn size={13} />
          Propose
        </button>
      </div>

      {/* Suggestions */}
      <div className="px-4 pb-2.5 flex items-center gap-1.5 flex-wrap">
        <span className="text-meta text-canvas-faint mr-1">Try:</span>
        {aiSuggestions.map((s) => (
          <button
            key={s}
            onClick={() => setValue(s)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-meta text-canvas-sub border border-canvas-line hover:bg-canvas-line2 hover:text-canvas-ink transition-colors-fast focus-ring"
          >
            {s}
            <IconArrowRight size={10} className="text-canvas-faint" />
          </button>
        ))}
      </div>
    </div>
  );
}
