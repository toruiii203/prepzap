import { supabase } from "@/lib/supabase";

export type SharedItemType = "guide" | "flashcards" | "quiz";

export interface SharedMaterial {
  share_slug: string;
  item_type: SharedItemType;
  title: string;
  subject: string;
  creator_id?: string;
  creator_name: string;
  creator_code?: string;
  payload: any;
  is_public?: boolean;
  view_count?: number;
  clone_count?: number;
  created_at?: string;
}

function generateRandomSlug(): string {
  // 9-character unguessable alphanumeric slug e.g. "k8f-2mz-9p"
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const r = () => chars[Math.floor(Math.random() * chars.length)];
  return `${r()}${r()}${r()}-${r()}${r()}${r()}-${r()}${r()}${r()}`;
}

export async function createShareLink(
  itemType: SharedItemType,
  title: string,
  subject: string,
  payload: any,
  creator?: { id?: string; name: string; code?: string }
): Promise<{ slug: string; shareUrl: string }> {
  const slug = generateRandomSlug();
  const creatorName = creator?.name || "Studenius Scholar";
  const creatorCode = creator?.code || "";

  const record: SharedMaterial = {
    share_slug: slug,
    item_type: itemType,
    title,
    subject: subject || "General Studies",
    creator_id: creator?.id,
    creator_name: creatorName,
    creator_code: creatorCode,
    payload,
    is_public: true,
    view_count: 0,
    clone_count: 0,
    created_at: new Date().toISOString()
  };

  // Local storage fallback
  try {
    localStorage.setItem(`pz_shared_${slug}`, JSON.stringify(record));
    const allShared = JSON.parse(localStorage.getItem("pz_my_shares") || "[]");
    allShared.unshift({ slug, itemType, title, createdAt: record.created_at });
    localStorage.setItem("pz_my_shares", JSON.stringify(allShared.slice(0, 30)));
  } catch {}

  // Sync to Supabase
  try {
    await supabase.from("shared_materials").insert({
      share_slug: slug,
      item_type: itemType,
      title,
      subject: record.subject,
      creator_id: creator?.id || null,
      creator_name: creatorName,
      creator_code: creatorCode || null,
      payload,
      is_public: true
    });
  } catch (err) {
    console.warn("Supabase share record creation skipped or failed:", err);
  }

  const shareUrl = `${window.location.origin}/share/${itemType}/${slug}`;
  return { slug, shareUrl };
}

export async function getSharedMaterial(slug: string): Promise<SharedMaterial | null> {
  // 1. Try local storage first
  try {
    const raw = localStorage.getItem(`pz_shared_${slug}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}

  // 2. Query Supabase
  try {
    const { data, error } = await supabase
      .from("shared_materials")
      .select("*")
      .eq("share_slug", slug)
      .eq("is_reported", false)
      .maybeSingle();

    if (!error && data) {
      // Increment view count in background
      try {
        await supabase
          .from("shared_materials")
          .update({ view_count: (data.view_count || 0) + 1 })
          .eq("share_slug", slug);
      } catch {}

      return data as SharedMaterial;
    }
  } catch (err) {
    console.warn("Error fetching shared material from cloud:", err);
  }

  return null;
}

export async function cloneSharedMaterial(
  material: SharedMaterial
): Promise<{ success: boolean; message: string; targetUrl: string }> {
  try {
    if (material.item_type === "guide") {
      // Clone into Campus Notes / Local Notes
      const notesRaw = localStorage.getItem("pz_local_notes") || "[]";
      const notes = JSON.parse(notesRaw);
      const newNote = {
        id: "cloned_" + Date.now(),
        title: `${material.title} (Cloned)`,
        subject: material.subject,
        content: material.payload?.content || material.payload || "",
        tags: material.payload?.tags || ["cloned"],
        created_at: new Date().toISOString()
      };
      notes.unshift(newNote);
      localStorage.setItem("pz_local_notes", JSON.stringify(notes));

      // Increment cloud clone count
      try {
        await supabase
          .from("shared_materials")
          .update({ clone_count: (material.clone_count || 0) + 1 })
          .eq("share_slug", material.share_slug);
      } catch {}

      return {
        success: true,
        message: "Study guide cloned into your Notes!",
        targetUrl: "/notes"
      };
    }

    if (material.item_type === "flashcards") {
      // Clone into Dexie flashcards DB
      const { db } = await import("@/lib/db");
      const deckId = "deck_" + Date.now();
      await db.decks.add({
        id: deckId,
        title: `${material.title} (Cloned)`,
        createdAt: Date.now()
      });

      const cards = Array.isArray(material.payload?.cards) ? material.payload.cards : (Array.isArray(material.payload) ? material.payload : []);
      for (const card of cards) {
        await db.cards.add({
          id: "card_" + Math.random().toString(36).slice(2, 9),
          deckId,
          front: card.front || card.question || "",
          back: card.back || card.answer || "",
          explanation: card.explanation || "",
          interval: 1,
          repetitions: 0,
          easeFactor: 2.5,
          nextReviewDate: Date.now()
        });
      }

      return {
        success: true,
        message: `Flashcard deck (${cards.length} cards) saved to your collection!`,
        targetUrl: "/flashcards"
      };
    }

    if (material.item_type === "quiz") {
      // Clone into practice quiz draft
      localStorage.setItem("qs_practice_export", JSON.stringify(material.payload));
      return {
        success: true,
        message: "Practice quiz loaded into Practice Hub!",
        targetUrl: "/practice"
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to clone material.",
      targetUrl: "/"
    };
  }

  return {
    success: false,
    message: "Unknown material type.",
    targetUrl: "/"
  };
}
