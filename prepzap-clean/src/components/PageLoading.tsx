import { Skeleton } from "@/components/ui/skeleton";

/** Keep the navigation and app shell visible while an uncached page arrives. */
export function PageLoading() {
  return (
    <div role="status" aria-label="Loading page" aria-busy="true" className="w-full p-5 space-y-4">
      <p className="text-sm font-semibold">Getting your page ready…</p>
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-2/3 max-w-md" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}
