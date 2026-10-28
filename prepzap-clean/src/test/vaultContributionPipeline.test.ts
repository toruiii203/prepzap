import { describe, it, expect, beforeEach } from "vitest";
import {
  filterEligibility,
  scrubAndVerifyOverlap,
  vaultContributionNoteSchema,
  isDuplicateNote,
  qualityGateCheck,
  getVaultConsent,
  setVaultConsent,
  isChatExcluded,
  setChatExcluded,
  calculateJaccardOverlap,
  type VaultContributionNote,
  type ChatMessage,
} from "@/lib/vaultContributionPipeline";
import type { CampusNote } from "@/hooks/useCommunity";

describe("Vault Contribution Pipeline", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("Stage A: Eligibility Filter", () => {
    it("rejects chats that have uploaded file attachments", () => {
      const messages: ChatMessage[] = [
        { sender: "user", text: "Explain how cellular respiration functions." },
        { sender: "bot", text: "Cellular respiration converts glucose into ATP energy through glycolysis, the Krebs cycle, and oxidative phosphorylation." },
      ];
      const result = filterEligibility(messages, true);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe("REJECT_FILE_ATTACHMENT");
    });

    it("rejects chats that look like graded assignments or exam answers", () => {
      const messages: ChatMessage[] = [
        { sender: "user", text: "Please do my homework for Question 4: A) 12 B) 14 C) 18" },
        { sender: "bot", text: "Option C is correct because the integral yields 18." },
      ];
      const result = filterEligibility(messages, false);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe("REJECT_ASSIGNMENT");
    });

    it("rejects chats containing personal small talk", () => {
      const messages: ChatMessage[] = [
        { sender: "user", text: "How are you doing today Rex? Do you love me?" },
        { sender: "bot", text: "I'm doing well! I'm ready to help you study whenever you are." },
      ];
      const result = filterEligibility(messages, false);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe("REJECT_PERSONAL_INFO");
    });

    it("rejects chats with low academic study value", () => {
      const messages: ChatMessage[] = [
        { sender: "user", text: "hi" },
        { sender: "bot", text: "hello" },
      ];
      const result = filterEligibility(messages, false);
      expect(result.eligible).toBe(false);
      expect(result.studyValueScore).toBeLessThan(0.65);
    });

    it("accepts genuine academic conceptual questions", () => {
      const messages: ChatMessage[] = [
        { sender: "user", text: "Can you explain the mechanism of action potentials in neurons and how sodium potassium pumps restore equilibrium?" },
        { sender: "bot", text: "Action potentials are electrical impulses that travel along axon membranes. Depolarization opens voltage-gated sodium channels, allowing Na+ to rush into the cell. Repolarization occurs as potassium channels open and K+ flows out. Finally, the sodium-potassium pump actively transports three Na+ ions out for every two K+ ions brought in, re-establishing resting membrane potential." },
      ];
      const result = filterEligibility(messages, false);
      expect(result.eligible).toBe(true);
      expect(result.studyValueScore).toBeGreaterThanOrEqual(0.65);
    });
  });

  describe("Stage C & D: Scrubbing & Overlap Verification", () => {
    const validSampleNote: VaultContributionNote = {
      title: "Action Potential Mechanism",
      subject: "Biology",
      summary: "Action potentials are rapid electrical depolarizations and repolarizations along neuronal cell membranes.",
      key_points: [
        "Voltage-gated sodium channels trigger rapid membrane depolarization.",
        "Potassium efflux restores negative resting potential during repolarization.",
        "The sodium-potassium pump maintains the long-term chemical gradient.",
      ],
      example: "In myelinated motor neurons, saltatory conduction jumps across Nodes of Ranvier to accelerate velocity.",
      memory_hook: "Sodium rushes inside like eager concertgoers; potassium exits like crowd leaving after the show.",
      exam_trap: "Never mix up absolute refractory periods with relative refractory periods.",
      difficulty: "intermediate",
    };

    it("scrubs emails, phone numbers, and course codes from rewritten notes", () => {
      const noteWithPii: VaultContributionNote = {
        ...validSampleNote,
        summary: "Contact prof.smith@university.edu or call (555) 123-4567 for course BIO-101 at https://canvas.edu.",
      };

      const result = scrubAndVerifyOverlap("Some unrelated raw chat", noteWithPii);
      expect(result.passed).toBe(true);
      expect(result.scrubbedNote.summary).not.toContain("prof.smith@university.edu");
      expect(result.scrubbedNote.summary).not.toContain("555");
      expect(result.scrubbedNote.summary).not.toContain("https://");
      expect(result.scrubbedNote.summary).not.toContain("BIO-101");
    });

    it("drops note if verbatim overlap with raw user chat exceeds threshold (> 25%)", () => {
      const copiedText = "Voltage-gated sodium channels trigger rapid membrane depolarization potassium efflux restores negative resting potential.";
      const rawUserChat = `Please explain: ${copiedText} I need this verbatim.`;

      const copiedNote: VaultContributionNote = {
        ...validSampleNote,
        summary: copiedText,
        key_points: [
          "Voltage-gated sodium channels trigger rapid membrane depolarization.",
          "Potassium efflux restores negative resting potential.",
          "Another third point here for length.",
        ],
      };

      const result = scrubAndVerifyOverlap(rawUserChat, copiedNote);
      expect(result.passed).toBe(false);
      expect(result.reason).toBe("DROP_HIGH_VERBATIM_OVERLAP");
    });

    it("validates notes using vaultContributionNoteSchema", () => {
      const valid = vaultContributionNoteSchema.safeParse(validSampleNote);
      expect(valid.success).toBe(true);

      const invalid = vaultContributionNoteSchema.safeParse({
        title: "Too short",
        // missing required fields
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe("Stage F: Deduplication", () => {
    const existingNotes: CampusNote[] = [
      {
        id: "existing-1",
        title: "Krebs Cycle Mechanism",
        subject: "Biology",
        subjectBadgeColor: "bg-white",
        author: "Community AI",
        authorAvatar: "",
        date: "Yesterday",
        readTime: "2 min",
        likes: 5,
        tags: ["Biology"],
        summary: "The citric acid cycle generates high-energy electron carriers in the mitochondrial matrix.",
        content: "...",
      },
    ];

    it("detects exact and high-similarity duplicate notes", () => {
      const newDuplicateNote: VaultContributionNote = {
        title: "Krebs Cycle Mechanism",
        subject: "Biology",
        summary: "The citric acid cycle generates high-energy electron carriers in the mitochondrial matrix.",
        key_points: [
          "Oxaloacetate binds with acetyl-CoA.",
          "Produces NADH and FADH2.",
          "Releases carbon dioxide as byproduct.",
        ],
        example: "Aerobic cellular respiration.",
        memory_hook: "Can I Keep Selling Substances For Money Officer.",
        exam_trap: "Oxygen is not directly used in the cycle itself.",
        difficulty: "intermediate",
      };

      const check = isDuplicateNote(newDuplicateNote, existingNotes);
      expect(check.isDuplicate).toBe(true);
      expect(check.matchedNoteId).toBe("existing-1");
    });

    it("permits unique notes on different topics", () => {
      const uniqueNote: VaultContributionNote = {
        title: "Keynesian Liquidity Trap",
        subject: "Economics",
        summary: "When interest rates reach near zero, monetary policy becomes ineffective as consumers hoard cash.",
        key_points: [
          "Money demand becomes infinitely elastic.",
          "Monetary stimulus fails to stimulate aggregate demand.",
          "Fiscal policy is required to jumpstart spending.",
        ],
        example: "Japan's economic stagnation in the 1990s.",
        memory_hook: "Pushing on a string: you can pull it back, but you cannot push it forward.",
        exam_trap: "Do not confuse nominal zero-bound with real negative rates.",
        difficulty: "advanced",
      };

      const check = isDuplicateNote(uniqueNote, existingNotes);
      expect(check.isDuplicate).toBe(false);
    });
  });

  describe("Stage E: Quality Gate & Consent Controls", () => {
    it("manages user consent defaults and persistence", () => {
      // Default must be strictly false (opt-in only)
      const initial = getVaultConsent("user_123");
      expect(initial.enabled).toBe(false);
      expect(initial.version).toBe("v1.0");

      // Opt in
      const updated = setVaultConsent(true, "user_123");
      expect(updated.enabled).toBe(true);
      expect(getVaultConsent("user_123").enabled).toBe(true);

      // Opt out
      setVaultConsent(false, "user_123");
      expect(getVaultConsent("user_123").enabled).toBe(false);
    });

    it("respects per-chat exclusion toggle", () => {
      expect(isChatExcluded("chat_999")).toBe(false);
      setChatExcluded("chat_999", true);
      expect(isChatExcluded("chat_999")).toBe(true);
      setChatExcluded("chat_999", false);
      expect(isChatExcluded("chat_999")).toBe(false);
    });
  });
});
