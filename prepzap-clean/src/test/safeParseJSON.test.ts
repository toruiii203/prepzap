import { describe, it, expect } from "vitest";
import { safeParseJSON } from "@/lib/groq";

describe("safeParseJSON robust parser", () => {
  it("parses the exact user failure where tokenization omitted the quote after evidence", () => {
    const raw = `{"title":"GDScript Foundations Roadmap","summary":"A step-by-step guide that moves learners from basic GDScript syntax to building a small interactive scene, ensuring each chapter builds on the previous one.","prerequisites":["Basic familiarity with the Godot editor and its scene system"],"units":[{"title":"Chapter 1 - GDScript Syntax Basics","objective":"Write simple GDScript files, declare variables of different types, and use basic operators.","kind":"foundation","evidence":[]},{"title":"Chapter 2 - Control Structures & Functions","objective":"Apply it/else, for/while loops and define and call functions within a script.","kind":"foundation","evidence":[]},{"title":"Chapter 3 - Nodes, Properties & Signals","objective":"Attach scripts to nodes, modify node properties in code, and connect to built-in signals.","kind":"application","evidence":[]},{"title":"Chapter 4 - Game Loop & Input Handling","objective":"Use _process and _input functions to move a character based on user input.","kind":"application","evidence":[]},{"title":"Chapter 5 - Project Integration & Synthesis","objective":"Build a small interactive scene that combines syntax, control flow, node manipulation and input handling, and explain the design decisions made.","kind":"synthesis","evidence:[]}]}`;
    const result = safeParseJSON<{
      title: string;
      units: Array<{ title: string; kind: string; evidence: string[] }>;
    }>(raw);

    expect(result.title).toBe("GDScript Foundations Roadmap");
    expect(result.units).toHaveLength(5);
    expect(result.units[4].title).toBe("Chapter 5 - Project Integration & Synthesis");
    expect(result.units[4].kind).toBe("synthesis");
    expect(result.units[4].evidence).toEqual([]);
  });

  it("handles markdown code fences and surrounding commentary", () => {
    const raw = `Here is your requested roadmap:
\`\`\`json
{
  "title": "Calculus I",
  "units": [{"title": "Limits", "kind": "foundation"}]
}
\`\`\`
Hope this helps!`;
    const result = safeParseJSON<{ title: string }>(raw);
    expect(result.title).toBe("Calculus I");
  });

  it("handles trailing commas in arrays and objects", () => {
    const raw = `{"items": [1, 2, 3,], "config": {"timeout": 1000,},}`;
    const result = safeParseJSON<{ items: number[]; config: { timeout: number } }>(raw);
    expect(result.items).toEqual([1, 2, 3]);
    expect(result.config.timeout).toBe(1000);
  });

  it("handles unquoted object keys", () => {
    const raw = `{ title: "Physics", units: [{ title: "Kinematics" }] }`;
    const result = safeParseJSON<{ title: string; units: Array<{ title: string }> }>(raw);
    expect(result.title).toBe("Physics");
    expect(result.units[0].title).toBe("Kinematics");
  });

  it("repairs unescaped LaTeX math formulas", () => {
    const raw = `{"explanation": "Use \\alpha and \\beta in \\frac{a}{b} and \\sqrt{x}"}`;
    const result = safeParseJSON<{ explanation: string }>(raw);
    expect(result.explanation).toContain("\\alpha");
    expect(result.explanation).toContain("\\beta");
  });

  it("sanitizes unescaped literal newlines and tabs inside strings", () => {
    const raw = `{"summary": "First line\nSecond line\nThird line\tTabbed"}`;
    const result = safeParseJSON<{ summary: string }>(raw);
    expect(result.summary).toContain("First line");
    expect(result.summary).toContain("Second line");
  });

  it("recovers from truncated JSON by closing open delimiters", () => {
    const raw = `{"title": "Truncated Roadmap", "units": [{"title": "Chapter 1", "objective": "Basics"`;
    const result = safeParseJSON<{ title: string; units: Array<{ title: string }> }>(raw);
    expect(result.title).toBe("Truncated Roadmap");
    expect(result.units[0].title).toBe("Chapter 1");
  });

  it("throws clear error message when text is completely non-JSON", () => {
    expect(() => safeParseJSON("This is just plain text without any JSON")).toThrow(
      "AI returned malformed JSON. Please try again."
    );
  });
});
