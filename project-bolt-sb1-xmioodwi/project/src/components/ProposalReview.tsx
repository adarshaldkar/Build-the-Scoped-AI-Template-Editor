import type { Proposal } from "../lib/types";
import { IconCheck, IconClose, IconAlert } from "./icons";

export function ProposalReview({
  proposals,
  onAccept,
  onReject,
  onAcceptAll,
  onDismiss,
}: {
  proposals: Proposal[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onAcceptAll: () => void;
  onDismiss: () => void;
}) {
  if (proposals.length === 0) return null;
  const pending = proposals.filter((p) => p.status === "pending");
  const hasStale = proposals.some((p) => p.stale);

  return (
    <div className="absolute right-3 top-12 w-[340px] bg-canvas-surface border border-canvas-line rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.08),0_24px_48px_rgba(0,0,0,0.12)] z-40 overflow-hidden">
      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-canvas-line flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-meta uppercase tracking-wider font-semibold text-canvas-sub">Edit Proposal</span>
          <span className="text-meta text-canvas-faint">{pending.length} pending</span>
        </div>
        <button onClick={onDismiss} className="text-canvas-faint hover:text-canvas-ink transition-colors-fast">
          <IconClose size={15} />
        </button>
      </div>

      {/* Stale warning */}
      {hasStale && (
        <div className="mx-3.5 mt-3 px-2.5 py-2 rounded-md bg-[#FBF6EE] border border-[#F0E2C9] flex items-start gap-2">
          <IconAlert size={14} className="text-canvas-warn mt-0.5 shrink-0" />
          <span className="text-meta text-canvas-warn leading-relaxed">
            This proposal was created from an older revision. Review carefully before accepting.
          </span>
        </div>
      )}

      {/* Proposals */}
      <div className="max-h-[360px] overflow-y-auto scroll-thin">
        {proposals.map((p) => (
          <div key={p.id} className="px-3.5 py-3 border-b border-canvas-line2 last:border-0">
            {/* Element name + scope */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-ctrl font-semibold text-canvas-ink">{p.elementName}</span>
              <span className="text-meta text-canvas-faint capitalize">{p.scope === "all" ? "All Views" : p.scope}</span>
            </div>

            {/* Before / After */}
            <div className="flex items-start gap-2 mb-2.5">
              <div className="flex-1 min-w-0">
                <div className="text-meta uppercase tracking-wider text-canvas-faint font-semibold mb-1">Before</div>
                <div className="text-ctrl text-canvas-sub bg-canvas-line2 rounded px-2 py-1.5 truncate">
                  {p.before}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-meta uppercase tracking-wider text-canvas-faint font-semibold mb-1">After</div>
                <div className="text-ctrl text-canvas-ink bg-canvas-accentSoft border border-canvas-accent/30 rounded px-2 py-1.5 truncate">
                  {p.after}
                </div>
              </div>
            </div>

            {/* Actions */}
            {p.status === "pending" ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onReject(p.id)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-7 rounded-md border border-canvas-line text-ctrl text-canvas-sub hover:bg-canvas-line2 hover:text-canvas-ink transition-colors-fast focus-ring"
                >
                  <IconClose size={13} />
                  Reject
                </button>
                <button
                  onClick={() => onAccept(p.id)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-7 rounded-md bg-canvas-ink text-white text-ctrl font-medium hover:bg-canvas-ink/90 transition-colors-fast focus-ring"
                >
                  <IconCheck size={13} />
                  Accept
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-meta">
                {p.status === "accepted" ? (
                  <>
                    <IconCheck size={12} className="text-canvas-ok" />
                    <span className="text-canvas-ok font-medium">Accepted</span>
                  </>
                ) : (
                  <>
                    <IconClose size={12} className="text-canvas-faint" />
                    <span className="text-canvas-faint font-medium">Rejected</span>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      {pending.length > 1 && (
        <div className="px-3.5 py-2.5 border-t border-canvas-line flex items-center justify-between">
          <button onClick={onDismiss} className="text-meta text-canvas-faint hover:text-canvas-ink transition-colors-fast">
            Dismiss all
          </button>
          <button
            onClick={onAcceptAll}
            className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md bg-canvas-ink text-white text-ctrl font-medium hover:bg-canvas-ink/90 transition-colors-fast focus-ring"
          >
            <IconCheck size={13} />
            Accept all ({pending.length})
          </button>
        </div>
      )}
    </div>
  );
}
