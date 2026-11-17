import { PageSkeleton } from "@/components/PageSkeleton";

// Shown at once when a tab in this area is opened, while its data loads, so the
// screen never goes blank (Next.js streams it in).
export default function Loading() {
  return <PageSkeleton />;
}
