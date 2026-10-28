import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motionTokens, motionVariables } from "@/lib/motionTokens";
import { Mascot } from "@/components/Mascot";
import { StudyObject } from "@/components/onboarding/StudyObject";
import { SpringButton } from "@/components/ui/SpringButton";
import {
  TOPIC_GUIDES,
  GUIDE_SUBJECTS,
  guideSubject,
  type TopicGuide,
} from "@/lib/topicGuides";
import { playSuccess } from "@/lib/soundFX";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import "./guidebook.css";

interface TopicGuidebookProps {
  isOpen: boolean;
  onClose: () => void;
  subjectName: string;
  navigate: (route: string) => void;
}
/** Reading checks are deliberately visit-only and independent of lesson XP/unlocks. */
export function TopicGuidebook({
  isOpen,
  onClose,
  subjectName,
  navigate,
}: TopicGuidebookProps) {
  const [subject, setSubject] = useState(() => guideSubject(subjectName));
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<TopicGuide | null>(null);
  const [chapterIndex, setChapterIndex] = useState<number | null>(null);
  const [answer, setAnswer] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [done, setDone] = useState<ReadonlySet<string>>(() => new Set());
  const feedback = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    setSubject(guideSubject(subjectName));
    setTopic(null);
    setChapterIndex(null);
  }, [subjectName]);
  useEffect(() => {
    if (isOpen) heading.current?.focus({ preventScroll: true });
  }, [topic, chapterIndex, isOpen]);
  useEffect(() => {
    if (checked)
      feedback.current?.scrollIntoView?.({
        block: "nearest",
        behavior: reduced ? "auto" : "smooth",
      });
  }, [checked, reduced]);
  const chapter =
    topic && chapterIndex !== null ? topic.chapters[chapterIndex] : null;
  const correct = chapter !== null && answer === chapter.correct;
  const finished = topic
    ? topic.chapters.filter((item) => done.has(`${topic.id}/${item.id}`)).length
    : 0;
  const topics = TOPIC_GUIDES.filter((item) =>
    query
      ? `${item.title} ${item.subject} ${item.summary}`
          .toLowerCase()
          .includes(query.toLowerCase())
      : item.subject === subject,
  );
  function read(index: number) {
    setChapterIndex(index);
    setAnswer(null);
    setChecked(false);
  }
  function back() {
    if (chapterIndex !== null) {
      setChapterIndex(null);
      setAnswer(null);
      setChecked(false);
    } else if (topic) {
      setTopic(null);
    } else onClose();
  }
  function check() {
    if (!topic || !chapter || answer === null) return;
    setChecked(true);
    if (answer === chapter.correct) {
      setDone(
        (previous) => new Set([...previous, `${topic.id}/${chapter.id}`]),
      );
      playSuccess();
    }
  }
  const title = chapter
    ? chapter.title
    : topic
      ? topic.title
      : `Explore ${subject}`;
  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="guidebook-overlay" />
        <Dialog.Content
          className="guidebook-dialog"
          style={motionVariables}
          aria-describedby="guidebook-description"
        >
          <header className="guidebook-header">
            <button
              aria-label={
                chapter
                  ? "Back to topic map"
                  : topic
                    ? "Back to topics"
                    : "Close guidebook"
              }
              onClick={back}
              className="guidebook-icon"
            >
              ←
            </button>
            <div>
              <Dialog.Title>Topic guidebook</Dialog.Title>
              <Dialog.Description id="guidebook-description">
                Read it. Try it. Make it click.
              </Dialog.Description>
            </div>
            <button
              aria-label="Close guidebook"
              onClick={onClose}
              className="guidebook-icon"
            >
              ×
            </button>
          </header>
          <main
            className="guidebook-body"
            key={`${topic?.id || subject}-${chapterIndex}`}
          >
            {!topic && (
              <>
                <div className="guidebook-intro">
                  <Mascot
                    mood="encouraging"
                    movement="wave"
                    animate={!reduced}
                    pauseWhenHidden
                    size="sm"
                  />
                  <div>
                    <h2 ref={heading} tabIndex={-1}>
                      {title}
                    </h2>
                    <p>
                      Choose a starter topic and work through it one idea at a
                      time.
                    </p>
                  </div>
                </div>
                <label className="guidebook-search">
                  Find a topic
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Try integral basics or cells"
                  />
                </label>
                <div className="guidebook-subjects" aria-label="Guide subjects">
                  {GUIDE_SUBJECTS.map((item) => (
                    <button
                      key={item}
                      aria-pressed={subject === item && !query}
                      onClick={() => {
                        setSubject(item);
                        setQuery("");
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <div className="guidebook-topics">
                  {topics.map((item) => (
                    <SpringButton
                      key={item.id}
                      soundEnabled={false}
                      className="guidebook-topic"
                      onClick={() => {
                        setTopic(item);
                        setChapterIndex(null);
                      }}
                    >
                      <StudyObject kind={item.kind} accent="#9BC464" />
                      <span>
                        <strong>{item.title}</strong>
                        <span>{item.summary}</span>
                        <small>
                          {item.chapters.length} short chapters · {item.subject}
                        </small>
                      </span>
                      <span aria-hidden="true">→</span>
                    </SpringButton>
                  ))}
                </div>
                {topics.length === 0 && (
                  <div className="guidebook-empty">
                    <Mascot mood="encouraging" size="sm" />
                    <h3>No starter guide matches yet.</h3>
                    <p>
                      Try a broader topic, or bring your own material to Source
                      Library.
                    </p>
                    <button
                      onClick={() => {
                        onClose();
                        navigate("/sources");
                      }}
                    >
                      Open Source Library
                    </button>
                  </div>
                )}
                <p className="guidebook-note">
                  Starter guides are curated lessons. Quick checks stay in this
                  visit and have no score.
                </p>
              </>
            )}
            {topic && !chapter && (
              <>
                <div className="guidebook-topic-heading">
                  <StudyObject kind={topic.kind} accent="#9BC464" />
                  <div>
                    <p className="guidebook-label">
                      {topic.subject} · Topic path
                    </p>
                    <h2 ref={heading} tabIndex={-1}>
                      {title}
                    </h2>
                    <p>{topic.summary}</p>
                  </div>
                </div>
                <div className="guidebook-progress" role="status">
                  {finished} of {topic.chapters.length} checks explored this
                  visit
                </div>
                <ol
                  className="guidebook-path"
                  aria-label={`${topic.title} chapters`}
                >
                  {topic.chapters.map((item, index) => {
                    const completed = done.has(`${topic.id}/${item.id}`);
                    const next =
                      index ===
                      topic.chapters.findIndex(
                        (part) => !done.has(`${topic.id}/${part.id}`),
                      );
                    return (
                      <li
                        key={item.id}
                        style={{
                          animationDelay: `${reduced ? 0 : index * motionTokens.stagger}s`,
                        }}
                        data-complete={completed}
                        data-next={next}
                      >
                        <span
                          className="guidebook-path-line"
                          aria-hidden="true"
                        />
                        <div className="guidebook-node-group">
                          <button
                            onClick={() => read(index)}
                            aria-label={`Read ${item.title}`}
                            className="guidebook-node"
                          >
                            <span aria-hidden="true">
                              {completed ? "✓" : index + 1}
                            </span>
                          </button>
                          {next && (
                            <div
                              className="guidebook-path-companion"
                              aria-hidden="true"
                            >
                              <Mascot
                                mood="encouraging"
                                movement="curious"
                                animate={!reduced}
                                pauseWhenHidden
                                size="sm"
                              />
                            </div>
                          )}
                        </div>
                        <button
                          className="guidebook-node-label"
                          onClick={() => read(index)}
                        >
                          {item.title}
                          <span>
                            {completed ? "Revisit" : "Read chapter"}{" "}
                            <span aria-hidden="true">→</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
                <div className="guidebook-next-note">
                  <Mascot
                    mood={
                      finished === topic.chapters.length
                        ? "happy"
                        : "encouraging"
                    }
                    size="sm"
                    animate={!reduced}
                  />
                  <p>
                    {finished === topic.chapters.length
                      ? "You worked through every check. Revisit any idea, or try another topic."
                      : "Start at the top, or revisit any chapter. Go at your own pace."}
                  </p>
                </div>
              </>
            )}
            {topic && chapter && (
              <article className="guidebook-lesson">
                <div className="guidebook-chapter-top">
                  <p className="guidebook-label">
                    {topic.title} · Chapter {chapterIndex! + 1} of{" "}
                    {topic.chapters.length}
                  </p>
                  <Mascot
                    mood={
                      checked ? (correct ? "happy" : "encouraging") : "thinking"
                    }
                    movement={checked ? (correct ? "hop" : "bow") : "curious"}
                    reactionKey={`${chapter.id}-${checked}`}
                    animate={!reduced}
                    pauseWhenHidden
                    size="sm"
                  />
                </div>
                <h2 ref={heading} tabIndex={-1}>
                  {title}
                </h2>
                <p className="guidebook-idea">{chapter.idea}</p>
                <section className="guidebook-example">
                  <h3>A worked example</h3>
                  <p>{chapter.example}</p>
                </section>
                <section
                  className="guidebook-check"
                  aria-labelledby="guide-check-title"
                >
                  <p className="guidebook-label">Try the idea · no score</p>
                  <h3 id="guide-check-title">{chapter.prompt}</h3>
                  <div className="guidebook-options">
                    {chapter.options.map((option, index) => (
                      <button
                        key={option}
                        disabled={checked}
                        aria-pressed={answer === index}
                        onClick={() => setAnswer(index)}
                      >
                        <span aria-hidden="true">
                          {String.fromCharCode(65 + index)}
                        </span>
                        {option}
                      </button>
                    ))}
                  </div>
                  {checked && (
                    <div
                      ref={feedback}
                      className="guidebook-feedback"
                      role="status"
                      aria-live="polite"
                      data-correct={correct}
                    >
                      <strong>
                        {correct
                          ? "That's the idea."
                          : "Good try. Here's the connection."}
                      </strong>
                      <p>{chapter.why}</p>
                    </div>
                  )}
                </section>
              </article>
            )}
          </main>
          {chapter && topic && (
            <footer className="guidebook-actions">
              {!checked ? (
                <SpringButton
                  soundEnabled={false}
                  disabled={answer === null}
                  onClick={check}
                >
                  Check my understanding
                </SpringButton>
              ) : !correct ? (
                <SpringButton
                  soundEnabled={false}
                  onClick={() => {
                    setAnswer(null);
                    setChecked(false);
                  }}
                >
                  Try the check again
                </SpringButton>
              ) : (
                <SpringButton
                  soundEnabled={false}
                  onClick={() => {
                    if (
                      chapterIndex !== null &&
                      chapterIndex < topic.chapters.length - 1
                    )
                      read(chapterIndex + 1);
                    else setChapterIndex(null);
                  }}
                >
                  {chapterIndex === topic.chapters.length - 1
                    ? "See my topic path"
                    : "Next idea"}
                  <span aria-hidden="true">→</span>
                </SpringButton>
              )}
            </footer>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
