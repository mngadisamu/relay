import * as React from "react";
import { cn } from "@/lib/utils";

// shadcn/ui Input (S1-12). Always pair it with a <Label htmlFor> (WCAG AA).
// aria-invalid="true" turns the border red when the field has an error.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full min-w-0 rounded-md border border-input bg-white px-3 py-2 text-sm text-ink placeholder:text-muted outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
