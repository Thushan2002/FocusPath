import {
  CONCEPT_STATUS_LABELS,
  EVIDENCE_LABELS,
  type ConceptStatus,
  type EvidenceKind,
} from "@focuspath/shared";
import { cn } from "@/lib/cn";

const BADGE: Record<ConceptStatus, string> = {
  mastered: "bg-primary-soft text-primary-ink",
  in_progress: "bg-warning-soft text-warning-ink",
  up_next: "bg-line-soft text-ink-2",
  locked: "bg-bg text-muted",
};

const DOT: Record<ConceptStatus, string> = {
  mastered: "bg-primary",
  in_progress: "box-border border-[3px] border-warning bg-white",
  up_next: "box-border border-2 border-subtle bg-white",
  locked: "bg-[#D5D9E0]",
};

export function StatusBadge({ status, className }: { status: ConceptStatus; className?: string }) {
  return (
    <span
      className={cn(
        "self-start rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        BADGE[status],
        className,
      )}
    >
      {CONCEPT_STATUS_LABELS[status]}
    </span>
  );
}

export function StatusDot({ status }: { status: ConceptStatus }) {
  return <span className={cn("h-3 w-3 flex-none rounded-full", DOT[status])} aria-hidden="true" />;
}

const EVIDENCE: Record<EvidenceKind, string> = {
  activity: "bg-line-soft text-ink-2",
  knowledge: "bg-knowledge-soft text-knowledge",
  practical: "bg-primary-soft text-primary-ink",
};

export function EvidenceTag({ kind }: { kind: EvidenceKind }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        EVIDENCE[kind],
      )}
    >
      {EVIDENCE_LABELS[kind]}
    </span>
  );
}
