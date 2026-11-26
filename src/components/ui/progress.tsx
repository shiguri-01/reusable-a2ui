import * as React from "react";
import { cn } from "@/lib/utils";

function Progress({
  className,
  value = 0,
  indicatorClassName,
  ...props
}: React.ComponentProps<"span"> & {
  value?: number;
  indicatorClassName?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <span
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      data-slot="progress"
      className={cn(
        "bg-primary/15 relative block h-2.5 w-full overflow-hidden rounded-full",
        className,
      )}
      {...props}
    >
      <span
        data-slot="progress-indicator"
        className={cn("bg-primary block h-full transition-all duration-300", indicatorClassName)}
        style={{ width: `${clamped}%` }}
      />
    </span>
  );
}

export { Progress };
