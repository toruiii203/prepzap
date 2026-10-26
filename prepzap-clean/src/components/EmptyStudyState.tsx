import { Button } from "@/components/ui/button";

export function EmptyStudyState({ onStart }: { onStart: () => void }) {
  return (
    <section className="max-w-md mx-auto py-10 px-4 text-center flex flex-col items-center gap-4">
      <span aria-hidden="true" className="material-symbols-outlined text-4xl w-20 h-20 border-2 border-black rounded-3xl bg-[#FFD13B] shadow-[0_4px_0_#000000] flex items-center justify-center motion-safe:animate-pop-in">school</span>
      <h2 className="text-2xl text-black">Ready when you are</h2>
      <p className="text-sm font-semibold text-black/75">Create a quiz above, or pick up your next lesson on the study path.</p>
      <Button onClick={onStart}>Explore your study path<span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span></Button>
    </section>
  );
}
