import type { ExerciseView } from "@/lib/api";
import { cn } from "@/lib/cn";
import { exerciseLabel } from "./exercise-panel";

function statusLabel(e: ExerciseView, isCurrent: boolean): string {
  if (e.solved) return "Solved ✓";
  return e.attempted || isCurrent ? "In progress" : "Not started";
}

/** Tab strip for the concept's exercises, showing each one's progress. */
export function ExerciseTabs({
  exercises,
  current,
  onSelect,
}: {
  exercises: ExerciseView[];
  current: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2">
      {exercises.map((e, i) => {
        const isCurrent = i === current;
        const highlighted = e.solved || isCurrent;
        return (
          <button
            key={e.id}
            type="button"
            onClick={() => onSelect(i)}
            aria-pressed={isCurrent}
            className={cn(
              "flex flex-col gap-1 rounded-lg p-3 text-left",
              e.solved ? "bg-primary-soft" : isCurrent ? "border-2 border-primary" : "bg-bg",
              isCurrent && e.solved && "ring-2 ring-primary",
            )}
          >
            <span
              className={cn(
                "text-xs font-semibold",
                highlighted ? "text-primary-ink" : "text-muted",
              )}
            >
              {exerciseLabel(e, i)}
            </span>
            <span className={cn("text-sm font-semibold", !highlighted && "text-muted")}>
              {statusLabel(e, isCurrent)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
