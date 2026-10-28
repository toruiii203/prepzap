import { useEffect, useRef, useState } from "react";
import { Mascot } from "@/components/Mascot";
import { SpringButton } from "@/components/ui/SpringButton";
import {
  LESSON_STAGES,
  nextLearningStage,
  STAGE_LABELS,
  emptyProgress,
  isReadyForReview,
  REVIEW_DELAY,
  type LessonStage,
  type SavedRoadmap,
  type UnitProgress,
  type RoadmapQuestion,
} from "@/lib/learningRoadmap";
interface Props {
  path: SavedRoadmap;
  index: number;
  saving: boolean;
  onProgress: (progress: UnitProgress) => Promise<boolean>;
  onFresh: (stage: "checkpoint" | "review") => void;
  busy: boolean;
}
export function RoadmapLesson({
  path,
  index,
  saving,
  onProgress,
  onFresh,
  busy,
}: Props) {
  const lesson = path.lessons[String(index)],
    progress = path.progress[String(index)] || emptyProgress();
  const [stage, setStage] = useState<LessonStage>(() =>
    nextLearningStage(lesson, progress),
  );
  const [questionIndex, setQuestionIndex] = useState(0);
  const [recall, setRecall] = useState("");
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    panel.current?.focus({ preventScroll: true });
    panel.current?.scrollIntoView?.({ block: "start", behavior: "instant" });
  }, [stage, questionIndex]);
  const [revealed, setRevealed] = useState(false);
  const disabled = saving || busy;
  const reviewDue = Boolean(
    progress.readyAt && Date.now() >= progress.readyAt + REVIEW_DELAY,
  );
  function changeStage(next: LessonStage) {
    setStage(next);
    setQuestionIndex(0);
    setRecall("");
    setRevealed(false);
  }
  async function record(next: UnitProgress) {
    const ready = isReadyForReview(lesson, next);
    next = {
      ...next,
      readyAt: ready ? next.readyAt || Date.now() : undefined,
      reviewedAt: ready ? next.reviewedAt : undefined,
    };
    return onProgress(next);
  }
  const questions =
    stage === "understand" || stage === "recall" ? [] : lesson[stage];
  const question = questions[questionIndex];
  const key = `${stage}-${questionIndex}`;
  const choices = progress.answers[key]?.choices || [];
  async function answer(choice: number) {
    let next: UnitProgress = {
      ...progress,
      answers: { ...progress.answers, [key]: { choices: [choice] } },
    };
    if (
      stage === "review" &&
      reviewDue &&
      lesson.review.every(
        (q, i) =>
          (i === questionIndex
            ? choice
            : next.answers[`review-${i}`]?.choices[0]) === q.correct,
      )
    )
      next = { ...next, reviewedAt: Date.now() };
    await record(next);
  }
  const recallTask = lesson.recall[questionIndex];
  const checkpointDone = lesson.checkpoint.every(
    (_, i) => progress.answers[`checkpoint-${i}`]?.choices.length,
  );
  const checkpointCorrect = lesson.checkpoint.filter(
    (q, i) => progress.answers[`checkpoint-${i}`]?.choices[0] === q.correct,
  ).length;
  const reviewDone = lesson.review.every(
    (_, i) => progress.answers[`review-${i}`]?.choices.length,
  );
  return (
    <article className="rm-lesson" aria-label="Learning session">
      <div className="rm-chapter-heading">
        <div>
          <p className="rm-eyebrow">
            Chapter {index + 1} · {path.outline.units[index].kind}
          </p>
          <h2>{path.outline.units[index].title}</h2>
        </div>
        <Mascot mood="encouraging" size="sm" pauseWhenHidden />
      </div>
      <p className="rm-objective">{path.outline.units[index].objective}</p>
      <nav className="rm-stage-tabs" aria-label="Lesson stages">
        {LESSON_STAGES.map((item) => (
          <button
            key={item}
            aria-current={stage === item ? "step" : undefined}
            onClick={() => changeStage(item)}
          >
            {STAGE_LABELS[item]}
          </button>
        ))}
      </nav>
      <section
        key={stage}
        className="rm-stage"
        ref={panel}
        tabIndex={-1}
        aria-label={STAGE_LABELS[stage]}
      >
        {stage === "understand" && (
          <>
            <h3>Make the idea click</h3>
            <p className="rm-explanation">{lesson.explanation}</p>
            <section className="rm-worked">
              <p className="rm-eyebrow">A worked example</p>
              <h3>{lesson.example.problem}</h3>
              <ol>
                {lesson.example.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </section>
            <aside className="rm-mistake">
              <strong>A common mix-up</strong>
              <p>{lesson.commonMistake}</p>
            </aside>
            {path.source && (
              <details className="rm-evidence">
                <summary>Check this against your file</summary>
                <p>
                  {path.source.name} · {path.source.coverage}
                </p>
                {lesson.evidence.map((quote, i) => (
                  <blockquote key={i}>{quote}</blockquote>
                ))}
              </details>
            )}
            <SpringButton
              className="rm-primary"
              disabled={disabled}
              onClick={async () => {
                if (await record({ ...progress, read: true }))
                  changeStage("guided");
              }}
            >
              {progress.read
                ? "Continue to guided practice"
                : "Mark as read & try it"}
            </SpringButton>
            <p className="rm-fine">
              Reading marks this chapter as read, not mastered.
            </p>
          </>
        )}
        {stage === "review" && !reviewDue && (
          <div className="rm-review-wait">
            <Mascot mood="encouraging" movement="wave" size="sm" />
            <h3>Give your memory a little space</h3>
            <p>
              {progress.readyAt
                ? `Later review opens ${new Date(progress.readyAt + REVIEW_DELAY).toLocaleString()}. You can revisit every earlier stage now.`
                : "Complete reading, both practice sets, both recall tasks and the checkpoint first. Later review opens 24 hours after you are ready."}
            </p>
            <button
              className="rm-secondary"
              onClick={() => changeStage("understand")}
            >
              Revisit the lesson
            </button>
          </div>
        )}
        {stage === "recall" && (
          <>
            <p className="rm-eyebrow">
              Recall {questionIndex + 1} of {lesson.recall.length} ·
              self-assessed
            </p>
            <h3>{recallTask.prompt}</h3>
            <label className="rm-field">
              Explain it from memory
              <textarea
                value={
                  recall ||
                  progress.recalls[String(questionIndex)]?.response ||
                  ""
                }
                onChange={(event) => setRecall(event.target.value)}
                placeholder="Write the key idea in your own words…"
                rows={5}
                disabled={disabled}
              />
            </label>
            {!revealed ? (
              <SpringButton
                className="rm-primary"
                disabled={
                  disabled ||
                  (
                    recall ||
                    progress.recalls[String(questionIndex)]?.response ||
                    ""
                  ).trim().length < 20
                }
                onClick={() => setRevealed(true)}
              >
                Compare with a model answer
              </SpringButton>
            ) : (
              <>
                <div className="rm-worked">
                  <h3>Compare the ideas, not the wording</h3>
                  <p>{recallTask.answer}</p>
                  <ul>
                    {recallTask.criteria.map((criterion, i) => (
                      <li key={i}>{criterion}</li>
                    ))}
                  </ul>
                </div>
                <p>This is your self-check, not automatic grading.</p>
                <div className="rm-rating">
                  <button
                    className="rm-secondary"
                    disabled={disabled}
                    onClick={() =>
                      void record({
                        ...progress,
                        recalls: {
                          ...progress.recalls,
                          [String(questionIndex)]: {
                            response:
                              recall ||
                              progress.recalls[String(questionIndex)]
                                ?.response ||
                              "",
                            rating: "practise",
                          },
                        },
                      })
                    }
                  >
                    I need more practice
                  </button>
                  <SpringButton
                    className="rm-primary"
                    disabled={disabled}
                    onClick={async () => {
                      if (
                        await record({
                          ...progress,
                          recalls: {
                            ...progress.recalls,
                            [String(questionIndex)]: {
                              response:
                                recall ||
                                progress.recalls[String(questionIndex)]
                                  ?.response ||
                                "",
                              rating: "got-it",
                            },
                          },
                        })
                      ) {
                        if (questionIndex < 1) {
                          setQuestionIndex(1);
                          setRecall("");
                          setRevealed(false);
                        } else changeStage("checkpoint");
                      }
                    }}
                  >
                    I included these ideas
                  </SpringButton>
                </div>
              </>
            )}
          </>
        )}
        {question && (stage !== "review" || reviewDue) && (
          <>
            <p className="rm-eyebrow">
              {STAGE_LABELS[stage]} · Question {questionIndex + 1} of{" "}
              {questions.length}
            </p>
            <Question
              key={`${key}-${question.prompt}`}
              question={question}
              chosen={choices[0]}
              disabled={disabled}
              guided={stage === "guided"}
              onCheck={answer}
            />
            {choices.length > 0 && (
              <SpringButton
                className="rm-primary"
                disabled={disabled}
                onClick={() => {
                  if (questionIndex < questions.length - 1)
                    setQuestionIndex(questionIndex + 1);
                  else
                    changeStage(
                      stage === "guided"
                        ? "practice"
                        : stage === "practice"
                          ? "recall"
                          : stage === "checkpoint"
                            ? "review"
                            : "understand",
                    );
                }}
              >
                {questionIndex < questions.length - 1
                  ? "Next question"
                  : stage === "checkpoint"
                    ? "See review status"
                    : stage === "review"
                      ? "Back to lesson"
                      : "Next stage"}{" "}
                <span aria-hidden="true">→</span>
              </SpringButton>
            )}
          </>
        )}
        {stage === "checkpoint" && checkpointDone && (
          <div className="rm-summary" role="status">
            <strong>{checkpointCorrect} of 3 correct on first attempt</strong>
            <p>
              {progress.readyAt
                ? "You are ready for later review. This records checkpoint performance, not a guarantee of mastery."
                : checkpointCorrect < 2
                  ? "Revisit the worked example, then try a fresh checkpoint. Repeating revealed answers does not count as new evidence."
                  : "Finish the earlier stages and self-assess both recall tasks to become ready for review."}
            </p>
            {!progress.readyAt && checkpointCorrect < 2 && (
              <button
                className="rm-secondary"
                disabled={disabled}
                onClick={() => onFresh("checkpoint")}
              >
                Generate a fresh checkpoint
              </button>
            )}
          </div>
        )}
        {stage === "review" && reviewDue && reviewDone && (
          <div className="rm-summary" role="status">
            <strong>
              {progress.reviewedAt
                ? "Later review completed"
                : "A few ideas need another look"}
            </strong>
            <p>
              {progress.reviewedAt
                ? "You answered both fresh review questions correctly after a delay. Keep using the idea in different situations."
                : "Revisit the explanation and recall tasks. You can request different review questions when ready."}
            </p>
            {!progress.reviewedAt && (
              <button
                className="rm-secondary"
                disabled={disabled}
                onClick={() => onFresh("review")}
              >
                Generate fresh review questions
              </button>
            )}
          </div>
        )}
      </section>
      <p className="rm-fine">
        Generated study material can make mistakes. Check important facts
        against your course material. No XP or grades are changed.
      </p>
    </article>
  );
}
function Question({
  question,
  chosen,
  disabled,
  guided,
  onCheck,
}: {
  question: RoadmapQuestion;
  chosen: number | undefined;
  disabled: boolean;
  guided: boolean;
  onCheck: (choice: number) => Promise<void>;
}) {
  const [selection, setSelection] = useState<number | null>(null);
  const [hint, setHint] = useState(guided);
  const checked = chosen !== undefined;
  const correct = chosen === question.correct;
  return (
    <div className="rm-question">
      <h3>{question.prompt}</h3>
      <div className="rm-options" role="group" aria-label="Answer choices">
        {question.options.map((option, i) => (
          <button
            key={i}
            disabled={disabled || checked}
            aria-pressed={(checked ? chosen : selection) === i}
            onClick={() => setSelection(i)}
          >
            <span aria-hidden="true">{String.fromCharCode(65 + i)}</span>
            {option}
          </button>
        ))}
      </div>
      {!checked && (
        <>
          <button
            className="rm-hint"
            onClick={() => setHint(!hint)}
            aria-expanded={hint}
          >
            {hint ? "Hide hint" : "Need a hint?"}
          </button>
          {hint && <p className="rm-hint-copy">{question.hint}</p>}
          <SpringButton
            className="rm-primary"
            disabled={disabled || selection === null}
            onClick={() => selection !== null && void onCheck(selection)}
          >
            Check answer
          </SpringButton>
        </>
      )}
      {checked && (
        <div
          className="rm-feedback"
          data-correct={correct}
          role="status"
          aria-live="polite"
        >
          <Mascot
            mood={correct ? "happy" : "encouraging"}
            movement={correct ? "hop" : "bow"}
            reactionKey={question.prompt}
            size="sm"
          />
          <div>
            <strong>
              {correct ? "That connects." : "Good try. Let's untangle it."}
            </strong>
            <p>{question.explanation}</p>
            {!correct && (
              <>
                <p>
                  <strong>The correct answer:</strong>{" "}
                  {question.options[question.correct]}
                </p>
                <p>
                  <strong>A simpler example:</strong> {question.simplerExample}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
