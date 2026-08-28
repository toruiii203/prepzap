import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import React, { useState, useEffect } from "react";
import { callGroq } from "@/lib/groq";
import { onSourceChange, loadLibrary } from "@/lib/sourceContext";
import { useToolHistory } from "@/pages/ToolHistory";
import { usePlan } from "@/hooks/usePlan";
import { useStudySession } from "@/hooks/useStudySession";
import { useAuth } from "@/contexts/AuthContext";
import UpgradePrompt, { SoftWarning } from "@/components/UpgradePrompt";

interface StudyPoint {
  label: string;
  value: string;
}

interface StudySheet {
  title: string;
  isNew: boolean;
  isFailure?: boolean;
  tags: string[];
  // FIX: renamed from retentionScore. This number is invented fresh by the
  // AI on every generation and has no link to real mastery/spaced-repetition
  // data or to any other session — calling it "retention" implied a tracked,
  // persistent metric it never was. "coverageScore" honestly describes what
  // it actually is: a one-off estimate of how well these 4 points cover the
  // topic, for this generation only.
  coverageScore: number;
  goals: string[];
  points: StudyPoint[];
}

// FIX: two thresholds now instead of one hard cutoff.
// - SOFT_TRIM_LENGTH: a point this long is probably just a wordy sentence,
//   not a failure — trim it cleanly instead of discarding the entire
//   generation (which is what used to happen for ANY oversized point, even
//   one 20 characters over the limit).
// - MAX_POINT_VALUE_LENGTH: a point this long is almost certainly a
//   verbatim source dump, not a real study point — this is a genuine
//   failure and still triggers a retry/fallback.
const SOFT_TRIM_LENGTH = 260;
const MAX_POINT_VALUE_LENGTH = 900;

