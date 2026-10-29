"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

// shadcn/ui Label (S1-12). <Label htmlFor="subject">Subject</Label> above <Input id="subject" />.
function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn("block text-sm font-medium text-ink select-none peer-disabled:opacity-50", className)}
      {...props}
    />
  );
}

export { Label };
