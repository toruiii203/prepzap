import { Mascot } from "@/components/Mascot";
import { Button } from "@/components/ui/button";

export function EmptyStudyState({ onStart }: { onStart: () => void }) {
  return (
    <section className="max-w-md mx-auto py-10 px-4 text-center flex flex-col items-center gap-4">
      <Mascot mood="encouraging" size="md" interactive />
      <h2 className="text-2xl text-black">Ready when you are</h2>
      <p className="text-sm font-semibold text-black/75">Create a quiz above, or pick up your next lesson on the study path.</p>
      <Button onClick={onStart}>Explore your study path<span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span></Button>
    </section>
  );
}