export default function QuickStudy() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { logSession } = useStudySession();
  // Quick Study reads every file currently in the Source Library — no
  // per-file selection needed here. (Other tools like AI Tutor/Flashcards
  // use the shared selected/all mode in sourceContext.ts; this page just
  // pulls loadLibrary() directly so it's independent of that global state.)
  const [libraryFiles, setLibraryFiles] = useState<any[]>(() => loadLibrary());
  // FIX BUG 8: destructure history from useToolHistory (was missing historyEntries)
  const { save: saveHistory, history: deckHistory } = useToolHistory("quick-study");
  const { isPro, canUse, remaining, logUsage } = usePlan();
  const [activeTab, setActiveTab] = useState<"Cram" | "HighYield">("Cram");
  const [topic, setTopic] = useState("");
  const [generatedSheet, setGeneratedSheet] = useState<StudySheet | null>(null);
  const [loading, setLoading] = useState(false);

  // Reactively sync source library when files are uploaded/deleted elsewhere
  useEffect(() => {
    const sync = () => setLibraryFiles(loadLibrary());
    sync();
    const unsub = onSourceChange(sync);
    window.addEventListener("focus", sync);
    return () => {
      unsub();
      window.removeEventListener("focus", sync);
    };
  }, []);

  const MAX_CHARS_PER_SOURCE = 5000;
  const MAX_SOURCES = 5;

  // Builds AI context from every library file (not just a "selected"
  // subset) — same format as sourceContext.ts's buildAIContext() but
  // unconditional, since this tool doesn't use the select/toggle model.
  const buildAllSourcesContext = (files: any[]): string => {
    const usable = files.filter((f) => f.fullText || f.preview);
    if (usable.length === 0) return "";
    const parts = usable.slice(0, MAX_SOURCES).map((f) => {
      if (f.type === "image/jpeg" || f.type === "image/png") {
        return `=== SOURCE: ${f.name} ===\n[Camera capture image — text not available]`;
      }
      const raw = f.fullText || f.preview || "";
      const text =
        raw.length > MAX_CHARS_PER_SOURCE ? raw.slice(0, MAX_CHARS_PER_SOURCE) + "\n[…truncated]" : raw;
      return `=== SOURCE: ${f.name} ===\n${text}`;
    });
    if (parts.length === 0) return "";
    return `\n\n--- STUDY SOURCES (base your answer on this material) ---\n${parts.join("\n\n")}\n--- END SOURCES ---`;
  };

  // FIX BUG 4: initialize remainingUses as null to avoid flicker
  const [remainingUses, setRemainingUses] = useState<number | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [copyFlash, setCopyFlash] = useState<"copy" | "share" | null>(null);

  useEffect(() => {
    remaining("quick_study").then(setRemainingUses).catch((err) => {
      console.error("[QuickStudy] failed to load remaining uses:", err);
    });
  }, [remaining]);

  // FIX: these used to be hardcoded pre-med subjects (Cell Biology, Anatomy,
  // Genetics, Neuroscience, Biochemistry, Physiology), which made no sense
  // for the general student base (e.g. an Art Appreciation or Calculus
  // student would see none of these apply). These are now subject-agnostic
  // "focus" prompts that work as the topic for any course, especially when
  // combined with Source Library files — the AI condenses whatever material
  // is provided through that lens instead of assuming a specific subject.
  const chips = [
    "Key Terms & Definitions",
    "Compare & Contrast",
    "Cause & Effect",
    "Step-by-Step Process",
    "Formulas & Rules to Memorize",
    "Timeline of Events",
  ];

  // FIX: a "topic" longer than this is almost certainly pasted lecture
  // notes/raw text, not a topic name. Feeding an entire pasted document into
  // the prompt as `for the topic: "<huge text>"` is what produced the
  // giant raw-text wall — the model had no clear "summarize this" framing,
  // it just had a confusing instruction with a topic string thousands of
  // words long. Long pastes now get routed the same way as Source Library
  // material: as content to condense, not as the topic name.
  const RAW_PASTE_THRESHOLD = 220;

  const handleGenerate = async () => {
    setGenError(null);
    const sourceContext = buildAllSourcesContext(libraryFiles);
    const trimmedTopic = topic.trim();
    const isRawPaste = trimmedTopic.length > RAW_PASTE_THRESHOLD;
    const shortTopic = isRawPaste ? "" : trimmedTopic;
    const rawPastedMaterial = isRawPaste ? trimmedTopic.slice(0, 6000) : "";

    if (!shortTopic && !sourceContext && !rawPastedMaterial) {
      setGenError("Enter a topic, paste your notes, or add a file to your Source Library first.");
      return;
    }

    const libraryNames = libraryFiles
      .map((f) => f.name?.replace(/\.[^.]+$/, "").replace(/-/g, " "))
      .filter(Boolean);
    const effectiveTopic =
      shortTopic ||
      (libraryNames.length > 0 ? libraryNames.join(" + ") : "") ||
      (isRawPaste ? "Pasted Study Notes" : "Study Material");

    // Freemium gate
    if (!isPro) {
      try {
        const allowed = await canUse("quick_study");
        if (!allowed) {
          setShowUpgrade(true);
          return;
        }
      } catch (err) {
        console.error("[QuickStudy] canUse check failed:", err);
        setGenError("Couldn't verify your plan status just now — please try again in a moment.");
        return;
      }
    }

    setLoading(true);
    setGeneratedSheet(null);
    let result: StudySheet | null = null;
    let generationFailed = false;

    const buildPrompt = (retry: boolean) => `Generate a robust high-yield academic study guide for the topic: "${effectiveTopic}".
Mode: "${activeTab === "Cram" ? "Cram Session (Fast Core Cheat Sheet Facts)" : "High Yield Summary (Clinical context / Advanced correlation)"}"
${sourceContext ? `Incorporate source material detail (this is reference material to condense — never copy it verbatim):\n${sourceContext}` : ""}
${rawPastedMaterial ? `The student pasted the following raw notes. Treat this purely as source material to condense and paraphrase — it is NOT the topic name, and must never be echoed back verbatim:\n${rawPastedMaterial}` : ""}

Return strictly a valid raw JSON object. Do not wrap in markdown tags or code blocks.
Required JSON schema:
{
  "title": "${effectiveTopic} (${activeTab === "Cram" ? "Cram Sheet" : "High Yield Study"})",
  "tags": ["Subject Area", "Sub-topic", "Exam Category"],
  "coverageScore": 72,
  "goals": [
    "Define the core terminology",
    "Identify 3 high-yield mechanisms",
    "Summarize key clinical correlations"
  ],
  "points": [
    { "label": "Key Concept Name:", "value": "A complete deeply explanatory educational definition..." },
    { "label": "Second Concept Name:", "value": "Detailed fact explanation..." },
    { "label": "Third Concept Name:", "value": "Detailed fact explanation..." },
    { "label": "Fourth Concept Name:", "value": "Detailed fact explanation..." }
  ]
}

Rules:
- tags: 2-4 short title-cased topic labels (e.g. "Cell Biology", "Exam Prep")
- coverageScore: integer 0-100 reflecting how well these 4 points cover the topic (this is a one-off
  estimate for this generation only, not a tracked retention/mastery metric)
- goals: exactly 3 short imperative study goals specific to this topic
- points: exactly 4 rigorous, SPECIFIC, exam-ready study points — real facts, named mechanisms,
  concrete examples, or numbers relevant to "${effectiveTopic}". Avoid vague filler sentences
  that could apply to any topic (e.g. "this concept is important for exams") — every point must
  contain an actual piece of knowledge a student could be tested on.
- Each point's "value" should be a concise paraphrase, ideally under 40 words and never over 55.
  Never copy sentences from the source material verbatim, no matter how detailed the source
  context is — always condense and rephrase in your own words.${retry ? "\n- Your previous response was invalid JSON or malformed. Return ONLY the raw JSON object below and nothing else — no preamble, no explanation, no markdown fences." : ""}
Return raw JSON only, no wrapping!`;

    const systemPrompt =
      "You are an elite academic tutor who publishes quick high-yield revision cards strictly in raw JSON format. You always condense and paraphrase with specific, concrete facts — you never copy source text verbatim and never pad with vague filler.";

    // Trims an overly long point down to a clean sentence/word boundary
    // instead of discarding the whole generation over one wordy point.
    const trimPointValue = (value: string): string => {
      if (value.length <= SOFT_TRIM_LENGTH) return value;
      const cut = value.slice(0, SOFT_TRIM_LENGTH);
      const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(", "), cut.lastIndexOf(" "));
      return (lastStop > SOFT_TRIM_LENGTH * 0.5 ? cut.slice(0, lastStop) : cut).trim().replace(/[,.]?$/, "") + "…";
    };

    // One full attempt: call the model, parse (with a repair fallback for
    // stray text around the JSON), validate shape, and trim-not-nuke
    // oversized points. Throws if the response is unusable.
    const attemptGenerate = async (retry: boolean): Promise<StudySheet> => {
      const aiResponse = await callGroq(
        [{ role: "user", content: buildPrompt(retry) }],
        systemPrompt,
        "llama-3.3-70b-versatile",
        1600,
        "quick_study"
      );

      let sanitized = aiResponse.trim();
      if (sanitized.startsWith("```")) {
        sanitized = sanitized.replace(/^```(json)?/, "").replace(/```$/, "").trim();
      }

      let generated: any;
      try {
        generated = JSON.parse(sanitized);
      } catch {
        // FIX: repair step — some completions add a stray sentence before
        // or after the JSON despite instructions. Try to pull just the
        // {...} object out instead of immediately giving up.
        const match = sanitized.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("No JSON object found in AI response");
        generated = JSON.parse(match[0]);
      }

      if (!generated?.title || !Array.isArray(generated.points) || generated.points.length < 3) {
        throw new Error("Invalid structure");
      }

      // Reject only if truly malformed or a genuine verbatim-dump (well
      // beyond a wordy sentence); trim anything merely a bit long instead
      // of discarding a perfectly good, on-topic generation.
      const cleanedPoints: StudyPoint[] = [];
      for (const p of generated.points) {
        if (typeof p?.label !== "string" || !p.label.trim() || typeof p?.value !== "string" || !p.value.trim()) {
          throw new Error("Malformed point — missing label or value");
        }
        if (p.value.length > MAX_POINT_VALUE_LENGTH) {
          throw new Error("Point far exceeds max length — likely a verbatim source dump");
        }
        cleanedPoints.push({ label: p.label.trim(), value: trimPointValue(p.value.trim()) });
      }

      return {
        title: generated.title,
        isNew: true,
        tags: Array.isArray(generated.tags) && generated.tags.length > 0 ? generated.tags : [activeTab === "Cram" ? "Cram" : "High Yield"],
        coverageScore: typeof generated.coverageScore === "number" ? generated.coverageScore : 65,
        goals: Array.isArray(generated.goals) && generated.goals.length > 0
          ? generated.goals
          : ["Review core concepts", "Identify key mechanisms", "Test recall"],
        points: cleanedPoints,
      };
    };

    try {
      result = await attemptGenerate(false);
    } catch (firstErr) {
      console.warn("[QuickStudy] first generation attempt failed, retrying once:", firstErr);
      try {
        result = await attemptGenerate(true);
      } catch (secondErr) {
        // FIX: this used to silently swap in hardcoded, topic-irrelevant
        // fake facts (literally sodium-channel/action-potential content
        // for ANY subject, including e.g. Art History) and present them as
        // a real study sheet — actively misleading, not just low quality.
        // If the model genuinely can't produce a usable sheet twice in a
        // row, tell the student honestly instead of inventing facts.
        console.error("[QuickStudy] generation failed twice, showing honest failure state:", secondErr);
        generationFailed = true;
        result = {
          title: `${effectiveTopic} — Generation Failed`,
          isNew: false,
          isFailure: true,
          tags: ["Retry Needed"],
          coverageScore: 0,
          goals: [
            "Tap Generate again to retry",
            "Try a shorter or narrower topic",
            "If pasting notes, try a shorter excerpt",
          ],
          points: [
            {
              label: "Couldn't generate this sheet:",
              value: `The AI wasn't able to produce valid study notes for "${effectiveTopic}" just now. This can happen with a very broad topic, very long pasted text, or a temporary connection issue. Nothing was invented in its place — please try again.`,
            },
          ],
        };
      }
    }

    // FIX BUG 3: always save history and log usage after a real generation
    // — but a genuine failure card (see above) isn't a study session and
    // shouldn't burn quota, pollute history, or count toward the streak.
    if (result) {
      setGeneratedSheet(result);
      if (!generationFailed) {
        saveHistory({
          prompt: effectiveTopic,
          preview: result.points[0]?.value?.slice(0, 120) || "",
          output: JSON.stringify(result),
          model: "rex-ai",
          meta: `${activeTab} · ${result.tags.join(", ")}`,
        });

        // FIX: Quick Study never wrote to study_sessions or updated the streak
        // at all before this — every generation was completely invisible to
        // Dashboard/Analytics/Streak. Now uses the same shared hook as
        // Math Solver so this only has to be correct in one place.
        if (user?.id) {
          await logSession({
            title: result.title || effectiveTopic,
            durationMinutes: 8,
          });
        }
      }
    }

    if (!isPro && !generationFailed) {
      try {
        await logUsage("quick_study");
      } catch {}
      remaining("quick_study").then(setRemainingUses).catch((err) => {
        console.error("[QuickStudy] failed to refresh remaining uses:", err);
      });
    }
    setLoading(false);
  };

  const handleSelectChip = (title: string) => {
    setTopic(title);
    setGeneratedSheet(null);
  };

  // FIX: Study History was saving the full generated output (`entry.output`)
  // but clicking a history item only ever refilled the topic box — it never
  // restored the saved sheet, so every "history" click silently forced a
  // brand new AI generation (and burned another quota use) instead of
  // instantly showing what was already generated.
  const handleRestoreHistory = (entry: any) => {
    setGenError(null);
    try {
      const restored = JSON.parse(entry.output);
      if (restored?.title && Array.isArray(restored.points)) {
        setGeneratedSheet({ ...restored, isNew: false, isFailure: false });
        setTopic(entry.prompt || "");
        if (typeof entry.meta === "string") {
          if (entry.meta.startsWith("Cram")) setActiveTab("Cram");
          else if (entry.meta.startsWith("HighYield")) setActiveTab("HighYield");
        }
        return;
      }
    } catch (err) {
      console.warn("[QuickStudy] couldn't restore saved history output, falling back to topic only:", err);
    }
    // Corrupt/missing saved output — fall back to the old behavior rather
    // than silently doing nothing.
    setTopic(entry.prompt || "");
    setGeneratedSheet(null);
  };

  const handleCopySheet = async () => {
    if (!generatedSheet) return;
    const text = `${generatedSheet.title}\n\n${generatedSheet.points.map((p) => `${p.label} ${p.value}`).join("\n\n")}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopyFlash("copy");
      setTimeout(() => setCopyFlash(null), 1500);
    } catch (err) {
      console.error("[QuickStudy] copy to clipboard failed:", err);
      setGenError("Couldn't copy to clipboard. Try selecting the text manually.");
    }
  };

  // Previously this button was labeled/iconed as "Share" but just called
  // handleCopySheet - identical to the Copy button next to it, with no
  // native share sheet and no feedback either way. Uses the real Web Share
  // API when available (mobile browsers, most modern desktop browsers),
  // falling back to the same clipboard copy on unsupported browsers.
  const handleShareSheet = async () => {
    if (!generatedSheet) return;
    const text = `${generatedSheet.title}\n\n${generatedSheet.points.map((p) => `${p.label} ${p.value}`).join("\n\n")}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: generatedSheet.title, text });
      } catch (err) {
        // AbortError just means the user closed the share sheet - not an error.
        if ((err as Error)?.name !== "AbortError") {
          console.error("[QuickStudy] share failed:", err);
        }
      }
      return;
    }
    await handleCopySheet();
    setCopyFlash("share");
  };

  // ─── Session Goals Panel (desktop right column) ──────────────────────────
  const SessionGoalsPanel = () => (
    <div className="border-2 border-black bg-[#F0EDE0] p-5 flex flex-col justify-between h-full shadow-[3px_3px_0px_#000]">
      <div>
        <h4 className="text-[11px] font-black uppercase tracking-widest text-black/50 mb-4 border-b-2 border-black/10 pb-2">
          Session Goals
        </h4>
        {!generatedSheet && !loading && (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
            <span className="material-symbols-outlined text-[32px] text-black/20">flag</span>
            <p className="text-[12px] font-bold text-black/40">Goals appear after generating a study sheet.</p>
          </div>
        )}
        {loading && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <span className="material-symbols-outlined animate-spin text-[#E8534A] text-[28px]">autorenew</span>
            <p className="text-[12px] font-black text-black/40">Generating goals...</p>
          </div>
        )}
        {generatedSheet && (
          <ul className="flex flex-col gap-3">
            {generatedSheet.goals.map((goal, i) => {
              const showChecked = i === 0 && !generatedSheet.isFailure;
              return (
                <li key={i} className="flex items-start gap-3">
                  <div
                    className={`w-5 h-5 shrink-0 border-2 border-black rounded-full flex items-center justify-center mt-0.5 ${
                      showChecked ? "bg-[#E8534A]" : "bg-white"
                    }`}
                  >
                    {showChecked && (
                      <span className="material-symbols-outlined text-white text-[12px]" style={{ fontVariationSettings: "'wght' 700" }}>
                        check
                      </span>
                    )}
                  </div>
                  <span className={`text-[13px] font-semibold leading-snug ${showChecked ? "line-through text-black/40" : "text-black"}`}>
                    {goal}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {/* Coverage score bar — FIX: relabeled from "Retention Capacity"/
          retentionScore. This is an AI-invented estimate for THIS generation
          only; it isn't tracked against past sessions and doesn't reflect
          actual mastery or spaced-repetition data, so it shouldn't be framed
          as "retention". */}
      <div className="mt-6 pt-4 border-t-2 border-black/10">
        <div className="h-2 w-full bg-[#E8E4DC] border-2 border-black overflow-hidden mb-2">
          <div
            className="h-full bg-black transition-all duration-700"
            style={{ width: generatedSheet ? `${generatedSheet.coverageScore}%` : "0%" }}
          />
        </div>
        <p
          className="text-[10px] font-black uppercase tracking-widest text-black/50"
          title="AI estimate of how well this sheet covers the topic — specific to this generation, not tracked over time"
        >
          Coverage Score: {generatedSheet ? `${generatedSheet.coverageScore}%` : "—"}
        </p>
      </div>
    </div>
  );

  // ─── Output Card (shared) ─────────────────────────────────────────────────
  const OutputCard = ({ compact = false }: { compact?: boolean }) => {
    if (!generatedSheet && !loading) {
      return (
        <div className="border-2 border-dashed border-black/20 flex flex-col items-center justify-center text-center py-12 gap-3 bg-white">
          <span className="material-symbols-outlined text-[40px] text-black/20">import_contacts</span>
          <p className="text-[14px] font-black text-black/40">No Study Sheet Active</p>
          <p className="text-[12px] font-bold text-black/30">Enter a topic and hit Generate to build a high-yield study sheet.</p>
        </div>
      );
    }
    if (loading) {
      return (
        <div className="border-2 border-black bg-white flex flex-col items-center justify-center py-16 gap-4 shadow-[3px_3px_0px_#000]">
          <span className="material-symbols-outlined animate-spin text-[#E8534A] text-[36px]">autorenew</span>
          <p className="text-[14px] font-black text-black/50">AI Synthesizing Study Sheet...</p>
        </div>
      );
    }
    if (!generatedSheet) return null;
    return (
      <div className={`qs-print-area border-2 border-black bg-white flex flex-col relative shadow-[4px_4px_0px_#000] ${compact ? "" : "min-h-[400px]"}`}>
        {/* Card header — tags + actions */}
        <div className="px-6 py-3 border-b-2 border-black bg-[#F0EDE0] flex items-center justify-between flex-wrap gap-2">
          <div className="flex flex-wrap gap-2">
            {generatedSheet.tags.map((tag, i) => (
              <span
                key={i}
                className={`px-3 py-0.5 text-[11px] font-black uppercase tracking-wider border-2 border-black ${
                  i === 0 ? "bg-black text-white" : "bg-white text-black"
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="qs-no-print flex items-center gap-3">
            <button onClick={handleCopySheet} title={copyFlash === "copy" ? "Copied!" : "Copy"} className={`material-symbols-outlined text-[20px] transition-colors ${copyFlash === "copy" ? "text-green-600" : "text-black hover:text-[#E8534A]"}`}>
              {copyFlash === "copy" ? "check" : "content_copy"}
            </button>
            <button onClick={() => window.print()} title="Print" className="material-symbols-outlined text-[20px] text-black hover:text-[#E8534A] transition-colors">
              print
            </button>
            <button onClick={handleShareSheet} title={copyFlash === "share" ? "Copied for sharing!" : "Share"} className={`material-symbols-outlined text-[20px] transition-colors ${copyFlash === "share" ? "text-green-600" : "text-black hover:text-[#E8534A]"}`}>
              {copyFlash === "share" ? "check" : "share"}
            </button>
          </div>
        </div>
        {/* Card body */}
        <div className="p-6 flex flex-col gap-5">
          {/* Active badge */}
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-black text-[20px] uppercase leading-tight tracking-tight">{generatedSheet.title}</h2>
            {generatedSheet.isFailure ? (
              <span className="shrink-0 bg-white text-[#ae2925] text-[11px] font-black px-3 py-1 border-2 border-[#ae2925] shadow-[2px_2px_0px_#000]">
                Retry Needed
              </span>
            ) : generatedSheet.isNew && (
              <span className="shrink-0 bg-[#E8534A] text-white text-[11px] font-black px-3 py-1 border-2 border-black rotate-2 shadow-[2px_2px_0px_#000]">
                Active
              </span>
            )}
          </div>
          {/* Points */}
          <ul className="flex flex-col gap-4 list-disc pl-5 marker:text-[#E8534A]">
            {generatedSheet.points.map((pt, idx) => (
              <li key={idx} className="leading-relaxed text-[14.5px] text-black/80">
                <span className="font-extrabold text-black mr-1">{pt.label}</span>
                {pt.value}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="w-full bg-[#FAF7F2] flex flex-col" style={{ minHeight: "100dvh" }}>
      {/* FIX: window.print() used to print the entire page (sidebar, header,
          input panel, history, etc). This scopes printing to just the
          generated study sheet card by hiding everything else in the DOM
          during the print media query. */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .qs-print-area, .qs-print-area * { visibility: visible !important; }
          .qs-print-area {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          .qs-no-print { display: none !important; }
        }
      `}</style>
      {showUpgrade && (
        <UpgradePrompt feature="quick_study" remaining={remainingUses ?? 0} onClose={() => setShowUpgrade(false)} />
      )}

      <SharedSidebar active="/quick-study" />

      {/* ═══════════════════════════════════════════════════
          DESKTOP LAYOUT
          ═══════════════════════════════════════════════════ */}
      <div className="hidden md:flex md:ml-64 flex-col" style={{ height: "100vh" }}>
        {/* Desktop Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b-2 border-black bg-[#FAF7F2] shrink-0 z-30">
          <div className="flex items-center gap-4">
            <span className="text-[22px] font-black tracking-tight">QUICK STUDY</span>
          </div>
          <div className="flex items-center gap-4">
            <div
              onClick={() => navigate("/profile")}
              className="w-10 h-10 border-2 border-black bg-[#ae2925] text-white flex items-center justify-center font-black text-[14px] cursor-pointer hover:opacity-90"
            >
              S
            </div>
          </div>
        </header>

        {/* Desktop body — scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-6xl mx-auto space-y-8">
            {/* Top section: Input (2/3) + Session Goals (1/3) */}
            <div className="grid grid-cols-3 gap-6">
              {/* Concept Generator — 2/3 */}
              <div className="col-span-2 border-2 border-black bg-white shadow-[5px_5px_0px_#000] p-6 flex flex-col gap-5">
                <div className="flex items-center justify-between border-b-2 border-black pb-4">
                  <h3 className="text-[20px] font-black">Concept Generator</h3>
                  <span
                    className="text-[11px] font-black uppercase tracking-widest bg-black text-white px-3 py-1"
                    title="AI estimate of how well this sheet covers the topic — specific to this generation, not tracked over time"
                  >
                    Coverage Score: {generatedSheet ? `${generatedSheet.coverageScore}%` : "—"}
                  </span>
                </div>
                {/* Textarea */}
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-black/50 mb-2">
                    Study Topic or Raw Text
                  </label>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) handleGenerate(); }}
                    rows={4}
                    className="w-full bg-[#F0EDE0] border-2 border-black px-4 py-3 text-[15px] font-medium placeholder:text-black/30 resize-none focus:outline-none"
                    placeholder="Paste complex lecture notes or enter a topic (e.g., 'Cellular Mitosis Mechanics')..."
                  />
                </div>
                {/* Chips */}
                <div className="flex flex-wrap gap-2">
                  {chips.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectChip(chip)}
                      className={`px-3 py-1 border-2 border-black text-[12px] font-bold transition-all ${
                        topic === chip ? "bg-black text-white shadow-[2px_2px_0px_#000] scale-95" : "bg-white text-black hover:bg-[#E2E2E2]"
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                {/* Source Library — every file here is automatically used
                    as context, no per-file selection needed. Clicking a
                    pill jumps to /sources to manage/preview that file. */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase tracking-widest text-black/50">
                      Source Library
                    </label>
                    <span className="text-[11px] font-bold text-black/40">
                      {libraryFiles.length > 0
                        ? `Using all ${libraryFiles.length} file${libraryFiles.length !== 1 ? "s" : ""}`
                        : "No files in library"}
                    </span>
                  </div>
                  {libraryFiles.length > 0 ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      {libraryFiles.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => navigate("/sources")}
                          className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-black bg-black text-white text-[12px] font-bold transition-colors max-w-[180px] hover:bg-[#1a1a1a]"
                          title={f.name}
                        >
                          <span className="material-symbols-outlined text-[14px]">description</span>
                          <span className="truncate">{f.name.replace(/\.[^.]+$/, "").replace(/-/g, " ").substring(0, 20)}</span>
                        </button>
                      ))}
                      <button
                        onClick={() => navigate("/sources")}
                        className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-dashed border-black bg-transparent text-[12px] font-bold hover:bg-[#E2E2E2] transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">add</span>
                        Add
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => navigate("/sources")}
                      className="flex items-center gap-2 px-4 py-2.5 border-2 border-black bg-white text-[13px] font-bold hover:bg-[#E2E2E2] transition-colors shadow-[2px_2px_0px_#000] w-fit"
                    >
                      <span className="material-symbols-outlined text-[18px]">upload_file</span>
                      Upload PDF / Doc
                    </button>
                  )}
                </div>
                {/* Actions row */}
                <div className="flex gap-3">
                  {/* Tab toggles */}
                  <div className="flex border-2 border-black overflow-hidden min-w-0">
                    {(["Cram", "HighYield"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => { setActiveTab(tab); setGeneratedSheet(null); }}
                        className={`px-4 py-2 text-[12px] font-black uppercase tracking-wider transition-colors border-r-2 last:border-r-0 border-black ${
                          activeTab === tab ? "bg-black text-white" : "bg-white text-black hover:bg-[#E2E2E2]"
                        }`}
                      >
                        {tab === "Cram" ? "Cram Mode" : "High Yield"}
                      </button>
                    ))}
                  </div>
                  {/* Generate */}
                  <button
                    onClick={handleGenerate}
                    disabled={(!topic.trim() && libraryFiles.length === 0) || loading}
                    className="flex-1 relative group cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <div className="w-full py-2.5 bg-black text-white border-2 border-black flex items-center justify-center gap-2 z-10 relative group-active:translate-y-0.5 group-active:translate-x-0.5 transition-transform">
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                      <span className="font-black text-[13px] uppercase tracking-wider">
                        {loading ? "Synthesizing..." : "Generate Notes"}
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-[#E8534A] translate-y-1 translate-x-1 group-active:translate-y-0 group-active:translate-x-0 transition-transform" />
                  </button>
                  {/* FIX BUG 4: guard remainingUses !== null before displaying */}
                  {!isPro && remainingUses !== null && remainingUses <= 4 && remainingUses > 0 && (
                    <div className="mt-2 flex flex-col items-center gap-1">
                      <p className="text-[12px] text-black/50 font-bold">
                        {remainingUses} session{remainingUses !== 1 ? "s" : ""} left today
                      </p>
                      {remainingUses <= 2 && <SoftWarning feature="quick_study" remaining={remainingUses} />}
                    </div>
                  )}
                </div>
                {genError && (
                  <p className="text-[12px] font-bold text-[#ae2925]">{genError}</p>
                )}
              </div>
              {/* Session Goals — 1/3 */}
              <div className="col-span-1">
                <SessionGoalsPanel />
              </div>
            </div>

            {/* Tabs + Output */}
            <div className="space-y-0">
              {/* Tab bar */}
              <div className="flex gap-px border-b-[3px] border-black">
                {(["Cram", "HighYield"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => { setActiveTab(tab); setGeneratedSheet(null); }}
                    className={`px-8 py-3 text-[12px] font-black uppercase tracking-widest border-t-[3px] border-x-[3px] border-black -mb-[3px] z-10 transition-colors ${
                      activeTab === tab ? "bg-black text-white" : "bg-[#FAF7F2] text-black hover:bg-[#E2E2E2]"
                    }`}
                  >
                    {tab === "Cram" ? "Cram Mode" : "High Yield"}
                  </button>
                ))}
              </div>
              {/* Output card */}
              <OutputCard />
            </div>

            {/* History Panel + Suggestion Cards */}
            <div className="grid grid-cols-2 gap-6 mt-2">
              {/* FIX BUG 8: History Panel now uses deckHistory from useToolHistory, not libraryFiles */}
              <div className="border-2 border-black bg-white shadow-[3px_3px_0px_#000]">
                <div className="flex items-center justify-between px-5 py-3 border-b-2 border-black bg-[#FAF7F2]">
                  <h3 className="text-[11px] font-black uppercase tracking-widest">Study History</h3>
                  <button onClick={() => navigate("/analytics")} className="text-[11px] font-extrabold text-[#FF4D2E] hover:underline">View all</button>
                </div>
                {!deckHistory || deckHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-center opacity-40">
                    <span className="material-symbols-outlined text-[28px]">history</span>
                    <p className="text-[11px] font-bold">No history yet. Generate your first sheet!</p>
                  </div>
                ) : (
                  <div className="flex flex-col divide-y divide-black/10">
                    {(deckHistory as any[]).slice(0, 4).map((entry: any, i: number) => (
                      <button
                        key={i}
                        onClick={() => handleRestoreHistory(entry)}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-[#FAF7F2] cursor-pointer group text-left w-full"
                      >
                        <div className="w-10 h-10 border-2 border-black bg-[#F0EDE0] flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[18px]">article</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-extrabold truncate">{entry.prompt || entry.preview || "Study Sheet"}</p>
                          <p className="text-[10px] font-bold text-black/40 uppercase tracking-wider">{entry.meta || activeTab}</p>
                        </div>
                        <span className="material-symbols-outlined text-[16px] text-black/20 group-hover:text-black transition-colors">chevron_right</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Suggestion Cards — use existing chips array */}
              <div className="border-2 border-black bg-white shadow-[3px_3px_0px_#000]">
                <div className="px-5 py-3 border-b-2 border-black bg-[#FAF7F2]">
                  <h3 className="text-[11px] font-black uppercase tracking-widest">Quick Suggestions</h3>
                </div>
                <div className="grid grid-cols-2 gap-0 divide-x-2 divide-y-2 divide-black">
                  {chips.slice(0, 4).map((chip, idx) => (
                    <button key={idx} onClick={() => setTopic(chip)} className="flex flex-col items-start gap-2 p-4 hover:bg-[#FAF7F2] transition-colors text-left group">
                      <span className="material-symbols-outlined text-[#ae2925] text-[22px]">bolt</span>
                      <span className="text-[13px] font-extrabold group-hover:underline">{chip}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          MOBILE LAYOUT — preserved + enhanced
          ═══════════════════════════════════════════════════ */}
      <div className="md:hidden w-full flex flex-col bg-[#FAF7F2]" style={{ height: "100dvh", overflow: "hidden" }}>
        {/* Mobile TopAppBar */}
        <header className="flex items-center justify-between px-4 h-14 bg-[#FAF7F2] shrink-0 border-b-2 border-black z-10">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center border-2 border-black bg-white w-9 h-9 shadow-[2px_2px_0px_#000] active:translate-y-0.5"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
          <h1 className="text-[18px] font-black">AI Quick Cram</h1>
          <button
            onClick={() => navigate("/timer")}
            className="flex items-center gap-1.5 border-2 border-black bg-white px-2.5 py-1 shadow-[2px_2px_0px_#000] active:translate-y-0.5"
          >
            <span className="material-symbols-outlined text-[#ae2925] text-[16px]">timer</span>
            <span className="text-[11px] font-black text-[#ae2925]">TIMER</span>
          </button>
        </header>

        {/* Mobile scrollable body */}
        <main className="flex-1 overflow-y-auto px-4 py-5 pb-10 flex flex-col gap-5">
          {/* Tab toggle */}
          <div className="flex border-2 border-black overflow-hidden bg-white shrink-0">
            {(["Cram", "HighYield"] as const).map((tab, i) => (
              <React.Fragment key={tab}>
                {i > 0 && <div className="w-[2px] bg-black" />}
                <button
                  onClick={() => { setActiveTab(tab); setGeneratedSheet(null); }}
                  className={`flex-1 py-2.5 font-bold text-[13px] transition-colors ${
                    activeTab === tab ? "bg-black text-white" : "bg-white text-black hover:bg-[#E2E2E2]"
                  }`}
                >
                  {tab === "Cram" ? "Cram Mode" : "High Yield"}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Topic */}
          <div className="flex flex-col gap-3">
            <label className="text-[15px] font-black">What do you need to study?</label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={3}
              className="bg-white border-2 border-black px-4 py-3 text-[15px] font-medium placeholder:text-black/30 resize-none focus:outline-none shadow-[2px_2px_0px_#000]"
              placeholder="e.g. Action Potentials, Mitosis, Krebs Cycle..."
            />
            {/* Chips */}
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {chips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectChip(chip)}
                  className={`shrink-0 px-3 py-1 border-2 border-black text-[12px] font-bold whitespace-nowrap transition-all ${
                    topic === chip ? "bg-black text-white shadow-[1px_1px_0px_#000] scale-95" : "bg-white text-black"
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
            {libraryFiles.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-widest text-black/50">Source Library</span>
                  <span className="text-[11px] font-bold text-black/40">
                    Using all {libraryFiles.length}
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                  {libraryFiles.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => navigate("/sources")}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border-2 border-black bg-black text-white text-[12px] font-bold whitespace-nowrap transition-colors max-w-[160px]"
                      title={f.name}
                    >
                      <span className="material-symbols-outlined text-[14px]">description</span>
                      <span className="truncate">{f.name.replace(/\.[^.]+$/, "").replace(/-/g, " ").substring(0, 18)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={() => navigate("/sources")}
              className="w-full bg-[#FAF7F2] border-2 border-black border-dashed py-2.5 flex items-center justify-center gap-2 font-bold text-[13px] hover:bg-[#E2E2E2] transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">attach_file</span>
              {libraryFiles.length > 0 ? "Manage / Upload Sources" : "Read from Source Library"}
            </button>
          </div>

          {/* Generate button */}
          <button
            disabled={(!topic.trim() && libraryFiles.length === 0) || loading}
            onClick={handleGenerate}
            className="relative group cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            <div className="w-full py-3.5 bg-black text-white border-2 border-black flex items-center justify-center gap-2 z-10 relative group-active:translate-y-0.5 group-active:translate-x-0.5 transition-transform">
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              <span className="font-black text-[14px]">
                {loading ? "AI Synthesizing..." : "Generate Study Sheet"}
              </span>
            </div>
            <div className="absolute inset-0 bg-[#E8534A] translate-y-1 translate-x-1 group-active:translate-y-0 group-active:translate-x-0 transition-transform" />
          </button>
          {genError && (
            <p className="text-[12px] font-bold text-[#ae2925] -mt-3">{genError}</p>
          )}

          {/* Session Goals — mobile (shown after generate) */}
          {(generatedSheet || loading) && (
            <div className="border-2 border-black bg-[#F0EDE0] p-4 shadow-[3px_3px_0px_#000]">
              <h4 className="text-[11px] font-black uppercase tracking-widest text-black/50 mb-3">Session Goals</h4>
              {loading ? (
                <div className="flex items-center gap-2 py-2">
                  <span className="material-symbols-outlined animate-spin text-[#E8534A] text-[20px]">autorenew</span>
                  <span className="text-[12px] font-bold text-black/40">Generating goals...</span>
                </div>
              ) : generatedSheet ? (
                <>
                  <ul className="flex flex-col gap-2 mb-4">
                    {generatedSheet.goals.map((goal, i) => {
                      const showChecked = i === 0 && !generatedSheet.isFailure;
                      return (
                        <li key={i} className="flex items-start gap-2">
                          <div className={`w-4 h-4 shrink-0 border-2 border-black rounded-full flex items-center justify-center mt-0.5 ${showChecked ? "bg-[#E8534A]" : "bg-white"}`}>
                            {showChecked && <span className="material-symbols-outlined text-white text-[10px]" style={{ fontVariationSettings: "'wght' 700" }}>check</span>}
                          </div>
                          <span className={`text-[12px] font-semibold ${showChecked ? "line-through text-black/40" : "text-black"}`}>{goal}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="h-1.5 w-full bg-[#E8E4DC] border border-black overflow-hidden mb-1">
                    <div className="h-full bg-black transition-all duration-700" style={{ width: `${generatedSheet.coverageScore}%` }} />
                  </div>
                  <p
                    className="text-[10px] font-black uppercase tracking-widest text-black/40"
                    title="AI estimate for this generation only, not tracked over time"
                  >
                    Coverage Score: {generatedSheet.coverageScore}%
                  </p>
                </>
              ) : null}
            </div>
          )}

          {/* Output card */}
          <OutputCard compact />
        </main>
      </div>
    </div>
  );
}
