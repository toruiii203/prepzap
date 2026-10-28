import { useEffect, useRef, useState } from "react";
import { Mascot } from "@/components/Mascot";
import { SpringButton } from "@/components/ui/SpringButton";
import {
  evaluateSocraticResponse,
  type SocraticEvaluation,
} from "@/lib/roadmapGeneration";
import type { RoadmapLesson, SavedRoadmap, UnitProgress } from "@/lib/learningRoadmap";
import confetti from "canvas-confetti";
import { soundFX } from "@/lib/soundFX";

interface Props {
  path: SavedRoadmap;
  unitIndex: number;
  lesson: RoadmapLesson;
  progress: UnitProgress;
  onSaveProgress: (next: UnitProgress) => Promise<boolean>;
  onClose: () => void;
}

type SessionPhase = "preflight" | "socratic" | "worked" | "complete";

export function SocraticLessonSession({
  path,
  unitIndex,
  lesson,
  progress,
  onSaveProgress,
  onClose,
}: Props) {
  const unit = path.outline.units[unitIndex];

  // Mode: voice or text
  const [mode, setMode] = useState<"voice" | "text">("voice");
  const [phase, setPhase] = useState<SessionPhase>("preflight");
  const [turn, setTurn] = useState<number>(1); // 1 to 3
  const [inputAnswer, setInputAnswer] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [feedback, setFeedback] = useState<SocraticEvaluation | null>(null);
  const [mascotMood, setMascotMood] = useState<"happy" | "thinking" | "encouraging" | "celebrating">("encouraging");
  const [score, setScore] = useState(0);

  // Speech recognition ref
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initial Socratic question derived from unit objective and recall task
  const initialPrompt =
    lesson.recall?.[0]?.prompt ||
    `In your own words, how would you explain ${unit.objective.toLowerCase()} to a friend?`;

  const [currentPrompt, setCurrentPrompt] = useState(initialPrompt);

  // Initialize SpeechRecognition safely
  useEffect(() => {
    const SpeechCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechCtor) {
      try {
        const recognition = new SpeechCtor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          let transcript = "";
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript + " ";
          }
          setInputAnswer(transcript.trim());
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      } catch {
        recognitionRef.current = null;
      }
    }

    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {}
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setMode("text");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        setInputAnswer("");
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  const handleSkip = () => {
    if (turn === 1) {
      setTurn(2);
      setCurrentPrompt(
        lesson.recall?.[1]?.prompt ||
          `No worries! Let's break it down: what is the main purpose of ${unit.title}?`
      );
      setFeedback({
        isAccurate: false,
        score: 40,
        praise: "No problem at all!",
        feedback: "Let's look at it from another angle together.",
        followupPrompt: "",
      });
      setInputAnswer("");
    } else {
      setPhase("worked");
    }
  };

  const handleSubmitExplanation = async () => {
    if (!inputAnswer.trim() || evaluating) return;

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
    }

    setEvaluating(true);
    setMascotMood("thinking");

    try {
      const criteria = lesson.recall?.[turn - 1]?.criteria || [];
      const res = await evaluateSocraticResponse(
        path.topic,
        unit.title,
        currentPrompt,
        inputAnswer,
        criteria
      );

      setFeedback(res);
      setScore((prev) => prev + (res.isAccurate ? 30 : 15));

      if (res.isAccurate) {
        setMascotMood("happy");
        soundFX.correct();
      } else {
        setMascotMood("encouraging");
      }

      // Progress after short review
      setTimeout(() => {
        if (turn < 2) {
          setTurn((t) => t + 1);
          setCurrentPrompt(
            res.followupPrompt ||
              lesson.recall?.[1]?.prompt ||
              `Now, how does this connect to practical use in ${unit.title}?`
          );
          setInputAnswer("");
          setFeedback(null);
          setMascotMood("encouraging");
        } else {
          setPhase("worked");
        }
        setEvaluating(false);
      }, 2400);
    } catch {
      setEvaluating(false);
      setPhase("worked");
    }
  };

  const handleFinishLesson = async () => {
    setPhase("complete");
    setMascotMood("celebrating");
    soundFX.success();
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {}

    const updatedProgress: UnitProgress = {
      ...progress,
      read: true,
      readyAt: Date.now(),
      answers: {
        ...progress.answers,
        [`socratic-${unitIndex}`]: { choices: [1] },
      },
      recalls: {
        ...progress.recalls,
        [String(unitIndex)]: {
          response: inputAnswer || "Completed Socratic session",
          rating: "got-it",
        },
      },
    };

    await onSaveProgress(updatedProgress);
  };

  return (
    <div className="rm-socratic-session" role="dialog" aria-label="Socratic Study Session">
      {/* ── Top Navigation Bar ── */}
      <header className="rm-socratic-header">
        <button
          className="rm-icon-button"
          onClick={onClose}
          aria-label="Close learning session"
        >
          ×
        </button>
        <div className="rm-socratic-progress-track" aria-hidden="true">
          <div
            className="rm-socratic-progress-fill"
            style={{
              width:
                phase === "preflight"
                  ? "10%"
                  : phase === "socratic"
                  ? `${(turn / 3) * 80}%`
                  : phase === "worked"
                  ? "90%"
                  : "100%",
            }}
          />
        </div>
        <div className="rm-socratic-xp-badge">
          <span className="material-symbols-outlined" aria-hidden="true">
            bolt
          </span>
          <span>+{score > 0 ? score : 35} XP</span>
        </div>
      </header>

      {/* ── Phase 1: Pre-flight Briefing ("Explain it to Seedling") ── */}
      {phase === "preflight" && (
        <div className="rm-socratic-preflight">
          <div className="rm-preflight-mascot">
            <Mascot mood="encouraging" size="lg" />
          </div>

          <h2 className="rm-preflight-title">Explain it to Seedling</h2>
          <p className="rm-preflight-subtitle">
            Master <strong>{unit.title}</strong> through active recall.
          </p>

          <ul className="rm-preflight-features">
            <li>
              <div className="rm-feature-icon">🎙️</div>
              <div>
                <strong>Explain topics out loud</strong>
                <p>Speaking in your own words builds lasting conceptual memory.</p>
              </div>
            </li>
            <li>
              <div className="rm-feature-icon">💬</div>
              <div>
                <strong>Stuck? Seedling coaches you</strong>
                <p>Get friendly hints whenever you hesitate or miss a detail.</p>
              </div>
            </li>
            <li>
              <div className="rm-feature-icon">📈</div>
              <div>
                <strong>Active Recall boost</strong>
                <p>Students retain up to 20% more on exams using active dialogue.</p>
              </div>
            </li>
          </ul>

          <div className="rm-preflight-actions">
            <SpringButton
              className="rm-primary-btn"
              onClick={() => {
                setPhase("socratic");
                setMode("voice");
              }}
            >
              Start learning <span aria-hidden="true">→</span>
            </SpringButton>

            <button
              className="rm-text-btn"
              onClick={() => {
                setPhase("socratic");
                setMode("text");
              }}
            >
              I can't talk right now (Text mode)
            </button>
          </div>
        </div>
      )}

      {/* ── Phase 2: Socratic Voice & Dialogue Screen ── */}
      {phase === "socratic" && (
        <div className="rm-socratic-dialogue">
          <div className="rm-dialogue-mascot">
            <Mascot mood={mascotMood} size="md" />
          </div>

          {/* Socratic Question Card */}
          <div className="rm-dialogue-bubble">
            <p className="rm-dialogue-lead">
              {turn === 1 ? "Welcome! Let's build your intuition." : "Great momentum! Next step:"}
            </p>
            <h3 className="rm-dialogue-prompt">{currentPrompt}</h3>
          </div>

          {/* Live Coaching Feedback */}
          {feedback && (
            <div
              className={`rm-dialogue-feedback ${
                feedback.isAccurate ? "rm-feedback-good" : "rm-feedback-coach"
              }`}
            >
              <strong>{feedback.praise}</strong>
              <p>{feedback.feedback}</p>
            </div>
          )}

          {/* Input Area */}
          <div className="rm-dialogue-input-zone">
            {mode === "voice" ? (
              <div className="rm-voice-control">
                <button
                  type="button"
                  className={`rm-mic-large ${isListening ? "rm-mic-active" : ""}`}
                  onClick={toggleListening}
                  aria-label={isListening ? "Stop listening" : "Tap to speak your answer"}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {isListening ? "graphic_eq" : "mic"}
                  </span>
                </button>
                <p className="rm-mic-hint">
                  {isListening
                    ? "Listening... Tap to pause"
                    : inputAnswer
                    ? "Answer captured! Ready to submit"
                    : "Tap to speak your answer"}
                </p>

                {inputAnswer && (
                  <div className="rm-voice-transcript">
                    <p>"{inputAnswer}"</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rm-text-control">
                <textarea
                  ref={inputRef}
                  value={inputAnswer}
                  onChange={(e) => setInputAnswer(e.target.value)}
                  placeholder="Explain the concept in your own words..."
                  rows={3}
                  className="rm-text-input"
                />
              </div>
            )}

            {/* Submit & Skip Actions */}
            <div className="rm-dialogue-actions">
              <SpringButton
                className="rm-submit-btn"
                disabled={!inputAnswer.trim() || evaluating}
                onClick={handleSubmitExplanation}
              >
                {evaluating ? "Seedling is thinking…" : "Check with Seedling →"}
              </SpringButton>

              <button
                className="rm-skip-btn"
                onClick={handleSkip}
                disabled={evaluating}
              >
                Skip question
              </button>

              {/* Mode switch */}
              <button
                className="rm-switch-mode-btn"
                onClick={() => setMode(mode === "voice" ? "text" : "voice")}
              >
                Switch to {mode === "voice" ? "keyboard typing" : "microphone voice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Phase 3: Rapid Worked Step Check ── */}
      {phase === "worked" && (
        <div className="rm-socratic-worked">
          <div className="rm-worked-header">
            <Mascot mood="encouraging" size="sm" />
            <div>
              <p className="rm-eyebrow">Interactive Checkpoint</p>
              <h3>{lesson.example?.problem || unit.title}</h3>
            </div>
          </div>

          <div className="rm-worked-steps">
            <h4>Step-by-step reasoning:</h4>
            <ol>
              {lesson.example?.steps?.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>

          {lesson.commonMistake && (
            <div className="rm-worked-mistake">
              <span className="material-symbols-outlined" aria-hidden="true">
                lightbulb
              </span>
              <div>
                <strong>Common Misconception to Avoid:</strong>
                <p>{lesson.commonMistake}</p>
              </div>
            </div>
          )}

          <SpringButton className="rm-primary-btn" onClick={handleFinishLesson}>
            Complete Chapter (+35 XP) <span aria-hidden="true">✓</span>
          </SpringButton>
        </div>
      )}

      {/* ── Phase 4: Victory Screen ── */}
      {phase === "complete" && (
        <div className="rm-socratic-complete">
          <div className="rm-complete-mascot">
            <Mascot mood="celebrating" size="lg" />
          </div>
          <h2>Chapter Mastered!</h2>
          <p>You explained and verified <strong>{unit.title}</strong>.</p>
          <div className="rm-complete-score-pill">
            🌱 +{score > 0 ? score : 35} XP & Milestone Cleared
          </div>
          <SpringButton className="rm-primary-btn" onClick={onClose}>
            Back to Learning Roadmap →
          </SpringButton>
        </div>
      )}
    </div>
  );
}
