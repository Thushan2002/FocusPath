"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import type { FocusChoice } from "@focuspath/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, Label } from "@/components/ui/field";
import { endpoints } from "@/lib/api";

/**
 * Focus mode guides, never punishes (product rule 5): it asks what you want to switch to, makes the
 * trade-off visible and logs whichever choice you make. Nothing is blocked.
 */
export function SwitchTopicDialog({
  open,
  onOpenChange,
  conceptId,
  conceptTitle,
  onAskTutor,
  onChangePlan,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  conceptId: string;
  conceptTitle: string;
  onAskTutor: (topic: string) => void;
  onChangePlan: () => void;
}) {
  const [topic, setTopic] = useState("");
  const check = useMutation({
    mutationFn: () => endpoints.focusGuard.check(conceptId, topic),
  });
  const record = useMutation({
    mutationFn: (choice: FocusChoice) => endpoints.focusGuard.record(conceptId, topic, choice),
  });

  function close() {
    onOpenChange(false);
    setTimeout(() => {
      setTopic("");
      check.reset();
    }, 200);
  }

  async function choose(choice: FocusChoice) {
    await record.mutateAsync(choice).catch(() => {});
    close();
    if (choice === "ask_tutor") onAskTutor(topic);
    if (choice === "change_plan") onChangePlan();
  }

  const c = check.data;
  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent aria-describedby="switch-desc">
        {!c ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (topic.trim()) check.mutate();
            }}
            className="flex flex-col gap-[18px]"
          >
            <DialogTitle className="m-0 text-[22px] font-bold">
              What do you want to switch to?
            </DialogTitle>
            <DialogDescription
              id="switch-desc"
              className="m-0 text-[15px] leading-relaxed text-ink-2"
            >
              No judgement — let&apos;s just check how it fits your plan first.
            </DialogDescription>
            <Field>
              <Label htmlFor="target-topic">Topic</Label>
              <Input
                id="target-topic"
                autoFocus
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. React"
                maxLength={120}
              />
            </Field>
            <Button type="submit" size="lg" disabled={!topic.trim() || check.isPending}>
              Continue
            </Button>
          </form>
        ) : (
          <>
            <DialogTitle className="m-0 text-[22px] font-bold">
              Switch to {topic} before finishing {conceptTitle}?
            </DialogTitle>
            <DialogDescription
              id="switch-desc"
              className="m-0 text-[15px] leading-relaxed text-ink-2"
            >
              {c.tasksRemaining > 0 ? (
                <>
                  You&apos;re{" "}
                  <strong className="text-ink">
                    {c.tasksRemaining} task{c.tasksRemaining > 1 ? "s" : ""}
                  </strong>{" "}
                  from finishing today&apos;s plan for {conceptTitle}
                </>
              ) : (
                <>You haven&apos;t proven {conceptTitle} yet</>
              )}
              {c.onPath
                ? `, and ${c.matchedTitle} is on your path — it'll come up when its prerequisites are done.`
                : `, and ${topic} isn't on your ${c.goalTitle} path yet.`}{" "}
              No pressure — just make it a conscious choice.
            </DialogDescription>
            <div className="flex flex-col gap-2">
              <Button
                size="lg"
                className="min-h-12 text-[15px]"
                onClick={() => choose("keep_focus")}
              >
                Keep my focus — finish {conceptTitle}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="min-h-12 text-[15px]"
                onClick={() => choose("ask_tutor")}
              >
                I&apos;m stuck — ask the tutor for help
              </Button>
              <Button
                variant="ghost"
                className="min-h-12 underline"
                onClick={() => choose("change_plan")}
              >
                Change my plan on purpose
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
