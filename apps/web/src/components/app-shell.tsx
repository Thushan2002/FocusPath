"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";
import { Logo } from "./logo";
import { FocusIcon, ProgressIcon, RoadmapIcon, TodayIcon } from "./icons";

const NAV = [
  { href: "/today", label: "Today", Icon: TodayIcon },
  { href: "/roadmap", label: "Roadmap", Icon: RoadmapIcon },
  { href: "/focus", label: "Focus", Icon: FocusIcon },
  { href: "/progress", label: "Progress", Icon: ProgressIcon },
];

/** Sidebar + content. Below ~800px the sidebar stacks above the content (as in the design). */
export function AppShell({ userName, children }: { userName: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-wrap bg-bg">
      <nav
        aria-label="Main"
        className="box-border flex max-w-full flex-[1_1_220px] flex-col gap-6 border-b border-line bg-surface px-4 py-6 min-[800px]:border-r min-[800px]:border-b-0"
      >
        <div className="px-2">
          <Logo size={30} textClass="text-[17px]" />
        </div>
        <div className="flex flex-wrap gap-0.5 min-[800px]:flex-col">
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`) || (href === "/progress" && pathname.startsWith("/results"));
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-md px-3 text-[15px] no-underline",
                  active ? "bg-primary-soft font-semibold text-primary-ink" : "font-medium text-ink-2 hover:bg-bg",
                )}
              >
                <Icon />
                {label}
              </Link>
            );
          })}
        </div>
        <div className="mt-auto hidden flex-col gap-1 px-2 text-sm min-[800px]:flex">
          <span className="truncate font-semibold">{userName}</span>
          <button type="button" onClick={signOut} className="h-11 self-start text-left font-semibold text-primary-ink hover:underline">
            Log out
          </button>
        </div>
        <button type="button" onClick={signOut} className="h-11 self-start px-3 text-sm font-semibold text-primary-ink min-[800px]:hidden">
          Log out
        </button>
      </nav>
      <main className="box-border flex min-w-0 flex-[999_1_560px] flex-col gap-6 p-[clamp(16px,3vw,40px)]">{children}</main>
    </div>
  );
}
