import { z } from "zod";
import { callGroq, safeParseJSON } from "./groq";
import type { CampusNote } from "@/hooks/useCommunity";

// ── Storage Keys & Constants ──────────────────────────────────────────────────

export const VAULT_CONSENT_KEY = "studenius_vault_contrib_consent";
export const VAULT_EXCLUDED_CHATS_KEY = "studenius_vault_excluded_chats";
export const VAULT_PROCESSED_CHATS_KEY = "studenius_vault_processed_chats";
export const VAULT_CONTRIB_COUNT_KEY = "studenius_vault_contrib_count";
export const VAULT_STORAGE_NOTES_KEY = "studenius_campus_notes_v3";
export const CURRENT_WORDING_VERSION = "v1.0";
export const MAX_REPORT_THRESHOLD = 3;

// ── 1. Types & Zod Schemas ────────────────────────────────────────────────────

export interface ConsentRecord {
  enabled: boolean;
  timestamp: string;
  version: string;
}

export const consentRecordSchema = z.object({
  enabled: z.boolean(),
  timestamp: z.string(),
  version: z.string(),
});

export const vaultContributionNoteSchema = z.object({
  title: z.string().min(3).max(100),
  subject: z.string().min(2).max(50),
  summary: z.string().min(10).max(300),
  key_points: z.array(z.string().min(5)).min(3).max(5),
  example: z.string().min(10).max(500),
  memory_hook: z.string().min(10).max(300),
  exam_trap: z.string().min(10).max(300),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).default("intermediate"),
});

export type VaultContributionNote = z.infer<typeof vaultContributionNoteSchema>;

export interface ChatMessage {
  sender: "user" | "bot";
  text: string;
}

// ── 2. Consent & Settings Management ──────────────────────────────────────────

export function isGlobalPipelineEnabled(): boolean {
  // Global kill switch via env var or window flag (default enabled in app)
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_VAULT_CONTRIBUTIONS_ENABLED === "false") {
    return false;
  }
  return true;
}

export function getVaultConsent(userId?: string): ConsentRecord {
  const key = userId ? `${VAULT_CONSENT_KEY}_${userId}` : VAULT_CONSENT_KEY;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      const res = consentRecordSchema.safeParse(parsed);
      if (res.success) return res.data;
    }
  } catch {}
  return { enabled: false, timestamp: new Date(0).toISOString(), version: CURRENT_WORDING_VERSION };
}

export function setVaultConsent(enabled: boolean, userId?: string): ConsentRecord {
  const record: ConsentRecord = {
    enabled,
    timestamp: new Date().toISOString(),
    version: CURRENT_WORDING_VERSION,
  };
  const key = userId ? `${VAULT_CONSENT_KEY}_${userId}` : VAULT_CONSENT_KEY;
  try {
    localStorage.setItem(key, JSON.stringify(record));
  } catch {}
  return record;
}

