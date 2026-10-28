import { sanitizeGeneratedOutline, sanitizeGeneratedLesson } from "@/lib/roadmapGeneration";
import { it, expect, vi, afterEach } from "vitest";
import { callGroq } from "@/lib/groq";
import { buildImageMessages } from "@/lib/sourceContext";
vi.mock("@/lib/authSession", () => ({
  ensureFreshAccessToken: vi.fn(async () => "fixture-token"),
}));
vi.mock("@/lib/sourceContext", () => ({
  buildImageMessages: vi.fn(() => [
    {
      type: "image",
      source: {
        type: "base64",
        media_type: "image/png",
        data: "PRIVATE_OTHER_FILE",
      },
    },
  ]),
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it("keeps single-source roadmap requests isolated while preserving existing caller defaults", async () => {
  const fetchMock = vi.fn(
    async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(
        JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
  );
  vi.stubGlobal("fetch", fetchMock);
  await callGroq(
    "Only the chosen topic",
    "Teach this topic",
    "default",
    1000,
    "quick_study",
    { includeActiveImages: false },
  );
  expect(buildImageMessages).not.toHaveBeenCalled();
  const isolated = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
  expect(
    isolated.messages.every(
      (m: { content: unknown }) => typeof m.content === "string",
    ),
  ).toBe(true);
  expect(JSON.stringify(isolated)).not.toContain("PRIVATE_OTHER_FILE");
  await callGroq("Legacy tool request");
  expect(buildImageMessages).toHaveBeenCalledTimes(1);
  const legacy = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
  expect(JSON.stringify(legacy)).toContain("PRIVATE_OTHER_FILE");
});

it("sanitizeGeneratedOutline repairs malformed LLM responses, casing, duplicate titles, and quotes", () => {
  const source = {
    name: "4M-Reading-the-Image.pdf",
    text: "Visual literacy involves interpreting images, composition, lighting, and cultural symbols accurately in media analysis.",
    coverage: "3 of 3 pages",
  };

  const malformedRaw = {
    title: "Reading the Image",
    summary: "A guide to visual media.",
    prerequisites: ["N/A", null, "Basic critical reading skills"],
    units: [
      {
        title: "Introduction to Visual Literacy",
        objective: "Understand images",
        kind: "FOUNDATION",
        evidence: "Visual literacy involves interpreting images", // string instead of array!
      },
      {
        title: "Introduction to Visual Literacy", // duplicate title!
        objective: "Apply techniques",
        kind: "application",
        evidence: ["Non-matching hallucinated quote from AI"],
      },
      {
        title: "Synthesizing Media Texts",
        objective: "Combine analysis skills",
        kind: "APPLICATION", // last chapter not synthesis!
      },
    ],
  };

  const sanitized = sanitizeGeneratedOutline(malformedRaw, source);

  expect(sanitized.units).toHaveLength(3);
  expect(sanitized.units[0].kind).toBe("foundation");
  expect(sanitized.units[1].title).not.toBe(sanitized.units[0].title);
  expect(sanitized.units[2].kind).toBe("synthesis");
  // Prerequisites cleaned up
  expect(sanitized.prerequisites).toEqual(["Basic critical reading skills"]);
  // Evidence on unit 0 was wrapped and is a valid quote in source
  expect(Array.isArray(sanitized.units[0].evidence)).toBe(true);
  expect(source.text.includes(sanitized.units[0].evidence[0])).toBe(true);
  // Unit 1 evidence was repaired to a valid snippet from source
  expect(Array.isArray(sanitized.units[1].evidence)).toBe(true);
  expect(sanitized.units[1].evidence.length).toBeGreaterThan(0);
  expect(source.text.includes(sanitized.units[1].evidence[0])).toBe(true);
});
