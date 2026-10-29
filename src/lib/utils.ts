import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// cn() joins class names and lets a later class win over an earlier one,
// e.g. cn("px-4", "px-6") gives "px-6". Every shadcn/ui component uses it (S1-12).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
