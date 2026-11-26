import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white hover:bg-primary-hover",
        outline: "border-[1.5px] border-field bg-surface text-ink hover:bg-bg",
        "outline-primary": "border-[1.5px] border-primary bg-surface text-primary-ink hover:bg-primary-tint",
        "outline-warning": "border-[1.5px] border-warning bg-surface text-warning-ink hover:bg-warning-soft",
        white: "bg-white text-panel hover:bg-primary-soft",
        ghost: "bg-transparent text-ink-2 hover:bg-bg",
        link: "h-auto bg-transparent px-0 text-primary-ink underline-offset-4 hover:underline",
        muted: "bg-line text-muted",
      },
      size: {
        sm: "h-10 px-3 text-[13px] rounded-md",
        md: "h-11 px-4 text-sm rounded-md",
        lg: "h-[52px] px-6 text-base rounded-lg",
        icon: "h-11 w-11 rounded-md",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...(asChild ? {} : { type: type ?? "button" })}
      {...props}
    />
  );
}
