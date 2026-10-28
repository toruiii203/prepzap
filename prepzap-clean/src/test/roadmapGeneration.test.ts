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
