import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SocraticLessonSession } from "@/components/roadmaps/SocraticLessonSession";
import { evaluateSocraticResponse } from "@/lib/roadmapGeneration";
import type { SavedRoadmap, RoadmapLesson } from "@/lib/learningRoadmap";

vi.mock("@/lib/groq", () => ({
  callGroq: vi.fn(async () =>
    JSON.stringify({
      isAccurate: true,
      score: 90,
      praise: "Spot on!",
      feedback: "Great job putting it in your own words.",
      followupPrompt: "What about the second step?",
    })
  ),
  safeParseJSON: (raw: string) => JSON.parse(raw),
}));

vi.mock("canvas-confetti", () => ({
  default: vi.fn(),
}));

describe("Socratic SocraticLessonSession & Evaluation", () => {
  const dummyLesson: RoadmapLesson = {
    explanation: "This is a detailed explanation that teaches the concept clearly.",
    example: {
      problem: "Calculate the integral of 2x dx",
      steps: ["Apply power rule", "Add integration constant C"],
    },
    commonMistake: "Forgetting to add the constant C",
    evidence: [],
    guided: [
      {
        prompt: "What is the antiderivative of 2x?",
        options: ["x^2 + C", "2x + C", "x + C", "x^2"],
        correct: 0,
        hint: "Reverse the power rule",
        explanation: "Power rule gives x^2 + C",
        simplerExample: "Integral of x is x^2/2",
      },
      {
        prompt: "What happens without constant C?",
        options: ["Incomplete family", "Wrong derivative", "Zero function", "Infinity"],
        correct: 0,
        hint: "Think about arbitrary constants",
        explanation: "Constant C accounts for any vertical shift",
        simplerExample: "f(x) = x^2 + 5",
      },
    ],
    practice: [
      {
        prompt: "Practice question 1",
        options: ["A", "B", "C", "D"],
        correct: 0,
        hint: "Hint",
        explanation: "Explanation",
        simplerExample: "Example",
      },
      {
        prompt: "Practice question 2",
        options: ["A", "B", "C", "D"],
        correct: 0,
        hint: "Hint",
        explanation: "Explanation",
        simplerExample: "Example",
      },
    ],
    recall: [
      {
        prompt: "In your own words, what is an antiderivative?",
        answer: "The reverse operation of taking a derivative",
        criteria: ["reverse of derivative", "recovering the original function"],
      },
      {
        prompt: "Why is constant C essential?",
        answer: "Because derivatives of constants are zero",
        criteria: ["derivative of constant is zero", "family of functions"],
      },
    ],
    checkpoint: [
      {
        prompt: "Checkpoint 1",
        options: ["A", "B", "C", "D"],
        correct: 0,
        hint: "Hint",
        explanation: "Explanation",
        simplerExample: "Example",
      },
      {
        prompt: "Checkpoint 2",
        options: ["A", "B", "C", "D"],
        correct: 0,
        hint: "Hint",
        explanation: "Explanation",
        simplerExample: "Example",
      },
      {
        prompt: "Checkpoint 3",
        options: ["A", "B", "C", "D"],
        correct: 0,
        hint: "Hint",
        explanation: "Explanation",
        simplerExample: "Example",
      },
    ],
    review: [
      {
        prompt: "Review 1",
        options: ["A", "B", "C", "D"],
        correct: 0,
        hint: "Hint",
        explanation: "Explanation",
        simplerExample: "Example",
      },
      {
        prompt: "Review 2",
        options: ["A", "B", "C", "D"],
        correct: 0,
        hint: "Hint",
        explanation: "Explanation",
        simplerExample: "Example",
      },
    ],
  };

  const dummyRoadmap: SavedRoadmap = {
    version: 1,
    id: "test-roadmap-1",
    ownerId: "user-1",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    topic: "Calculus",
    level: "Foundations",
    outline: {
      title: "Calculus Foundations",
      summary: "Understand core derivatives and integrals",
      prerequisites: ["Algebra"],
      units: [
        {
          title: "Chapter 1 - Antiderivatives",
          objective: "Define and calculate basic antiderivatives",
          kind: "foundation",
          evidence: [],
        },
      ],
    },
    lessons: { "0": dummyLesson },
    progress: {},
  };

  it("evaluateSocraticResponse returns encouraging feedback for empty input", async () => {
    const res = await evaluateSocraticResponse("Math", "Integrals", "Explain C", "");
    expect(res.isAccurate).toBe(false);
    expect(res.praise).toContain("No worries");
  });

  it("evaluateSocraticResponse returns structured evaluation from AI", async () => {
    const res = await evaluateSocraticResponse(
      "Math",
      "Integrals",
      "Explain C",
      "It represents any constant since its derivative is zero."
    );
    expect(res.isAccurate).toBe(true);
    expect(res.score).toBeGreaterThan(0);
    expect(res.praise).toBe("Spot on!");
  });

  it("renders the pre-flight Explain it to Seedling briefing screen", () => {
    const saveMock = vi.fn(async () => true);
    const closeMock = vi.fn();

    render(
      <SocraticLessonSession
        path={dummyRoadmap}
        unitIndex={0}
        lesson={dummyLesson}
        progress={{ read: false, answers: {}, recalls: {} }}
        onSaveProgress={saveMock}
        onClose={closeMock}
      />
    );

    expect(screen.getByText("Explain it to Seedling")).toBeInTheDocument();
    expect(screen.getByText("Explain topics out loud")).toBeInTheDocument();
    expect(screen.getByText("Stuck? Seedling coaches you")).toBeInTheDocument();
  });

  it("transitions to Socratic dialogue and advances on skip", async () => {
    const saveMock = vi.fn(async () => true);
    const closeMock = vi.fn();

    render(
      <SocraticLessonSession
        path={dummyRoadmap}
        unitIndex={0}
        lesson={dummyLesson}
        progress={{ read: false, answers: {}, recalls: {} }}
        onSaveProgress={saveMock}
        onClose={closeMock}
      />
    );

    // Tap Start learning
    fireEvent.click(screen.getByText(/Start learning/i));

    // Now in Socratic phase
    expect(screen.getByText(/Welcome! Let's build your intuition/i)).toBeInTheDocument();
    expect(screen.getByText("Skip question")).toBeInTheDocument();

    // Skip turn 1
    fireEvent.click(screen.getByText("Skip question"));

    // Next turn prompt shows
    await waitFor(() => {
      expect(screen.getByText("Why is constant C essential?")).toBeInTheDocument();
    });
  });
});
