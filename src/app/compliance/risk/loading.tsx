import { PageSkeleton } from "@/components/PageSkeleton";

// Shown at once while this page's data loads (Next.js streams it in).
export default function Loading() {
  return <PageSkeleton />;
}
