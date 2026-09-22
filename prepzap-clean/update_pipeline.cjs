const fs = require('fs');
let content = fs.readFileSync('src/lib/arcadePipeline.ts', 'utf8');

// Export FALLBACKS
content = content.replace(
  'const FALLBACKS: Record<string, ArcadeContentMap> = {',
  'export const FALLBACKS: Record<string, ArcadeContentMap> = {'
);

// Update generateGameContent signature
content = content.replace(
  'export async function generateGameContent<T extends ArcadeGameType>(\n  sourceText: string,\n  sourceId: string,\n  gameType: T\n): Promise<ArcadeContentMap[T]> {',
  'export async function generateGameContent<T extends ArcadeGameType>(\n  sourceText: string,\n  sourceId: string,\n  gameType: T,\n  userId: string\n): Promise<ArcadeContentMap[T]> {'
);

// Update supabase .eq cache check to include user_id
content = content.replace(
  '.eq("game_type", gameType)\n      .single();',
  '.eq("game_type", gameType)\n      .eq("user_id", userId)\n      .single();'
);

// Update supabase insert to include user_id
content = content.replace(
  'source_id: sourceId,\n            game_type: gameType,\n            content: parsed',
  'user_id: userId,\n            source_id: sourceId,\n            game_type: gameType,\n            content: parsed'
);

fs.writeFileSync('src/lib/arcadePipeline.ts', content, 'utf8');
