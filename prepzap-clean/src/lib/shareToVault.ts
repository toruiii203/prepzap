/**
 * Standard utility to publish study content from any tool into the public Study Vault.
 */
export interface ShareToVaultOptions {
  title: string;
  topic?: string;
  subject?: string;
  summary: string;
  content: string;
  key_points?: string[];
  exam_trap?: string;
  tags?: string[];
  author?: string;
  isAiGenerated?: boolean;
}

export function shareToStudyVault(options: ShareToVaultOptions): { success: boolean; id: string } {
  try {
    const cleanTopic = options.topic || options.title.slice(0, 40);
    const id = `vault_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const dateStr = new Date().toISOString().split("T")[0];

    const note = {
      id,
      topic: cleanTopic,
      title: options.title,
      subject: options.subject || "General",
      author: options.author || "Community Contributor",
      date: dateStr,
      readTime: "3 min",
      likes: 1,
      downloads: 1,
      helpfulCount: 1,
      verifiedCount: 0,
      tags: options.tags || [cleanTopic.toLowerCase().replace(/[^a-z0-9]/g, "-"), "study-vault"],
      summary: options.summary || options.title,
      content: options.content || `# ${options.title}\n\n${options.summary || ""}`,
      key_points: options.key_points || [],
      exam_trap: options.exam_trap || "",
      isAiGenerated: options.isAiGenerated ?? true,
    };

    // Save to local campus notes storage
    const raw = localStorage.getItem("studenius_campus_notes_v3");
    const notes = raw ? JSON.parse(raw) : [];
    notes.unshift(note);
    localStorage.setItem("studenius_campus_notes_v3", JSON.stringify(notes));

    return { success: true, id };
  } catch (err) {
    console.error("[shareToStudyVault] Failed to save note:", err);
    return { success: false, id: "" };
  }
}
