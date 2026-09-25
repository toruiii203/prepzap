const fs = require('fs');

let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// Replace the single study_sessions fetch with a dual fetch
const searchFetch = `        const { data } = await supabase
          .from("study_sessions")
          .select("*")
          .eq("user_id", user?.id)
          .order("created_at", { ascending: false });
          
        if (data && data.length > 0) {
          // Merge without duplicates (using titles and dates)
          data.forEach(dbSess => {
            if (!combinedData.find(s => s.id === dbSess.id)) {
              combinedData.push(dbSess);
            }
          });
        }`;

const replaceFetch = `        const [sessRes, actRes] = await Promise.all([
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
        }`;

content = content.replace(searchFetch, replaceFetch);

fs.writeFileSync('src/pages/Dashboard.tsx', content, 'utf8');
