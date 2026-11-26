import { Logo } from "../logo";

/** Dark brand panel + form column. Wraps to one column on phones. */
export function AuthShell({ panel, children }: { panel: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-wrap bg-bg">
      <aside className="box-border flex flex-[1_1_420px] flex-col justify-between gap-10 bg-panel p-[clamp(24px,5vw,64px)] text-white">
        <Logo size={34} inverted textClass="text-[19px]" />
        <div className="flex max-w-[460px] flex-col gap-5">{panel}</div>
        <span className="text-[13px] text-panel-muted">Learn with focus. Build with confidence. Grow consistently.</span>
      </aside>
      <main className="box-border flex min-w-0 flex-[999_1_520px] items-center justify-center px-4 py-[clamp(24px,5vw,64px)]">
        <div className="flex w-full max-w-[440px] flex-col gap-5">{children}</div>
      </main>
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-[13px] text-muted">
      <span className="h-px flex-1 bg-line" />
      or with email
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
