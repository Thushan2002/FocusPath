"use client";

import * as D from "@radix-ui/react-dialog";
import { cn } from "@/lib/cn";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogTitle = D.Title;
export const DialogDescription = D.Description;
export const DialogClose = D.Close;

export function DialogContent({ className, children, ...props }: D.DialogContentProps) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-40 bg-[rgba(15,22,21,0.45)]" />
      <D.Content
        className={cn(
          "fixed top-[max(16px,12vh)] left-1/2 z-50 flex w-[calc(100%-32px)] max-w-[520px] -translate-x-1/2 flex-col gap-[18px] rounded-3xl bg-surface p-7 shadow-[0_24px_60px_rgba(0,0,0,0.18)]",
          className,
        )}
        {...props}
      >
        {children}
      </D.Content>
    </D.Portal>
  );
}
