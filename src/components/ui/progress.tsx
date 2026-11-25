import * as React from "react";
import { cn } from "@/lib/utils";

function Progress({
  className,
  value = 0,
  indicatorClassName,
  ...props
}: React.ComponentProps<"div"> & {
  value?: number;
  indicatorClassName?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      data-slot="progress"
      className={cn("bg-primary/15 relative h-2.5 w-full overflow-hidden rounded-full", className)}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className={cn("bg-primary h-full transition-all duration-300", indicatorClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export { Progress };