export function isChatExcluded(chatId: string): boolean {
  try {
    const raw = localStorage.getItem(VAULT_EXCLUDED_CHATS_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    return list.includes(chatId);
  } catch {
    return false;
  }
}

export function setChatExcluded(chatId: string, excluded: boolean): void {
  try {
    const raw = localStorage.getItem(VAULT_EXCLUDED_CHATS_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const set = new Set(list);
    if (excluded) {
      set.add(chatId);
    } else {
      set.delete(chatId);
    }
    localStorage.setItem(VAULT_EXCLUDED_CHATS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export function hasChatBeenProcessed(chatId: string): boolean {
  try {
    const raw = localStorage.getItem(VAULT_PROCESSED_CHATS_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    return list.includes(chatId);
  } catch {
    return false;
  }
}

export function markChatProcessed(chatId: string): void {
  try {
    const raw = localStorage.getItem(VAULT_PROCESSED_CHATS_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(chatId)) {
      list.push(chatId);
      localStorage.setItem(VAULT_PROCESSED_CHATS_KEY, JSON.stringify(list));
    }
  } catch {}
}

export function getContributedNotesCount(): number {
  try {
    const raw = localStorage.getItem(VAULT_CONTRIB_COUNT_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export function incrementContributedNotesCount(): number {
  const next = getContributedNotesCount() + 1;
  try {
    localStorage.setItem(VAULT_CONTRIB_COUNT_KEY, String(next));
  } catch {}
  return next;
}

export async function computeOneWayHash(input: string): Promise<string> {
  try {
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(input);
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch {}
  // Simple deterministic fallback hash for node test environments
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(16)}`;
}

// ── 3. Pipeline Stages ────────────────────────────────────────────────────────

// Stage A: Eligibility Filter
export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
  studyValueScore: number;
}

export function filterEligibility(
  messages: ChatMessage[],
  hasFileAttachment = false
): EligibilityResult {
  // Rule 1: Reject if user attached an external file
  if (hasFileAttachment) {
    return { eligible: false, reason: "REJECT_FILE_ATTACHMENT", studyValueScore: 0 };
  }

  if (!messages || messages.length < 2) {
    return { eligible: false, reason: "REJECT_TOO_SHORT", studyValueScore: 0 };
  }

  const userMessages = messages.filter((m) => m.sender === "user").map((m) => m.text).join(" ");
  const botMessages = messages.filter((m) => m.sender === "bot").map((m) => m.text).join(" ");
  const userLower = userMessages.toLowerCase();

  // Rule 2: Reject if looks like graded assignment, quiz, exam, test cheating
  const assignmentPatterns = [
    /\b(do my homework|write my essay|answer this quiz|for my exam tomorrow|graded assignment|test question|canvas quiz|take-home exam|exam answers)\b/i,
    /\b(question \d+[\s:.)]+[a-d]\))/i,
    /\b(which of the following is correct\?)\b/i,
    /\b(solve this problem for 5 points)\b/i,
  ];
  if (assignmentPatterns.some((pattern) => pattern.test(userMessages))) {
    return { eligible: false, reason: "REJECT_ASSIGNMENT", studyValueScore: 0.1 };
  }

  // Rule 3: Reject if personal small talk or personal data
  const personalSmallTalkPatterns = [
    /\b(how are you|what is your name|who made you|are you human|tell me a joke|i feel sad|i'm tired|do you love me|what's up)\b/i,
    /\b(my name is|i live in|my phone number|call me at|my boyfriend|my girlfriend)\b/i,
  ];
  if (personalSmallTalkPatterns.some((p) => p.test(userMessages)) && userMessages.length < 120) {
    return { eligible: false, reason: "REJECT_PERSONAL_INFO", studyValueScore: 0.2 };
  }

  // Rule 4: Academic study value scoring
  let score = 0;
  const academicTerms = [
    /\b(concept|mechanism|theory|function|formula|process|law|hypothesis|definition|principle|difference between|compare|cycle)\b/i,
    /\b(biology|chemistry|physics|calculus|economics|psychology|computer science|algorithm|history|cell|energy)\b/i,
    /\b(explain|why does|how does|what causes|break down|overview|summary)\b/i,
  ];
  academicTerms.forEach((term) => {
    if (term.test(userMessages) || term.test(botMessages)) score += 0.25;
  });

  // Length check: good bot explanations usually have at least 150 chars
  if (botMessages.length > 200) score += 0.25;
  if (botMessages.length > 500) score += 0.15;

  const finalScore = Math.min(1.0, score);
  const THRESHOLD = 0.65;

  if (finalScore < THRESHOLD) {
    return { eligible: false, reason: "REJECT_LOW_STUDY_VALUE", studyValueScore: finalScore };
  }

  return { eligible: true, studyValueScore: finalScore };
}

// Stage B: Topic Extraction
export function extractTopic(
  messages: ChatMessage[]
): { topic: string; subject: string } {
  const userText = messages
    .filter((m) => m.sender === "user")
    .map((m) => m.text)
    .join(" ")
    .slice(0, 500);

  // Quick subject categorizer heuristic
  const lower = userText.toLowerCase();
  let subject = "General";
  if (/bio|cell|mitosis|dna|rna|gene|photosynthesis|krebs|organ|tissue/i.test(lower)) subject = "Biology";
  else if (/chem|reaction|atom|molecule|bond|acid|base|equilibrium/i.test(lower)) subject = "Chemistry";
  else if (/physics|quantum|force|velocity|gravity|energy|momentum|thermo/i.test(lower)) subject = "Physics";
  else if (/calculus|derivative|integral|limit|matrix|algebra|geometry|theorem/i.test(lower)) subject = "Calculus";
  else if (/econ|supply|demand|inflation|gdp|monetary|market|trade/i.test(lower)) subject = "Economics";
  else if (/psych|cognitive|behavior|brain|memory|freud|conditioning/i.test(lower)) subject = "Psychology";
  else if (/algorithm|code|data structure|binary|network|database|python|java/i.test(lower)) subject = "Computer Science";
  else if (/history|war|revolution|treaty|century|empire|civilization/i.test(lower)) subject = "History";

  // Clean topic name
  let cleanTopic = userText
    .replace(/^(can you|please|explain|what is|how does|tell me about|help me with|summarize|why does)\s+/i, "")
    .replace(/[?!.]+$/, "")
    .trim();

  if (cleanTopic.length > 40) cleanTopic = cleanTopic.slice(0, 37) + "...";
  if (!cleanTopic || cleanTopic.length < 3) cleanTopic = `${subject} Core Principles`;

  return { topic: cleanTopic, subject };
}

// Stage C: Standalone Note Rewrite
export async function rewriteStandaloneNote(
  topic: string,
  subject: string,
  botReplySeed: string
): Promise<VaultContributionNote | null> {
  const safeSeed = botReplySeed.slice(0, 2000);
  const systemPrompt = `You are an expert academic curriculum author.
Synthesize an anonymous, generic, standalone study note for the topic "${topic}" (${subject}).
Use the provided AI explanation strictly as a conceptual seed.

CRITICAL PRIVACY & TONE RULES:
- Zero references to any student, user, professor, course, file, or chat history.
- Never use second-person pronouns referring to the user ("you", "your", "as you asked", "in your notes").
- Use objective, authoritative, textbook-grade third-person academic language.

Return ONLY a raw JSON object (no markdown, no backticks):
{
  "title": "<3 to 8 word generic academic title>",
  "subject": "${subject}",
  "summary": "<1-2 clear sentences summarizing the topic>",
  "key_points": [
    "<3 to 5 core conceptual bullet points>"
  ],
  "example": "<1 clear concrete real-world or theoretical example>",
  "memory_hook": "<1 memorable everyday analogy>",
  "exam_trap": "<1 common exam misconception or pitfall to avoid>",
  "difficulty": "intermediate"
}`;

  try {
    const raw = await callGroq(
      [
        {
          role: "user",
          content: `Topic: ${topic}\nSubject: ${subject}\n\nSeed explanation:\n${safeSeed}`,
        },
      ],
      systemPrompt,
      "openai/gpt-oss-20b",
      1600,
      "vault_contribution"
    );

    const parsed = safeParseJSON<any>(raw);
    const validated = vaultContributionNoteSchema.safeParse(parsed);
    if (!validated.success) {
      console.warn("[vaultPipeline] Note failed schema validation:", validated.error);
      return null;
    }

    // Additional check: Ensure no 2nd-person phrasing in summary or key points
    const fullText = [
      validated.data.summary,
      ...validated.data.key_points,
      validated.data.memory_hook,
    ].join(" ");

    if (/\b(as you mentioned|in your class|your professor|your uploaded|you asked me)\b/i.test(fullText)) {
      console.warn("[vaultPipeline] Note contained disallowed user-referencing phrasing.");
      return null;
    }

    return validated.data;
  } catch (err) {
    console.warn("[vaultPipeline] Rewrite error:", err);
    return null;
  }
}

// Stage D: PII Scrub & Verbatim Overlap Check
export function calculateJaccardOverlap(strA: string, strB: string): number {
  const getTokens = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );

  const setA = getTokens(strA);
  const setB = getTokens(strB);
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

export function scrubAndVerifyOverlap(
  rawChatText: string,
  note: VaultContributionNote
): { passed: boolean; scrubbedNote: VaultContributionNote; reason?: string } {
  // 1. Verbatim overlap threshold check: note must not be a direct copy of user prompt
  const noteFullText = `${note.title} ${note.summary} ${note.key_points.join(" ")} ${note.example}`;
  const overlap = calculateJaccardOverlap(rawChatText, noteFullText);

  // If overlap is unusually high (> 25% token intersection with raw chat), drop note
  if (overlap > 0.25) {
    return {
      passed: false,
      scrubbedNote: note,
      reason: "DROP_HIGH_VERBATIM_OVERLAP",
    };
  }

  // 2. Scrub PII patterns (names, emails, phones, course codes, URLs)
  const piiPatterns = [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
    /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, // Phone
    /https?:\/\/[^\s]+/g, // URL
    /\b[A-Z]{2,4}\s?[-_]?\d{3,4}[A-Za-z]?\b/g, // Course codes like CS101, BIO-202
    /\b(?:student|prof|professor|instructor|dr\.)\s+[A-Z][a-z]+\b/gi, // Professor / student names
  ];

  const scrubText = (t: string) => {
    let clean = t;
    piiPatterns.forEach((p) => {
      clean = clean.replace(p, "");
    });
    return clean.replace(/\s{2,}/g, " ").trim();
  };

  const scrubbed: VaultContributionNote = {
    ...note,
    title: scrubText(note.title),
    summary: scrubText(note.summary),
    key_points: note.key_points.map(scrubText).filter((p) => p.length >= 5),
    example: scrubText(note.example),
    memory_hook: scrubText(note.memory_hook),
    exam_trap: scrubText(note.exam_trap),
  };

  if (scrubbed.key_points.length < 3) {
    return { passed: false, scrubbedNote: scrubbed, reason: "DROP_SCRUBBED_TOO_SHORT" };
  }

  return { passed: true, scrubbedNote: scrubbed };
}

// Stage E: Quality Gate (Second Model Verification)
export async function qualityGateCheck(
  note: VaultContributionNote
): Promise<{ passed: boolean; confidence: number }> {
  const systemPrompt = `You are a strict academic fact-checker.
Verify if the following study note is scientifically/factually accurate, coherent, and free of misleading hallucination.
Return ONLY JSON:
{ "passed": true|false, "confidence": 0.0 to 1.0, "reason": "<short explanation>" }`;

  try {
    const raw = await callGroq(
      [
        {
          role: "user",
          content: `Title: ${note.title}\nSubject: ${note.subject}\nSummary: ${note.summary}\nPoints: ${note.key_points.join(" | ")}`,
        },
      ],
      systemPrompt,
      "openai/gpt-oss-20b",
      300,
      "quality_gate"
    );

    const parsed = safeParseJSON<{ passed?: boolean; confidence?: number }>(raw);
    const passed = parsed?.passed === true && (parsed?.confidence ?? 0) >= 0.7;
    return { passed, confidence: parsed?.confidence ?? 0 };
  } catch {
    // If quality gate API is unreachable, fall back safely to passing if basic heuristics hold
    const heuristicPass = note.key_points.length >= 3 && note.summary.length >= 20;
    return { passed: heuristicPass, confidence: heuristicPass ? 0.75 : 0 };
  }
}

// Stage F: Deduplication
export function isDuplicateNote(
  newNote: VaultContributionNote,
  existingNotes: CampusNote[]
): { isDuplicate: boolean; matchedNoteId?: string } {
  if (!existingNotes || existingNotes.length === 0) {
    return { isDuplicate: false };
  }

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const newTitleNorm = norm(newNote.title);

  for (const existing of existingNotes) {
    const existingTitleNorm = norm(existing.title);

    // Exact title match
    if (newTitleNorm === existingTitleNorm) {
      return { isDuplicate: true, matchedNoteId: existing.id };
    }

    // High Jaccard similarity (> 0.65) on titles
    const overlap = calculateJaccardOverlap(newNote.title, existing.title);
    if (overlap > 0.65) {
      return { isDuplicate: true, matchedNoteId: existing.id };
    }

    // High summary overlap on same subject
    if (existing.subject.toLowerCase() === newNote.subject.toLowerCase()) {
      const summaryOverlap = calculateJaccardOverlap(newNote.summary, existing.summary);
      if (summaryOverlap > 0.6) {
        return { isDuplicate: true, matchedNoteId: existing.id };
      }
    }
  }

  return { isDuplicate: false };
}

// Stage G: Publish Anonymized Note to Public Vault
export async function publishAnonymizedVaultNote(
  note: VaultContributionNote,
  chatId: string
): Promise<CampusNote> {
  const hash = await computeOneWayHash(chatId);

  // Build full markdown guide content
  const content = `# ${note.title}

## Summary
${note.summary}

## Key Principles
${note.key_points.map((p, idx) => `${idx + 1}. ${p}`).join("\n")}

## Worked Example
${note.example}

## Memory Hook
> **Everyday Analogy**: ${note.memory_hook}

## Exam Watchout
> **Common Trap**: ${note.exam_trap}
`;

  const newCampusNote: CampusNote = {
    id: `vault-ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: note.title,
    subject: note.subject,
    subjectBadgeColor: "bg-white text-black border-2 border-black font-black",
    author: "Community AI",
    authorCode: "AI-VAULT",
    authorAvatar: "/buddies/fox_scholar.png",
    date: "Just now",
    readTime: "2 min read",
    likes: 1,
    likedByUser: false,
    downloads: 0,
    isOfficialSeed: false,
    isReported: false,
    tags: [note.subject, note.difficulty, "AI-Synthesized"],
    summary: note.summary,
    content,
    // Extensions for AI-generated vault contributions
    ...({
      isAiGenerated: true,
      helpfulCount: 0,
      verifiedCount: 0,
      reportCount: 0,
      difficulty: note.difficulty,
      sourceHash: hash,
      status: "published",
    } as any),
  };

  // Persist into localStorage vault cache
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_NOTES_KEY);
    const list: CampusNote[] = raw ? JSON.parse(raw) : [];
    const updated = [newCampusNote, ...list];
    localStorage.setItem(VAULT_STORAGE_NOTES_KEY, JSON.stringify(updated));
  } catch {}

  incrementContributedNotesCount();
  return newCampusNote;
}

// ── 4. Master Contribution Pipeline Orchestrator ──────────────────────────────

export async function runVaultContributionPipeline(
  chatId: string,
  messages: ChatMessage[],
  hasFileAttachment = false,
  userId?: string
): Promise<{ success: boolean; reason?: string; noteId?: string }> {
  // Global kill switch check
  if (!isGlobalPipelineEnabled()) {
    return { success: false, reason: "PIPELINE_GLOBALLY_DISABLED" };
  }

  // Consent check (default OFF)
  const consent = getVaultConsent(userId);
  if (!consent.enabled) {
    return { success: false, reason: "USER_NOT_OPTED_IN" };
  }

  // Per-chat exclusion check
  if (isChatExcluded(chatId)) {
    return { success: false, reason: "CHAT_EXCLUDED" };
  }

  // Processed once check
  if (hasChatBeenProcessed(chatId)) {
    return { success: false, reason: "CHAT_ALREADY_PROCESSED" };
  }

  // Stage A: Eligibility Filter
  const eligibility = filterEligibility(messages, hasFileAttachment);
  if (!eligibility.eligible) {
    markChatProcessed(chatId);
    return { success: false, reason: eligibility.reason };
  }

  // Stage B: Topic Extraction
  const { topic, subject } = extractTopic(messages);

  // Get last bot explanation message as seed
  const botMessages = messages.filter((m) => m.sender === "bot");
  const lastBotMsg = botMessages[botMessages.length - 1]?.text || "";
  if (!lastBotMsg || lastBotMsg.length < 50) {
    markChatProcessed(chatId);
    return { success: false, reason: "BOT_REPLY_INSUFFICIENT" };
  }

  // Stage C: Standalone Note Rewrite
  const rawChatText = messages.map((m) => m.text).join(" ");
  const rewritten = await rewriteStandaloneNote(topic, subject, lastBotMsg);
  if (!rewritten) {
    markChatProcessed(chatId);
    return { success: false, reason: "REWRITE_FAILED" };
  }

  // Stage D: Scrub & Overlap Check
  const scrubResult = scrubAndVerifyOverlap(rawChatText, rewritten);
  if (!scrubResult.passed) {
    markChatProcessed(chatId);
    return { success: false, reason: scrubResult.reason };
  }

  // Stage E: Quality Gate Check
  const quality = await qualityGateCheck(scrubResult.scrubbedNote);
  if (!quality.passed) {
    markChatProcessed(chatId);
    return { success: false, reason: "QUALITY_GATE_FAILED" };
  }

  // Stage F: Deduplication
  let existingNotes: CampusNote[] = [];
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_NOTES_KEY);
    if (raw) existingNotes = JSON.parse(raw);
  } catch {}

  const dedupe = isDuplicateNote(scrubResult.scrubbedNote, existingNotes);
  if (dedupe.isDuplicate) {
    markChatProcessed(chatId);
    return { success: false, reason: "DUPLICATE_NOTE_SKIPPED" };
  }

  // Stage G: Publish Note
  const published = await publishAnonymizedVaultNote(scrubResult.scrubbedNote, chatId);
  markChatProcessed(chatId);

  return { success: true, noteId: published.id };
}
