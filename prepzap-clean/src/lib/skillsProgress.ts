export interface StudyActivity {
  id: string;
  user_id: string;
  tool: string;
  source_id: string | null;
  score: number;
  created_at: string;
}

export interface UserSkill {
  id: string;
  user_id: string;
  source_id: string;
  label: string;
  created_at: string;
}

/**
 * Calculates a recency-weighted progress score from study activities.
 * More recent activities have a higher weight in the final score.
 */
export function calculateSkillProgress(activities: StudyActivity[]): number {
  if (!activities || activities.length === 0) return 0;
  
  // Sort newest first
  const sorted = [...activities].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  
  let totalWeight = 0;
  let weightedScore = 0;
  let weight = 1;
  const decay = 0.75; // Each older session counts for 75% of the next newer one
  
  for (const act of sorted) {
    weightedScore += act.score * weight;
    totalWeight += weight;
    weight *= decay;
  }
  
  return Math.round(weightedScore / totalWeight);
}
