import { supabase } from "./supabase";

export async function logQuestCompletion(userId: string, questId: string) {
  try {
    const { error } = await supabase
      .from('daily_quest_completions')
      .insert({ user_id: userId, quest_id: questId });
      
    if (error && error.code !== '23505') { // 23505 is unique violation (already completed today)
      console.error("[quests] failed to log quest:", error);
    }
  } catch (e) {
    console.error("[quests] catch block:", e);
  }
}
