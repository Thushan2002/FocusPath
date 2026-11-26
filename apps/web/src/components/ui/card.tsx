import { cn } from "@/lib/cn";

/** The standard surface: rounded, bordered, padded column. */
export function Card({
  as: Tag = "section",
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { as?: "section" | "div" | "aside" }) {
  return (
    <Tag
      className={cn("flex flex-col rounded-3xl border border-line bg-surface p-6", className)}
      {...props}
    >
      {children}
    </Tag>
  );
}
