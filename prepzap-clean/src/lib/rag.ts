import { supabase } from "@/lib/supabase";
import { chunkText } from "./chunking";

export async function processDocumentForRAG(fileId: string, fullText: string) {
  const chunks = chunkText(fullText, 1000); // ~200 words per chunk

  console.log(`[RAG] Processing ${chunks.length} chunks for file ${fileId}`);
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      const { error } = await supabase.functions.invoke("embed-document", {
        body: {
          action: "embed_document",
          text: chunk,
          source_id: fileId,
          chunk_index: i
        }
      });
      if (error) {
        console.error(`[RAG] Failed to embed chunk ${i}:`, error);
      }
    } catch (err) {
      console.error(`[RAG] Exception embedding chunk ${i}:`, err);
    }
  }
}

export async function getRelevantContext(query: string, sourceIds: string[]): Promise<string> {
  if (!sourceIds.length) return "";

  try {
    // 1. Embed the query
    const { data: embedData, error: embedError } = await supabase.functions.invoke("embed-document", {
      body: {
        action: "embed_query",
        text: query
      }
    });

    if (embedError || !embedData?.embedding) {
      console.error("[RAG] Query embed failed:", embedError);
      return "";
    }

    // 2. Search Postgres
    const { data: matches, error: matchError } = await supabase.rpc("match_document_chunks", {
      query_embedding: embedData.embedding,
      match_threshold: 0.7, // Only reasonably good matches
      match_count: 5,       // Top 5 chunks (approx 5000 chars total)
      p_user_id: (await supabase.auth.getUser()).data.user?.id,
      p_source_ids: sourceIds
    });

    if (matchError || !matches) {
      console.error("[RAG] Match failed:", matchError);
      return "";
    }

    // 3. Construct context
    if (matches.length === 0) return "";
    
    return matches.map((m: any) => `=== RELEVANT EXCERPT (Source ID: ${m.source_id}) ===\n${m.content}\n`).join("\n");
  } catch (err) {
    console.error("[RAG] Exception getting context:", err);
    return "";
  }
}
