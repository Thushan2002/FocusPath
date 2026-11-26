import { cn } from "@/lib/cn";

export const inputClass =
  "h-[50px] w-full rounded-lg border-[1.5px] border-field bg-surface px-3.5 text-[15px] text-ink placeholder:text-subtle aria-[invalid=true]:border-warning";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-semibold", className)} {...props} />;
}

export function Field({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-1.5", className)}>{children}</div>;
}

export function Alert({ children, tone = "warning" }: { children: React.ReactNode; tone?: "warning" | "info" }) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-sm leading-normal",
        tone === "warning" ? "bg-warning-soft text-warning-deep" : "bg-primary-soft text-primary-ink",
      )}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="mt-0.5 flex-none">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v6M12 16.5v.5" />
      </svg>
      <span>{children}</span>
    </div>
  );
}
