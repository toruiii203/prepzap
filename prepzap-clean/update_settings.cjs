const fs = require('fs');

let content = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

// Add states for username and display name
const searchState = `const [userName, setUserName] = useState("Learner")`;
const replaceState = `const [userName, setUserName] = useState("Learner")
  const [profileUsername, setProfileUsername] = useState("");
  const [profileDisplayName, setProfileDisplayName] = useState("");`;
content = content.replace(searchState, replaceState);

// Load them from profiles
const searchLoad = `supabase.from("profiles").select("daily_goal_minutes, subjects, notif_streak, notif_reminders, notif_community, notif_weekly").eq("id", user.id).maybeSingle().then(({ data }) => {`;
const replaceLoad = `supabase.from("profiles").select("daily_goal_minutes, subjects, notif_streak, notif_reminders, notif_community, notif_weekly, username, display_name").eq("id", user.id).maybeSingle().then(({ data }) => {
        if (data?.username) setProfileUsername(data.username);
        if (data?.display_name) setProfileDisplayName(data.display_name);`;
content = content.replace(searchLoad, replaceLoad);

// Save them via Edge Function
const searchSave = `const { error } = await supabase.from("profiles").update({
        daily_goal_minutes: dailyGoal,
        subjects: Array.from(subjects),
        notif_streak: notifs.streak,
        notif_reminders: notifs.reminders,
        notif_community: notifs.community,
        notif_weekly: notifs.weekly
      }).eq("id", user.id)`;
const replaceSave = `// Moderate and update names via Edge Function
      if (profileUsername.trim() || profileDisplayName.trim()) {
        const { error: invokeErr } = await supabase.functions.invoke("moderate-and-insert", {
          body: {
            action: "update_profile",
            payload: {
              username: profileUsername.trim() || undefined,
              display_name: profileDisplayName.trim() || undefined
            }
          }
        });
        if (invokeErr) {
          console.error("Moderation error:", invokeErr);
          alert(invokeErr.message || "Failed to update profile names.");
          throw invokeErr;
        }
      }

      // Update basic settings
      const { error } = await supabase.from("profiles").update({
        daily_goal_minutes: dailyGoal,
        subjects: Array.from(subjects),
        notif_streak: notifs.streak,
        notif_reminders: notifs.reminders,
        notif_community: notifs.community,
        notif_weekly: notifs.weekly
      }).eq("id", user.id)`;
content = content.replace(searchSave, replaceSave);

// Add input fields to UI under the profile header
const searchUI = `<div style={{ padding: 16, background: "#fff", display: "flex", alignItems: "center", gap: 16, borderBottom: "2px solid #1c1c19" }}>
                <div style={{ width: 48, height: 48, borderRadius: 24, background: "#1c1c19", display: "flex", alignItems: "center", justifyContent: "center", color: "#FAF7F2", fontSize: 20, fontWeight: 900, border: "2px solid #1c1c19" }}>
                  {userInitial}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 800, color: "#1c1c19", margin: "0 0 2px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{userName}</p>
                  <p style={{ fontSize: 11, color: "#6b6b6b", margin: "0 0 6px", fontFamily: "'Quicksand', sans-serif" }}>{userEmail}</p>
                  <span style={{ fontSize: 10, padding: "2px 8px", fontWeight: 800, letterSpacing: "0.08em", background: isPro ? "#fef3c7" : "#f3f4f6", color: isPro ? "#92400e" : "#374151", border: "1.5px solid #1c1c19", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {isPro ? "PRO o" : "FREE"}
                  </span>
                </div>
              </div>`;

const replaceUI = `<div style={{ padding: 16, background: "#fff", display: "flex", alignItems: "center", gap: 16, borderBottom: "2px solid #1c1c19" }}>
                <div style={{ width: 48, height: 48, borderRadius: 24, background: "#1c1c19", display: "flex", alignItems: "center", justifyContent: "center", color: "#FAF7F2", fontSize: 20, fontWeight: 900, border: "2px solid #1c1c19" }}>
                  {userInitial}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 800, color: "#1c1c19", margin: "0 0 2px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{userName}</p>
                  <p style={{ fontSize: 11, color: "#6b6b6b", margin: "0 0 6px", fontFamily: "'Quicksand', sans-serif" }}>{userEmail}</p>
                  <span style={{ fontSize: 10, padding: "2px 8px", fontWeight: 800, letterSpacing: "0.08em", background: isPro ? "#fef3c7" : "#f3f4f6", color: isPro ? "#92400e" : "#374151", border: "1.5px solid #1c1c19", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {isPro ? "PRO ✨" : "FREE"}
                  </span>
                </div>
              </div>
              <div style={{ padding: "16px", background: "#FAF7F2", borderBottom: "2px solid #1c1c19", display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#1c1c19", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Display Name</label>
                  <input type="text" value={profileDisplayName} onChange={(e) => setProfileDisplayName(e.target.value)} placeholder="How you appear in games" style={{ width: "100%", padding: "8px 12px", border: "2px solid #1c1c19", borderRadius: 4, fontFamily: "'Quicksand', sans-serif", fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#1c1c19", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>@Username</label>
                  <input type="text" value={profileUsername} onChange={(e) => setProfileUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} placeholder="Unique handle" style={{ width: "100%", padding: "8px 12px", border: "2px solid #1c1c19", borderRadius: 4, fontFamily: "'Quicksand', sans-serif", fontSize: 13 }} />
                </div>
              </div>`;
content = content.replace(searchUI, replaceUI);

fs.writeFileSync('src/pages/Settings.tsx', content, 'utf8');
