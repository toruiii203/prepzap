const fs = require('fs');

let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const startStr = 'const { data } = await supabase';
const endStr = 'combinedData.sort((a, b)';

const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
  const replaceFetch = `const [sessRes, actRes] = await Promise.all([
          supabase.from("study_sessions").select("*").eq("user_id", user?.id).order("created_at", { ascending: false }),
          supabase.from("study_activity").select("id, activity_type, tool, created_at, metadata").eq("user_id", user?.id).order("created_at", { ascending: false })
        ]);
        
        if (sessRes.data && sessRes.data.length > 0) {
          sessRes.data.forEach(dbSess => {
            if (!combinedData.find(s => s.id === dbSess.id)) {
              combinedData.push(dbSess);
            }
          });
        }
        
        if (actRes.data && actRes.data.length > 0) {
          actRes.data.forEach(act => {
            if (!combinedData.find(s => s.id === act.id)) {
              const time_seconds = act.metadata?.time_seconds || 0;
              combinedData.push({
                id: act.id,
                title: act.tool || act.activity_type || "Arcade Activity",
                duration_minutes: Math.round(time_seconds / 60),
                created_at: act.created_at
              });
            }
          });
        }
        
        `;

  content = content.substring(0, startIdx) + replaceFetch + content.substring(endIdx);
  fs.writeFileSync('src/pages/Dashboard.tsx', content, 'utf8');
} else {
  console.log("NOT FOUND");
}
