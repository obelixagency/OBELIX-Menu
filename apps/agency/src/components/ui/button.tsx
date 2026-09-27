import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--obx-yellow)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--obx-bg)] disabled:pointer-events-none disabled:opacity-50 min-h-11 min-w-11 touch-manipulation",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--obx-yellow)] text-black hover:bg-[var(--obx-yellow-hover)]",
        secondary:
          "bg-[var(--obx-bg-elevated)] text-white border border-white/15 hover:border-[var(--obx-yellow)]/50 hover:bg-white/5",
        outline:
          "border border-[var(--obx-yellow)] bg-transparent text-[var(--obx-yellow)] hover:bg-[var(--obx-yellow)]/10",
        ghost: "hover:bg-white/5 text-white",
        danger: "bg-red-600 text-white hover:bg-red-700",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 min-h-9 min-w-9 rounded-md px-3 text-xs",
        lg: "h-12 rounded-md px-6",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
);
Button.displayName = "Button";
