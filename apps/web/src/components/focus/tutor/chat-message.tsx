import type { TutorMessageView } from "@/lib/api";

/** One chat bubble. Learner messages are plain text; tutor replies may include code blocks and follow-ups. */
export function ChatMessage({
  message,
  onFollowup,
}: {
  message: TutorMessageView;
  onFollowup: (text: string) => void;
}) {
  const { blocks, followups } = message.content;

  if (message.role === "user") {
    return (
      <div className="max-w-[85%] self-end rounded-[14px_14px_4px_14px] bg-primary px-3.5 py-3 text-sm leading-normal text-white">
        {blocks.map((b, i) => (b.type === "text" ? <span key={i}>{b.text}</span> : null))}
      </div>
    );
  }

  return (
    <div className="flex max-w-[92%] flex-col gap-2.5 rounded-[14px_14px_14px_4px] bg-bg p-3.5 text-sm leading-relaxed text-ink">
      {blocks.map((b, i) =>
        b.type === "text" ? (
          <span key={i} className="whitespace-pre-line">
            {b.text}
          </span>
        ) : (
          <pre
            key={i}
            className="m-0 overflow-x-auto rounded-md bg-code-bg px-3 py-2.5 font-mono text-[13px] leading-relaxed text-code-text"
          >
            {b.code}
          </pre>
        ),
      )}
      {followups && followups.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {followups.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onFollowup(f)}
              className="min-h-9 rounded-full border border-field bg-surface px-3 text-left text-[13px] text-ink-2 hover:bg-primary-tint"
            >
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
