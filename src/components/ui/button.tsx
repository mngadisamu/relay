import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// shadcn/ui Button (S1-12), using the Relay colours from globals.css.
// <Button>Send</Button>, <Button variant="outline">Cancel</Button>,
// <Button asChild><Link href="/staff">Home</Link></Button> for a link that looks like a button.
const buttonVariants = cva(
  // Press feedback: the button shrinks a little while it is pressed (active:) and
  // shows a busy cursor while it is working (aria-busy). The short duration keeps it instant.
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold outline-none transition-[transform,background-color,opacity,filter] duration-100 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.97] active:brightness-95 aria-busy:cursor-progress aria-busy:opacity-80 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-brand-dark",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        outline: "border border-input bg-white text-ink hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "text-ink-2 hover:bg-accent hover:text-ink",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
