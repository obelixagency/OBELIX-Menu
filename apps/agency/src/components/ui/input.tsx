import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-11 w-full min-h-11 rounded-md border border-white/15 bg-[var(--obx-bg-elevated)] px-3 py-2 text-sm text-white placeholder:text-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--obx-yellow)] disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation",
      className
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";
