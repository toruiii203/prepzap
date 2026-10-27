import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import { SpringButton } from "@/components/ui/SpringButton";
import { Skeleton } from "@/components/ui/skeleton";
import { Mascot } from "@/components/Mascot";
import { useAuth } from "@/contexts/AuthContext";
import { useStudyStats } from "@/hooks/useStudyStats";
import { checklistSummary, studySummary, studyTimeLabel } from "@/lib/analyticsPresentation";
import "@/styles/analytics.css";

export default function Analytics() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { sessions, loading, error, refreshStats } = useStudyStats();
  const summary = useMemo(() => studySummary(sessions, new Date(), user?.id), [sessions, user?.id]);
  const [tasks, setTasks] = useState({ total: 0, completed: 0 });
  const [shareStatus, setShareStatus] = useState("");
  useEffect(() => {
    try { setTasks(checklistSummary(localStorage.getItem(user?.id ? `pz_${user.id}_checklist` : "pz_checklist"))); }
    catch { setTasks({ total: 0, completed: 0 }); }
  }, [user?.id]);
  const initialLoading = loading && !summary.sessions.length;
  const unknownData = !!error && !summary.sessions.length;
  const maxMinutes = Math.max(1, ...summary.week.map(day => day.minutes));
  const share = async () => {
    const text = `My Studenius progress: ${studyTimeLabel(summary.totalMinutes)} studied across ${summary.sessions.length} sessions.`;
    try {
      if (navigator.share) await navigator.share({ title: "My study progress", text });
      else if (navigator.clipboard) { await navigator.clipboard.writeText(text); setShareStatus("Progress copied."); }
      else setShareStatus("Sharing isn’t available in this browser.");
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) setShareStatus("Couldn’t share. Try again when you’re ready.");
    }
  };
  return <div className="analytics-shell">
    <SharedSidebar active="/analytics" />
    <main className="analytics-page">
      <div className="analytics-content">
        <header className="analytics-header">
          <div><h1>Your study progress</h1><p>A clear look at the time you’ve put in.</p></div>
          <div className="analytics-actions">
            <SpringButton className="analytics-secondary" disabled={loading} onClick={() => { void refreshStats(); }}>Refresh</SpringButton>
            {!loading && !summary.sessions.length ? <SpringButton className="analytics-primary" onClick={() => { if (error) void refreshStats(); else navigate("/practice"); }}>{error ? "Try again" : "Start practicing"}</SpringButton> : <SpringButton className="analytics-secondary" disabled={loading} onClick={() => { void share(); }}>Share progress</SpringButton>}
          </div>
        </header>
        <p className="analytics-status" role="status" aria-live="polite">{shareStatus || (loading ? "Refreshing study progress…" : "")}</p>
        {error && <p className="analytics-data-warning" role="status">{error}</p>}
        <section className="analytics-metrics" aria-label="Study totals">
          {[{ label: "Time studied", value: unknownData ? "—" : studyTimeLabel(summary.totalMinutes) }, { label: "Sessions logged", value: unknownData ? "—" : String(summary.sessions.length) }, { label: "Current streak", value: `${profile?.streak_days || 0} ${(profile?.streak_days || 0) === 1 ? "day" : "days"}` }].map(metric => <div key={metric.label}><h2>{metric.label}</h2>{initialLoading ? <Skeleton className="h-9 w-24" /> : <p>{metric.value}</p>}</div>)}
        </section>
        <section className="analytics-panel" aria-labelledby="weekly-title" aria-busy={loading}>
          <div className="analytics-section-heading"><h2 id="weekly-title">This week</h2><span>{initialLoading ? "Loading study time…" : unknownData ? "—" : studyTimeLabel(summary.weeklyMinutes)}</span></div>
          <p>Monday to Sunday · your local time</p>
          {initialLoading ? <div className="analytics-chart-skeleton" role="status" aria-label="Loading weekly activity">{Array.from({ length: 7 }, (_, index) => <Skeleton key={index} className="h-24 w-full" />)}</div> : unknownData ? <p>Study activity couldn’t be loaded. Use Refresh to try again.</p> : <ul className="analytics-chart" aria-label="Daily study time">
            {summary.week.map(day => <li key={day.date.toISOString()}>
              <span className="analytics-chart-value">{studyTimeLabel(day.minutes)}</span>
              <div className="analytics-bar-track" aria-hidden="true"><div className="analytics-bar" style={{ transform: `scaleY(${day.minutes / maxMinutes})` }} /></div>
              <span>{day.date.toLocaleDateString(undefined, { weekday: "short" })}</span>
            </li>)}
          </ul>}
          {!loading && !unknownData && summary.weeklyMinutes === 0 && <p className="analytics-chart-note">Your study time will appear here after a session.</p>}
        </section>
        <div className="analytics-detail-grid">
          <section className="analytics-panel" aria-labelledby="recent-title" aria-busy={loading}>
            <div className="analytics-section-heading"><h2 id="recent-title">Recent sessions</h2></div>
            {initialLoading ? <div role="status" aria-label="Loading recent sessions" className="analytics-session-skeleton">{[0, 1, 2].map(index => <Skeleton key={index} className="h-14 w-full" />)}</div> : summary.sessions.length ? <ul className="analytics-sessions">{summary.sessions.slice(0, 5).map((session, index) => <li key={`${session.id}-${index}`}><div><h3>{session.title}</h3><time dateTime={session.date.toISOString()}>{session.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</time></div><span>{studyTimeLabel(session.minutes)}</span></li>)}</ul> : <div className="analytics-empty"><Mascot mood="encourage" size="sm" /><h3>{error ? "Let’s try that again" : "A little practice starts here"}</h3><p>{error ? "Refresh to try loading your study log again." : "Complete a study session to build your progress log."}</p></div>}
          </section>
          <section className="analytics-panel" aria-labelledby="tasks-title"><h2 id="tasks-title">Your checklist</h2><p>{tasks.total ? `${tasks.completed} of ${tasks.total} tasks completed.` : "A short plan can make your next step easier."}</p><SpringButton className="analytics-secondary" onClick={() => navigate("/planner")}>Open study planner</SpringButton></section>
        </div>
      </div>
    </main>
  </div>;
}
