const fs = require('fs');
let content = fs.readFileSync('src/pages/Arena.tsx', 'utf8');

content = content.replace(
  /await supabase\.from\("exam_rooms"\)\.delete\(\)\.eq\("id", roomId\);/g,
  'await supabase.from("room_presence").delete().eq("room_id", roomId); const { error } = await supabase.from("exam_rooms").delete().eq("id", roomId); if (error) throw error; setRooms(prev => prev.filter(r => r.id !== roomId));'
);

content = content.replace(
  /alert\("Failed to delete room."\);/g,
  'alert("Failed to delete room: " + (err.message || "Unknown error"));'
);

fs.writeFileSync('src/pages/Arena.tsx', content);
console.log("Done regex replace");
