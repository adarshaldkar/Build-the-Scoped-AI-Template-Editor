import React, { useState, useMemo } from "react";
import type { ElementNode, TemplateModel, Viewport, ValidationError } from "../lib/types";
import {
  generateAiProposal,
  isProposalStale,
  getContextualQuickChips,
  type AiProposal,
} from "../lib/aiEngine";
import { ProposalCard } from "./ProposalCard";
import { IconSparkles, IconClose, IconAlertCircle } from "./icons";

export interface AiAssistantProps {
  model: TemplateModel;
  selectedNode: ElementNode | null;
  activeViewport: Viewport;
  isOpen: boolean;
  onClose: () => void;
  onCommitProposal: (proposal: AiProposal) => { success: boolean; error?: ValidationError };
}

export const AiAssistant: React.FC<AiAssistantProps> = ({
  model,
  selectedNode,
  activeViewport,
  isOpen,
  onClose,
  onCommitProposal,
}) => {
  const [targetMode, setTargetMode] = useState<"selected" | "full">(
    selectedNode ? "selected" : "full"
  );
  const [prompt, setPrompt] = useState<string>("");
  const [pendingProposals, setPendingProposals] = useState<AiProposal[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Compute context-aware quick action chips dynamically
  const quickChips = useMemo(() => {
    return getContextualQuickChips(selectedNode, targetMode, activeViewport);
  }, [selectedNode?.id, targetMode, activeViewport]);

  const handleSubmit = (customPrompt?: string) => {
    const textToSubmit = (customPrompt || prompt).trim();
    if (!textToSubmit) return;

    setErrorMessage(null);
    const result = generateAiProposal(
      model,
      textToSubmit,
      selectedNode,
      targetMode,
      activeViewport
    );

    if (result.success) {
      // Add proposal to queue (replacing old pending proposal)
      setPendingProposals([result.proposal]);
      setPrompt("");
    } else {
      setErrorMessage(result.error.message);
    }
  };

  const handleAcceptProposal = (proposal: AiProposal) => {
    const commitRes = onCommitProposal(proposal);
    if (commitRes.success) {
      setPendingProposals([]);
    } else if (commitRes.error) {
      setErrorMessage(commitRes.error.message);
    }
  };

  const handleRejectProposal = (proposal: AiProposal) => {
    setPendingProposals((prev) => prev.filter((p) => p.id !== proposal.id));
  };

  const isInputDisabled = targetMode === "selected" && !selectedNode;

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden font-sans text-zinc-100 flex flex-col animate-slideUp">
      {/* Top Header */}
      <div className="px-5 py-3.5 border-b border-zinc-800 bg-zinc-950/80 flex items-center justify-between select-none">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-zinc-800 text-zinc-200 border border-zinc-700/60">
            <IconSparkles size={16} />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
              Deterministic Assistant
            </div>
            <div className="text-[11px] text-zinc-400">
              {targetMode === "selected" && selectedNode
                ? `Selected: ${selectedNode.name}`
                : targetMode === "selected"
                ? "No element selected"
                : "Full Template"}
              <span className="mx-1 text-zinc-600">•</span>
              <span className="uppercase font-mono text-[10px] text-zinc-400">
                {activeViewport}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Target Mode Toggle */}
          <div className="flex items-center bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 text-[11px]">
            <button
              type="button"
              onClick={() => {
                setTargetMode("selected");
                setErrorMessage(null);
              }}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                targetMode === "selected"
                  ? "bg-zinc-800 text-zinc-100 shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Selected
            </button>
            <button
              type="button"
              onClick={() => {
                setTargetMode("full");
                setErrorMessage(null);
              }}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                targetMode === "full"
                  ? "bg-zinc-800 text-zinc-100 shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Full Page
            </button>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Close Assistant"
          >
            <IconClose size={16} />
          </button>
        </div>
      </div>

      {/* Body Area */}
      <div className="p-4 space-y-4 max-h-[65vh] overflow-y-auto">
        {/* Error message */}
        {errorMessage && (
          <div className="px-3.5 py-2.5 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-center gap-2">
            <IconAlertCircle size={14} className="shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Pending Proposals Queue */}
        {pendingProposals.length > 0 && (
          <div className="space-y-3">
            {pendingProposals.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                isStale={isProposalStale(proposal, model)}
                onAccept={handleAcceptProposal}
                onReject={handleRejectProposal}
              />
            ))}
          </div>
        )}

        {/* Input Form */}
        <div className="space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="relative"
          >
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isInputDisabled}
              placeholder={
                isInputDisabled
                  ? "Select an element on the canvas to use the assistant..."
                  : "Describe an edit (e.g. Punchier copy, Dark luxury, Stack buttons)..."
              }
              className={`w-full pl-3.5 pr-20 py-2.5 bg-zinc-950 border rounded-xl text-xs font-sans placeholder:text-zinc-500 focus:outline-none transition-all ${
                isInputDisabled
                  ? "border-zinc-800 text-zinc-600 bg-zinc-950/40 cursor-not-allowed"
                  : "border-zinc-700 focus:border-zinc-400 text-zinc-100"
              }`}
            />
            <button
              type="submit"
              disabled={isInputDisabled || !prompt.trim()}
              className={`absolute right-1.5 top-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                !isInputDisabled && prompt.trim()
                  ? "bg-zinc-100 text-zinc-900 hover:bg-white active:scale-98"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              }`}
            >
              Generate
            </button>
          </form>

          {/* Quick Action Chips */}
          {quickChips.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono font-medium text-zinc-400 uppercase tracking-wider">
                Quick Actions
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quickChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSubmit(chip)}
                    disabled={isInputDisabled}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 text-zinc-300 hover:text-zinc-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
