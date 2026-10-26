import { Mascot } from "@/components/Mascot";
import { Skeleton } from "@/components/ui/skeleton";

export function QuizSkeleton() {
  return (
    <div role="status" aria-label="Preparing your quiz" className="w-full max-w-2xl mx-auto p-5 space-y-5">
      <Mascot mood="thinking" size="sm" />
      <p className="text-sm font-bold text-black/75">Getting your questions ready…</p>
      <Skeleton className="h-3 w-full rounded-full" />
      <div className="rounded-2xl border-2 border-black bg-white p-6 space-y-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-7 w-full" />
        <Skeleton className="h-7 w-3/4" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-16 border-2 border-black/20 rounded-xl" />)}
      </div>
    </div>
  );
}
