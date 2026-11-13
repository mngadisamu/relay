import { PageSkeleton } from "@/components/PageSkeleton";

// Shown at once while this ticket loads (Next.js streams it in).
export default function Loading() {
  return <PageSkeleton rows={6} />;
}
