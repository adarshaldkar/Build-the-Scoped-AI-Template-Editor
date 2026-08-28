import React from "react";
import type { AiProposal } from "../lib/aiEngine";
import { IconCheck, IconClose, IconAlertCircle } from "./icons";

export interface ProposalCardProps {
  proposal: AiProposal;
  isStale: boolean;
  onAccept: (proposal: AiProposal) => void;
  onReject: (proposal: AiProposal) => void;
}

export const ProposalCard: React.FC<ProposalCardProps> = ({
  proposal,
  isStale,
  onAccept,
  onReject,
}) => {
  return (
    <div
      className={`rounded-xl border transition-all shadow-lg overflow-hidden font-sans ${
        isStale
          ? "bg-zinc-900 border-amber-800/80"
          : "bg-zinc-900 border-zinc-700/80"
      }`}
      role="region"
      aria-label="AI Edit Proposal"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Edit Proposal
          </span>
          <span className="text-zinc-600">•</span>
          <span className="text-xs text-zinc-400 font-medium">
            {proposal.description}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Scope Badge */}
          <span className="px-2 py-0.5 rounded text-[11px] font-mono uppercase font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
            Scope: {proposal.scope}
          </span>

          {/* Stale Alert Badge */}
          {isStale && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-950/80 border border-amber-700 text-amber-300">
              <IconAlertCircle size={12} />
              <span>STALE</span>
            </span>
          )}
        </div>
      </div>

      {/* Stale Warning Banner */}
      {isStale && (
        <div className="px-4 py-2 bg-amber-950/40 border-b border-amber-800/60 text-xs text-amber-200 flex items-center gap-2">
          <IconAlertCircle size={14} className="text-amber-400 shrink-0" />
          <span>
            Canvas changed after this proposal was generated. Review the latest state before applying.
          </span>
        </div>
      )}

      {/* Diff Table */}
      <div className="p-4 space-y-3">
        {proposal.diffs.map((diff, idx) => (
          <div key={idx} className="space-y-1.5">
            <div className="text-[11px] font-mono font-medium text-zinc-400 uppercase tracking-wider">
              {diff.elementName} ({diff.elementId})
            </div>

            {/* Content Diff */}
            {(diff.beforeContent !== undefined || diff.afterContent !== undefined) && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Before */}
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 text-zinc-400">
                  <div className="text-[10px] uppercase font-mono font-semibold tracking-wider text-zinc-500 mb-1">
                    Before
                  </div>
                  <div className="line-through decoration-zinc-600 text-zinc-400">
                    {diff.beforeContent || "(Empty)"}
                  </div>
                </div>

                {/* After */}
                <div className="p-3 rounded-lg bg-zinc-800/80 border border-zinc-700 text-zinc-100 shadow-xs">
                  <div className="text-[10px] uppercase font-mono font-semibold tracking-wider text-emerald-400 mb-1">
                    Proposed
                  </div>
                  <div className="font-medium text-zinc-100">
                    {diff.afterContent || "(Empty)"}
                  </div>
                </div>
              </div>
            )}

            {/* Style Props Diff */}
            {(diff.beforeProps !== undefined || diff.afterProps !== undefined) && (
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                {/* Before */}
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 text-zinc-400">
                  <div className="text-[10px] uppercase font-mono font-semibold tracking-wider text-zinc-500 mb-1">
                    Before Props
                  </div>
                  <div className="space-y-0.5 text-[11px]">
                    {Object.entries(diff.beforeProps || {}).map(([k, v]) => (
                      <div key={k} className="text-zinc-500">
                        {k}: <span className="line-through">{String(v)}</span>
                      </div>
                    ))}
                    {Object.keys(diff.beforeProps || {}).length === 0 && (
                      <div className="text-zinc-600 italic">Default</div>
                    )}
                  </div>
                </div>

                {/* After */}
                <div className="p-3 rounded-lg bg-zinc-800/80 border border-zinc-700 text-zinc-100 shadow-xs">
                  <div className="text-[10px] uppercase font-mono font-semibold tracking-wider text-emerald-400 mb-1">
                    Proposed Props
                  </div>
                  <div className="space-y-0.5 text-[11px]">
                    {Object.entries(diff.afterProps || {}).map(([k, v]) => (
                      <div key={k} className="text-zinc-200 font-medium">
                        {k}: <span className="text-emerald-300 font-bold">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Structure / Reorder Diff */}
            {(diff.beforeStructure !== undefined || diff.afterStructure !== undefined) && (
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 text-zinc-400">
                  <div className="text-[10px] uppercase font-mono font-semibold tracking-wider text-zinc-500 mb-1">
                    Before Order
                  </div>
                  <div className="space-y-1 text-[11px]">
                    {diff.beforeStructure?.map((item, i) => (
                      <div key={i} className="text-zinc-500">
                        {i + 1}. {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-zinc-800/80 border border-zinc-700 text-zinc-100 shadow-xs">
                  <div className="text-[10px] uppercase font-mono font-semibold tracking-wider text-emerald-400 mb-1">
                    Proposed Order
                  </div>
                  <div className="space-y-1 text-[11px]">
                    {diff.afterStructure?.map((item, i) => (
                      <div key={i} className="text-zinc-200 font-medium">
                        {i + 1}. {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action Footer */}
      <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={() => onReject(proposal)}
          className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <IconClose size={13} />
            <span>Reject</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => onAccept(proposal)}
          disabled={isStale}
          className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm ${
            !isStale
              ? "bg-zinc-100 text-zinc-900 hover:bg-white active:scale-98"
              : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <IconCheck size={13} />
            <span>Accept Proposal</span>
          </span>
        </button>
      </div>
    </div>
  );
};
