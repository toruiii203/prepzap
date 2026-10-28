import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { Mascot } from "@/components/Mascot";
import { SpringButton } from "@/components/ui/SpringButton";
import { StudyObject } from "@/components/onboarding/StudyObject";
import { loadLibrary, type SourceFile } from "@/lib/sourceContext";
import { motionVariables } from "@/lib/motionTokens";
import {
  generateRoadmap,
  generateRoadmapLesson,
  generateFreshChecks,
  roadmapError,
} from "@/lib/roadmapGeneration";
import {
  loadRoadmaps,
  saveRoadmap,
  deleteRoadmap,
  exportRoadmap,
  parseRoadmapBackup,
} from "@/lib/roadmapStore";
import { sourceFromText, readRoadmapFile } from "@/lib/roadmapSource";
import {
  BROAD_TOPICS,
  emptyProgress,
  unitStatus,
  type RoadmapSource,
  type RoadmapOutline,
  type SavedRoadmap,
  type UnitProgress,
} from "@/lib/learningRoadmap";
import { RoadmapLesson } from "./RoadmapLesson";
import "./roadmaps.css";
export function LearningRoadmaps({ subjectName }: { subjectName: string }) {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <AccountRoadmaps
      key={user.id}
      ownerId={user.id}
      subjectName={subjectName}
    />
  );
}
function AccountRoadmaps({
  ownerId,
  subjectName,
}: {
  ownerId: string;
  subjectName: string;
}) {
  const [selectedDrawerUnit, setSelectedDrawerUnit] = useState<number | null>(null);
  const [paths, setPaths] = useState<SavedRoadmap[]>([]),
    [loading, setLoading] = useState(true),
    [open, setOpen] = useState(false),
    [active, setActive] = useState<SavedRoadmap | null>(null),
    [unit, setUnit] = useState<number | null>(null);
  const [mode, setMode] = useState<"topic" | "file">("topic"),
    [topic, setTopic] = useState(""),
    [focus, setFocus] = useState(""),
    [level, setLevel] = useState("Foundations"),
    [source, setSource] = useState<RoadmapSource | undefined>(),
    [library, setLibrary] = useState<SourceFile[]>([]),
    [outline, setOutline] = useState<RoadmapOutline | null>(null),
    [busy, setBusy] = useState(""),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [storageError, setStorageError] = useState(""),
    [confirmDelete, setConfirmDelete] = useState(false);
  const alive = useRef(true),
    requests = useRef({ ticket: 0 }).current,
    fileInput = useRef<HTMLInputElement>(null),
    backupInput = useRef<HTMLInputElement>(null),
    heading = useRef<HTMLHeadingElement>(null),
    body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    alive.current = true;
    void loadRoadmaps(ownerId)
      .then((data) => {
        if (alive.current) setPaths(data);
      })
      .catch(() => {
        if (alive.current)
          setStorageError(
            "Saved roadmaps could not be loaded. Check browser storage permissions before creating a new path. Existing data has not been deleted.",
          );
      })
      .finally(() => {
        if (alive.current) setLoading(false);
      });
    return () => {
      alive.current = false;
      requests.ticket++;
    };
  }, [ownerId, requests]);
  const hasOutline = Boolean(outline);
  useEffect(() => {
    if (open) {
      body.current?.scrollTo?.({ top: 0, behavior: "instant" });
      heading.current?.focus({ preventScroll: true });
    }
  }, [open, active?.id, unit, hasOutline]);
  async function persist(next: SavedRoadmap) {
    setSaving(true);
    try {
      await saveRoadmap(next);
      if (alive.current) {
        setActive(next);
        setPaths((previous) => [
          next,
          ...previous.filter((item) => item.id !== next.id),
        ]);
      }
      return true;
    } catch {
      if (alive.current)
        setError(
          "Your latest change was not saved. Check browser storage space or permissions and try again. Earlier saved work is safe.",
        );
      return false;
    } finally {
      if (alive.current) setSaving(false);
    }
  }
  function close() {
    requests.ticket++;
    setBusy("");
    setError("");
    setOpen(false);
    setConfirmDelete(false);
  }
  function create() {
    setActive(null);
    setUnit(null);
    setOutline(null);
    setTopic("");
    setFocus("");
    setSource(undefined);
    setMode("topic");
    setError("");
    setLibrary(loadLibrary());
    setOpen(true);
  }
  function resume(path: SavedRoadmap) {
    setActive(path);
    setUnit(null);
    setError("");
    setConfirmDelete(false);
    setOpen(true);
  }
  const broad = BROAD_TOPICS.has(topic.trim().toLowerCase());
  const canGenerate =
    !busy &&
    !saving &&
    !storageError &&
    (mode === "file"
      ? Boolean(source)
      : topic.trim().length >= 3 && (!broad || focus.trim().length >= 3));
  async function plan() {
    if (!canGenerate) return;
    const token = ++requests.ticket;
    setBusy("Planning your chapters");
    setError("");
    try {
      const value = await generateRoadmap(
        mode === "file" ? source!.name : topic.trim(),
        focus.trim(),
        level,
        mode === "file" ? source : undefined,
      );
      if (alive.current && requests.ticket === token) setOutline(value);
    } catch (err) {
      if (alive.current && requests.ticket === token)
        setError(roadmapError(err));
    } finally {
      if (alive.current && requests.ticket === token) setBusy("");
    }
  }
  async function accept() {
    if (!outline) return;
    setError("");
    const now = Date.now();
    await persist({
      version: 1,
      id: crypto.randomUUID(),
      ownerId,
      createdAt: now,
      updatedAt: now,
      outline,
      topic: mode === "file" ? source!.name : topic.trim(),
      level,
      source: mode === "file" ? source : undefined,
      lessons: {},
      progress: {},
    });
  }
  async function openUnit(index: number) {
    setError("");
    if (!active) return;
    if (active.lessons[String(index)]) {
      setUnit(index);
      return;
    }
    const token = ++requests.ticket;
    const path = active;
    setBusy(`Preparing chapter ${index + 1}`);
    try {
      const lesson = await generateRoadmapLesson(path, index);
      if (!alive.current || token !== requests.ticket) return;
      if (
        await persist({
          ...path,
          updatedAt: Date.now(),
          lessons: { ...path.lessons, [String(index)]: lesson },
        })
      )
        setUnit(index);
    } catch (err) {
      if (alive.current && requests.ticket === token)
        setError(roadmapError(err));
    } finally {
      if (alive.current && requests.ticket === token) setBusy("");
    }
  }
  async function updateProgress(progress: UnitProgress) {
    if (!active || unit === null) return false;
    setError("");
    return persist({
      ...active,
      updatedAt: Date.now(),
      progress: { ...active.progress, [String(unit)]: progress },
    });
  }
  async function fresh(stage: "checkpoint" | "review") {
    if (!active || unit === null) return;
    const path = active,
      index = unit,
      token = ++requests.ticket;
    setBusy("Writing fresh questions");
    setError("");
    try {
      const lesson = path.lessons[String(index)],
        questions = await generateFreshChecks(path, index, lesson, stage);
      if (!alive.current || token !== requests.ticket) return;
      const progress = path.progress[String(index)] || emptyProgress();
      const answers = Object.fromEntries(
        Object.entries(progress.answers).filter(
          ([key]) => !key.startsWith(stage + "-"),
        ),
      );
      await persist({
        ...path,
        updatedAt: Date.now(),
        lessons: {
          ...path.lessons,
          [String(index)]: { ...lesson, [stage]: questions },
        },
        progress: {
          ...path.progress,
          [String(index)]: {
            ...progress,
            answers,
            readyAt: stage === "checkpoint" ? undefined : progress.readyAt,
            reviewedAt: undefined,
          },
        },
      });
    } catch (err) {
      if (alive.current && requests.ticket === token)
        setError(roadmapError(err));
    } finally {
      if (alive.current && requests.ticket === token) setBusy("");
    }
  }
  async function upload(file: File | undefined) {
    if (!file) return;
    const token = ++requests.ticket;
    setBusy("Reading your file");
    setError("");
    setSource(undefined);
    setOutline(null);
    try {
      const value = await readRoadmapFile(file);
      if (alive.current && requests.ticket === token) setSource(value);
    } catch (err) {
      if (alive.current && requests.ticket === token)
        setError(roadmapError(err));
    } finally {
      if (alive.current && requests.ticket === token) setBusy("");
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  async function restoreBackup(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      if (file.size > 5 * 1024 * 1024)
        throw new Error("Choose a roadmap backup up to 5 MB.");
      const value: unknown = JSON.parse(await file.text());
      const path = parseRoadmapBackup(value, ownerId);
      if (await persist(path)) {
        setUnit(null);
        setOpen(true);
      }
    } catch {
      setOpen(true);
      setError(
        "This backup could not be restored. Choose a valid Studenius roadmap JSON file. Existing roadmaps are unchanged.",
      );
    } finally {
      if (backupInput.current) backupInput.current.value = "";
    }
  }
  async function remove() {
    if (!active) return;
    setSaving(true);
    try {
      await deleteRoadmap(ownerId, active.id);
      if (alive.current) {
        setPaths((previous) =>
          previous.filter((path) => path.id !== active.id),
        );
        close();
      }
    } catch {
      setError("This roadmap could not be deleted. Please retry.");
    } finally {
      if (alive.current) setSaving(false);
    }
  }
  const pending = Boolean(busy) || saving;
  return (
    <section
      className="rm-dashboard"
      data-guide-target="learning-roadmaps"
      style={motionVariables}
    >
      <header className="rm-dashboard-heading">
        <div>
          <p className="rm-eyebrow">One idea, step by step</p>
          <h2>Your learning roadmaps</h2>
        </div>
        <button
          className="rm-new"
          data-guide-target="new-roadmap"
          onClick={create}
          disabled={loading || Boolean(storageError)}
          aria-label="Create a learning roadmap"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            add
          </span>
          New roadmap
        </button>
      </header>
      {storageError && (
        <p className="rm-error" role="alert">
          {storageError}
        </p>
      )}
      {loading ? (
        <div className="rm-skeleton" role="status">
          Loading saved roadmaps…
          <span />
          <span />
        </div>
      ) : paths.length === 0 ? (
        <div className="rm-empty">
          <StudyObject kind="book" accent="#9BC464" />
          <div>
            <h3>Make your next topic make sense.</h3>
            <p>
              Start with a topic or one file. Build understanding, try it
              yourself, then return for review.
            </p>
            <SpringButton
              className="rm-primary"
              onClick={create}
              disabled={Boolean(storageError)}
            >
              Build my first roadmap <span aria-hidden="true">→</span>
            </SpringButton>
          </div>
        </div>
      ) : (
        <div className="rm-saved-list">
          {paths.map((path) => {
            const started = Object.keys(path.progress).length;
            const due = path.outline.units.filter(
              (_, i) =>
                unitStatus(
                  path.lessons[String(i)],
                  path.progress[String(i)],
                ) === "Review due",
            ).length;
            return (
              <button
                key={path.id}
                className="rm-saved-card"
                onClick={() => resume(path)}
              >
                <span
                  className="rm-saved-icon material-symbols-outlined"
                  aria-hidden="true"
                >
                  route
                </span>
                <span>
                  <strong>{path.outline.title}</strong>
                  <span>
                    {path.source ? `From ${path.source.name}` : "Topic roadmap"}{" "}
                    · {path.outline.units.length} chapters
                  </span>
                  <small>
                    {due
                      ? `${due} chapter${due === 1 ? "" : "s"} ready for later review`
                      : started
                        ? "Continue where you left off"
                        : "Choose your first chapter"}
                  </small>
                </span>
                <span aria-hidden="true">→</span>
              </button>
            );
          })}
        </div>
      )}
      <input
        className="rm-file-input"
        type="file"
        accept=".json"
        aria-label="Restore roadmap backup"
        ref={backupInput}
        onChange={(event) => void restoreBackup(event.target.files?.[0])}
      />
      <button
        className="rm-text-button"
        disabled={loading || Boolean(storageError) || saving}
        onClick={() => backupInput.current?.click()}
      >
        Restore a roadmap backup
      </button>
      <p className="rm-device-note">
        <span className="material-symbols-outlined" aria-hidden="true">
          devices
        </span>
        Saved on this device for your account. Export a backup from a roadmap.
      </p>
      <Dialog.Root
        open={open}
        onOpenChange={(value) => {
          if (!value && !saving) close();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="rm-overlay" />
          <Dialog.Content
            className="rm-dialog"
            style={motionVariables}
            aria-describedby="rm-dialog-description"
          >
            <header className="rm-dialog-heading">
              <div>
                <Dialog.Title>
                  {active
                    ? "Your learning roadmap"
                    : outline
                      ? "Review your roadmap"
                      : "Start a learning roadmap"}
                </Dialog.Title>
                <Dialog.Description id="rm-dialog-description">
                  {active
                    ? active.outline.title
                    : "One topic or one file. A clear path forward."}
                </Dialog.Description>
              </div>
              <button
                aria-label="Close learning roadmap"
                className="rm-icon-button"
                disabled={saving}
                onClick={close}
              >
                ×
              </button>
            </header>
            {error && (
              <div className="rm-error" role="alert">
                {error}
                <button onClick={() => setError("")} aria-label="Dismiss error">
                  ×
                </button>
              </div>
            )}
            <div className="rm-dialog-body" ref={body} aria-busy={pending}>
              {busy ? (
                <div className="rm-loading" role="status">
                  <Mascot mood="thinking" size="md" />
                  <h2>{busy}</h2>
                  <p>
                    {busy === "Reading your file"
                      ? "Extracting readable text on this device."
                      : "Waiting for your study material. This may take a little time."}
                  </p>
                  <div className="rm-skeleton" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                  <p className="rm-fine">
                    You can close this window. A generation request already sent
                    may still count toward your allowance.
                  </p>
                </div>
              ) : active ? (
                unit !== null && active.lessons[String(unit)] ? (
                  <>
                    <button
                      className="rm-back"
                      onClick={() => setUnit(null)}
                      disabled={saving}
                    >
                      ← Back to topic path
                    </button>
                    <RoadmapLesson
                      key={`${active.id}-${unit}`}
                      path={active}
                      index={unit}
                      saving={saving}
                      busy={Boolean(busy)}
                      onProgress={updateProgress}
                      onFresh={(stage) => void fresh(stage)}
                    />
                  </>
                ) : (
                  <>
                    <div className="rm-map-intro">
                      <div>
                        <p className="rm-eyebrow">
                          {active.level} · {active.outline.units.length}{" "}
                          chapters
                        </p>
                        <h2 ref={heading} tabIndex={-1}>
                          {active.outline.title}
                        </h2>
                        <p>{active.outline.summary}</p>
                      </div>
                      <Mascot
                        mood="encouraging"
                        movement="wave"
                        size="sm"
                        pauseWhenHidden
                      />
                    </div>
                    {active.outline.prerequisites.length > 0 && (
                      <details className="rm-prerequisites">
                        <summary>Helpful starting knowledge</summary>
                        <ul>
                          {active.outline.prerequisites.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                    {active.source && (
                      <p className="rm-source-note">
                        Based on {active.source.name}. {active.source.coverage}.
                        Check important details against the original.
                      </p>
                    )}
                    {/* Exam countdown and mastery header */}
                    {(() => {
                      const doneCount = active.outline.units.filter(
                        (_, idx) => active.progress[String(idx)]?.reviewedAt || active.progress[String(idx)]?.readyAt || active.progress[String(idx)]?.read
                      ).length;
                      const pct = Math.round((doneCount / active.outline.units.length) * 100);
                      return (
                        <div className="rm-exam-header" role="region" aria-label="Roadmap progress">
                          <div className="rm-exam-stats">
                            <span>Exam in 90 days · Grade Goal: 1.00</span>
                            <strong>{pct}% Complete</strong>
                          </div>
                          <div className="rm-exam-progress-bar" aria-hidden="true">
                            <div className="rm-exam-progress-fill" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Winding serpentine path */}
                    <div className="rm-serpentine-container">
                      <ol className="rm-serpentine-list" aria-label="Topic chapters">
                        {active.outline.units.map((chapter, i) => {
                          const isDone = Boolean(active.progress[String(i)]?.reviewedAt || active.progress[String(i)]?.readyAt || active.progress[String(i)]?.read);
                          const isCurrentActive = !isDone && (i === 0 || Boolean(active.progress[String(i - 1)]?.read));
                          const align = ['center', 'left', 'center', 'right'][i % 4];
                          const kindIcon = chapter.kind === 'foundation' ? 'mic' : chapter.kind === 'application' ? 'edit_note' : 'emoji_events';

                          return (
                            <li key={i} className="rm-serpentine-item" data-align={align}>
                              {isCurrentActive && (
                                <div className="rm-node-companion" aria-hidden="true">
                                  <Mascot mood="encouraging" size="xs" />
                                  <div className="rm-node-speech-bubble">Start!</div>
                                </div>
                              )}
                              <button
                                className="rm-node-btn"
                                data-state={isDone ? 'completed' : isCurrentActive ? 'active' : 'upcoming'}
                                aria-label={`Open chapter ${i + 1}: ${chapter.title}`}
                                disabled={saving}
                                onClick={() => setSelectedDrawerUnit(i)}
                              >
                                <span className="material-symbols-outlined rm-node-icon" aria-hidden="true">
                                  {isDone ? 'check' : kindIcon}
                                </span>
                              </button>
                              <div className="rm-node-label">
                                <strong>{chapter.title}</strong>
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    </div>

                    {/* Node Inspector Drawer */}
                    {selectedDrawerUnit !== null && (
                      <>
                        <div
                          className="rm-drawer-overlay"
                          onClick={() => setSelectedDrawerUnit(null)}
                          aria-hidden="true"
                        />
                        <div className="rm-node-drawer" role="dialog" aria-label="Chapter Preview">
                          <div className="rm-drawer-handle" aria-hidden="true" />
                          <div className="rm-drawer-header">
                            <span className="rm-drawer-tag">
                              {active.outline.units[selectedDrawerUnit].kind === 'foundation' ? '🎙️ Socratic Recall' : active.outline.units[selectedDrawerUnit].kind === 'application' ? '📄 Application Check' : '👑 Boss Synthesis'}
                            </span>
                            <button
                              className="rm-icon-button"
                              onClick={() => setSelectedDrawerUnit(null)}
                              aria-label="Dismiss preview"
                            >
                              ×
                            </button>
                          </div>
                          <h3 className="rm-drawer-title">
                            {active.outline.units[selectedDrawerUnit].title}
                          </h3>
                          <p className="rm-drawer-desc">
                            {active.outline.units[selectedDrawerUnit].objective}
                          </p>
                          <div className="rm-drawer-stats">
                            <div className="rm-stat-chip">
                              <span className="material-symbols-outlined" aria-hidden="true">bolt</span>
                              <span>⚡ 3 min sprint</span>
                            </div>
                            <div className="rm-stat-chip">
                              <span className="material-symbols-outlined" aria-hidden="true">eco</span>
                              <span>🌱 +35 XP</span>
                            </div>
                          </div>
                          <SpringButton
                            className="rm-drawer-cta"
                            disabled={saving}
                            onClick={() => {
                              const idx = selectedDrawerUnit;
                              setSelectedDrawerUnit(null);
                              void openUnit(idx);
                            }}
                          >
                            Start Chapter <span aria-hidden="true">→</span>
                          </SpringButton>
                        </div>
                      </>
                    )}
                    <div className="rm-manage">
                      <button
                        className="rm-secondary"
                        onClick={() => exportRoadmap(active)}
                      >
                        Export roadmap & progress
                      </button>
                      <button
                        className="rm-text-button"
                        onClick={() => setConfirmDelete(true)}
                      >
                        Delete roadmap
                      </button>
                    </div>
                    {confirmDelete && (
                      <div
                        className="rm-delete-confirm"
                        role="group"
                        aria-label="Confirm roadmap deletion"
                      >
                        <p>
                          Delete this roadmap and its local progress? This
                          cannot be undone. Your Source Library is unaffected.
                        </p>
                        <button
                          className="rm-secondary"
                          onClick={() => setConfirmDelete(false)}
                        >
                          Keep roadmap
                        </button>
                        <button
                          className="rm-secondary"
                          disabled={saving}
                          onClick={() => void remove()}
                        >
                          Delete permanently
                        </button>
                      </div>
                    )}
                    <p className="rm-fine">
                      Export contains generated lessons, answers and extracted
                      source text. Keep it private. Device-only storage can be
                      cleared by your browser; it does not sync between devices.
                    </p>
                  </>
                )
              ) : outline ? (
                <div className="rm-outline">
                  <p className="rm-eyebrow">Check the scope before saving</p>
                  <h2 ref={heading} tabIndex={-1}>
                    {outline.title}
                  </h2>
                  <p>{outline.summary}</p>
                  <p className="rm-fine">
                    You can rename chapters below. To change the subject or
                    coverage, go back and adjust your input.
                  </p>
                  <ol>
                    {outline.units.map((chapter, i) => (
                      <li key={i}>
                        <label className="rm-field">
                          Chapter {i + 1}
                          <input
                            value={chapter.title}
                            maxLength={120}
                            onChange={(event) =>
                              setOutline({
                                ...outline,
                                units: outline.units.map((unit, j) =>
                                  i === j
                                    ? { ...unit, title: event.target.value }
                                    : unit,
                                ),
                              })
                            }
                          />
                        </label>
                        <p>{chapter.objective}</p>
                        {chapter.evidence.length > 0 && (
                          <details>
                            <summary>Source support</summary>
                            {chapter.evidence.map((quote, j) => (
                              <blockquote key={j}>{quote}</blockquote>
                            ))}
                          </details>
                        )}
                      </li>
                    ))}
                  </ol>
                  <div className="rm-actions">
                    <button
                      className="rm-secondary"
                      disabled={saving}
                      onClick={() => setOutline(null)}
                    >
                      Adjust topic or file
                    </button>
                    <SpringButton
                      className="rm-primary"
                      disabled={
                        saving ||
                        outline.units.some(
                          (unit) => unit.title.trim().length < 3,
                        ) ||
                        new Set(
                          outline.units.map((unit) =>
                            unit.title.trim().toLowerCase(),
                          ),
                        ).size !== outline.units.length
                      }
                      onClick={() => void accept()}
                    >
                      {saving ? "Saving…" : "Save this roadmap"}
                    </SpringButton>
                  </div>
                </div>
              ) : (
                <div className="rm-create">
                  <div className="rm-create-intro">
                    <StudyObject kind="book" accent="#9BC464" />
                    <div>
                      <h2 ref={heading} tabIndex={-1}>
                        What do you want to understand?
                      </h2>
                      <p>
                        We’ll break it into ideas you can learn, apply and
                        revisit.
                      </p>
                    </div>
                  </div>
                  <div
                    className="rm-mode"
                    role="group"
                    aria-label="Roadmap input"
                  >
                    <button
                      aria-pressed={mode === "topic"}
                      onClick={() => {
                        setMode("topic");
                        setError("");
                      }}
                    >
                      Enter a topic
                    </button>
                    <button
                      aria-pressed={mode === "file"}
                      onClick={() => {
                        setMode("file");
                        setError("");
                      }}
                    >
                      Use one file
                    </button>
                  </div>
                  {mode === "topic" ? (
                    <>
                      <label className="rm-field">
                        Topic
                        <input
                          value={topic}
                          maxLength={180}
                          onChange={(event) => setTopic(event.target.value)}
                          placeholder={`e.g. ${subjectName === "Biology" ? "Photosynthesis" : "Integration by substitution"}`}
                        />
                      </label>
                      <label className="rm-field">
                        {broad
                          ? "Choose a focus to keep this useful"
                          : "Focus or learning goal (optional)"}
                        <input
                          value={focus}
                          maxLength={250}
                          onChange={(event) => setFocus(event.target.value)}
                          placeholder={
                            broad
                              ? "e.g. Cell structure and transport"
                              : "e.g. Solve introductory exam questions"
                          }
                        />
                      </label>
                      {broad && (
                        <p className="rm-fine">
                          That subject is broad. Choose a chapter, question or
                          exam area first.
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <input
                        ref={fileInput}
                        type="file"
                        accept=".pdf,.txt,.md,.markdown"
                        aria-label="Upload one roadmap file"
                        className="rm-file-input"
                        onChange={(event) =>
                          void upload(event.target.files?.[0])
                        }
                      />
                      <button
                        className="rm-upload"
                        onClick={() => fileInput.current?.click()}
                      >
                        <span
                          className="material-symbols-outlined"
                          aria-hidden="true"
                        >
                          upload_file
                        </span>
                        <strong>
                          {source ? "Replace selected file" : "Upload one file"}
                        </strong>
                        <span>PDF, TXT or Markdown · up to 5 MB</span>
                      </button>
                      {library.length > 0 && (
                        <label className="rm-field">
                          Or choose one from Source Library
                          <select
                            value=""
                            onChange={(event) => {
                              const file = library.find(
                                (item) => item.id === event.target.value,
                              );
                              if (!file) return;
                              setSource(undefined);
                              try {
                                setSource(
                                  sourceFromText(
                                    file.name,
                                    file.fullText || file.preview || "",
                                    file.fullText
                                      ? "Saved extracted text"
                                      : "Saved preview only",
                                  ),
                                );
                                setError("");
                              } catch (err) {
                                setError(roadmapError(err));
                              }
                            }}
                          >
                            <option value="">Select a saved file…</option>
                            {library.map((file) => (
                              <option key={file.id} value={file.id}>
                                {file.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      {source && (
                        <div className="rm-selected-source">
                          <strong>{source.name}</strong>
                          <p>{source.coverage}</p>
                          <p>
                            {source.text.length.toLocaleString()} characters
                            available for this roadmap.
                          </p>
                          <button
                            className="rm-text-button"
                            onClick={() => setSource(undefined)}
                          >
                            Remove selection
                          </button>
                        </div>
                      )}
                      <p className="rm-fine">
                        Text-based PDFs only; scanned pages need readable text
                        first. Up to 40 pages and 32,000 characters are
                        included. Reading limits appear above before you
                        generate.
                      </p>
                    </>
                  )}
                  <label className="rm-field">
                    Starting level
                    <select
                      value={level}
                      onChange={(event) => setLevel(event.target.value)}
                    >
                      <option>Foundations</option>
                      <option>High school</option>
                      <option>University introduction</option>
                      <option>Intermediate</option>
                    </select>
                  </label>
                  <p className="rm-privacy">
                    {mode === "file"
                      ? "Only the selected file’s extracted text is sent to the study-generation service. The original upload is not added to your library or cloud storage."
                      : "Your topic and focus are sent to the study-generation service. Active Source Library files are not included."}{" "}
                    Saved roadmaps stay on this device under your account.
                  </p>
                  <SpringButton
                    className="rm-primary"
                    disabled={!canGenerate}
                    onClick={() => void plan()}
                  >
                    Preview my roadmap <span aria-hidden="true">→</span>
                  </SpringButton>
                  <p className="rm-fine">
                    Each preview, new chapter or fresh question set uses your
                    existing Quick Study generation allowance. Saved lessons can
                    be read offline without generating again.
                  </p>
                </div>
              )}
            </div>
            <footer className="rm-dialog-footer">
              <span>
                {saving
                  ? "Saving on this device…"
                  : "Device-only · no XP or grade changes"}
              </span>
            </footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
