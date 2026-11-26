"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/field";
import { endpoints, queryKeys } from "@/lib/api";

const MIN_CHARS = 20;

export function ExplanationBox({
  conceptId,
  conceptTitle,
}: {
  conceptId: string;
  conceptTitle: string;
}) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const check = useMutation({
    mutationFn: () => endpoints.explanations.submit(conceptId, text),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.today }),
  });

  return (
    <Card aria-label="Explain it" className="gap-2.5">
      <label htmlFor="explain" className="text-base font-semibold">
        Explain it in your own words
      </label>
      <textarea
        id="explain"
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={4000}
        placeholder={`In your own words: what is ${conceptTitle.toLowerCase()}, and when would you use it?`}
        className="resize-y rounded-lg border-[1.5px] border-field px-3.5 py-3 text-[15px] leading-normal text-ink"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[13px] text-muted">Counts as knowledge evidence toward mastery.</span>
        <Button
          variant="outline-primary"
          onClick={() => check.mutate()}
          disabled={text.trim().length < MIN_CHARS || check.isPending}
        >
          {check.isPending ? "Checking…" : "Check my explanation"}
        </Button>
      </div>
      {check.data && (
        <div
          className={`flex flex-col gap-1.5 rounded-lg px-3.5 py-3 text-sm leading-normal ${check.data.accepted ? "bg-primary-soft text-primary-ink" : "bg-warning-soft text-warning-deep"}`}
          aria-live="polite"
        >
          <strong>
            {check.data.accepted ? "Counts as evidence." : "Not quite there yet — try again."}
          </strong>
          <span>{check.data.feedback}</span>
          {check.data.misconceptions.length > 0 && (
            <span>Watch out: {check.data.misconceptions.join("; ")}</span>
          )}
          {check.data.xpAwarded > 0 && <span>+{check.data.xpAwarded} XP</span>}
        </div>
      )}
      {check.error && <Alert>{check.error.message}</Alert>}
    </Card>
  );
}
