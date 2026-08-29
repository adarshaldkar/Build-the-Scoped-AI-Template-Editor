import React, { useMemo, useState } from "react";
import type { ElementNode, Proposal, TemplateModel, ValidationError, Viewport } from "../lib/types";
import { generateAiProposal, getContextualQuickChips, buildAcceptedProposalCommand } from "../lib/aiEngine";
import { ProposalCard } from "./ProposalCard";

interface Props {
  model: TemplateModel;
  selectedNodes: ElementNode[];
  activeViewport: Viewport;
  isOpen: boolean;
  onClose: () => void;
  onCommitProposal: (command: ReturnType<typeof buildAcceptedProposalCommand>) => { success: boolean; error?: ValidationError };
}

export const AiAssistant: React.FC<Props> = ({
  model,
  selectedNodes,
  activeViewport,
  isOpen,
  onClose,
  onCommitProposal,
}) => {
  const [prompt, setPrompt] = useState("");
  const [targetMode, setTargetMode] = useState<"selected" | "full">("selected");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<string[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);

  const chips = useMemo(
    () => getContextualQuickChips(selectedNodes[0] ?? null, targetMode, activeViewport),
    [selectedNodes, targetMode, activeViewport]
  );

  if (!isOpen) return null;

  const run = (value = prompt) => {
    setError(null);
    const result = generateAiProposal(model, value, selectedNodes, targetMode, activeViewport);
    if (!result.success) {
      setProposal(null);
      setError(result.error.message);
      return;
    }
    setProposal(result.proposal);
    setAccepted([]);
    setRejected([]);
  };

  const apply = () => {
    if (!proposal) return;
    const command = buildAcceptedProposalCommand(proposal, accepted, model);
    if (!command) return;
    const res = onCommitProposal(command);
    if (!res.success) {
      setError(res.error?.message ?? "The proposal could not be committed.");
      return;
    }
    setProposal(null);
    setPrompt("");
    setError(null);
  };

  const dismiss = () => {
    setProposal(null);
    setPrompt("");
    setError(null);
  };

  const handleClose = () => {
    setProposal(null);
    setPrompt("");
    setError(null);
    onClose();
  };

  const stale = proposal ? proposal.baseRevision !== model.revision : false;

  return (
    <div className="fixed bottom-4 right-[300px] z-40 w-[520px] max-w-[calc(100vw-320px)] space-y-3">
      {proposal && (
        <ProposalCard
          proposal={proposal}
          stale={stale}
          acceptedIds={accepted}
          rejectedIds={rejected}
          onSetDecision={(id, decision) => {
            setAccepted((prev) => (decision === "accepted" ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)));
            setRejected((prev) => (decision === "rejected" ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)));
          }}
          onApply={apply}
          onDismiss={dismiss}
        />
      )}

      {!proposal && (
        <div className="bg-white border border-zinc-200 shadow-xl rounded-xl overflow-hidden animate-fade-in">
          <div className="px-4 pt-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-[0.14em] font-semibold text-zinc-500">
                Edit with assistant
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors"
              >
                Close
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2 text-[10px] text-zinc-500">
              <button
                type="button"
                onClick={() => setTargetMode("selected")}
                className={`px-2.5 py-1 rounded-md border transition-all ${
                  targetMode === "selected"
                    ? "border-zinc-900 bg-zinc-900 text-white font-medium shadow-sm"
                    : "border-zinc-200 hover:bg-zinc-50 text-zinc-600"
                }`}
              >
                Selected {selectedNodes.length ? `(${selectedNodes.length})` : ""}
              </button>
              <button
                type="button"
                onClick={() => setTargetMode("full")}
                className={`px-2.5 py-1 rounded-md border transition-all ${
                  targetMode === "full"
                    ? "border-zinc-900 bg-zinc-900 text-white font-medium shadow-sm"
                    : "border-zinc-200 hover:bg-zinc-50 text-zinc-600"
                }`}
              >
                Full Template
              </button>
              <span className="ml-auto font-mono text-zinc-400 capitalize">{activeViewport}</span>
            </div>
          </div>

          <div className="p-4">
            <div className="flex gap-2">
              <input
                aria-label="Assistant prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey || !e.shiftKey)) {
                    e.preventDefault();
                    if (prompt.trim()) run();
                  }
                }}
                placeholder="Describe an edit (e.g. 'Make hero background #18181B', 'Stack buttons')..."
                className="flex-1 h-9 px-3 rounded-md border border-zinc-200 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm transition-all"
              />
              <button
                type="button"
                disabled={!prompt.trim()}
                onClick={() => run()}
                className="px-3.5 rounded-md bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 disabled:opacity-30 transition-all shadow-sm"
              >
                Propose
              </button>
            </div>

            {error && <div className="mt-2 text-[11px] text-rose-600 font-medium">{error}</div>}

            <div className="mt-3 flex flex-wrap gap-1.5">
              {chips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setPrompt(chip);
                    run(chip);
                  }}
                  className="px-2.5 py-1 rounded-md border border-zinc-200/80 bg-zinc-50 text-[11px] text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
