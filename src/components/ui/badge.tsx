import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--accent-color)] text-white",
        secondary:
          "border-transparent bg-[var(--bg-tertiary)] text-[var(--text-secondary)]",
        outline: "border-[var(--border-color)] text-[var(--text-secondary)]",
        destructive:
          "border-transparent bg-red-500/20 text-red-500 dark:text-red-400",
        success:
          "border-transparent bg-green-500/20 text-green-600 dark:text-green-400",
        warning:
          "border-transparent bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
        muted:
          "border-transparent bg-[var(--bg-secondary)] text-[var(--text-muted)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
