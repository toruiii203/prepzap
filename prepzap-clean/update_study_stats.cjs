const fs = require('fs');

let content = fs.readFileSync('src/hooks/useStudyStats.ts', 'utf8');

const search = `      const fetchPromise = supabase
        .from("study_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
        
      const timeoutPromise = new Promise<{ data: any, error: any }>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 8000)
      );

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

      if (!error && data) {
        setSessions(data);
        calculateStats(data);
        localStorage.setItem("pz_study_sessions", JSON.stringify(data));
      }`;

const replace = `      const fetchSessionsPromise = supabase.from("study_sessions").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      const fetchActivityPromise = supabase.from("study_activity").select("id, activity_type, tool, created_at, metadata").eq("user_id", user.id).order("created_at", { ascending: false });
      
      const timeoutPromise = new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000));

      const [sessRes, actRes] = await Promise.race([
        Promise.all([fetchSessionsPromise, fetchActivityPromise]),
        timeoutPromise
      ]) as any;

      if (sessRes && actRes) {
        let combinedData: any[] = [];
        if (sessRes.data) combinedData.push(...sessRes.data);
        if (actRes.data) {
          actRes.data.forEach((act: any) => {
            const time_seconds = act.metadata?.time_seconds || 0;
            combinedData.push({
              id: act.id,
              title: act.tool || act.activity_type || "Arcade Activity",
              duration_minutes: Math.round(time_seconds / 60),
              created_at: act.created_at
            });
          });
        }
        combinedData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setSessions(combinedData);
        calculateStats(combinedData);
        localStorage.setItem("pz_study_sessions", JSON.stringify(combinedData));
      }`;

content = content.replace(search, replace);

// Also fix calculateStats bug where they used curr.duration_minutes without fallback
content = content.replace(
  'const totalMins = data.reduce((acc, curr) => acc + (Number(curr.duration_minutes) || 0), 0);',
  'const totalMins = data.reduce((acc, curr) => acc + (Number(curr.duration_minutes || (curr as any).duration) || 0), 0);'
);

fs.writeFileSync('src/hooks/useStudyStats.ts', content, 'utf8');
