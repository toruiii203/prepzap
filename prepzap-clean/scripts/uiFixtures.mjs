/** Local-browser fixtures only. Never used by application runtime or deployed builds. */
export const fixtureProfile = {
  id: 'ui-fixture-student', full_name: 'Study Student', email: 'student@example.test',
  onboarding_complete: true, streak_days: 3, total_xp: 475, coins: 20,
  plan: 'free', subjects: ['Biology'], daily_goal_minutes: 30,
};
export async function seedBrowser(page, { lesson = false, theme = 'light' } = {}) {
  await page.evaluateOnNewDocument((profile, options) => {
    const user = { id: profile.id, email: profile.email, user_metadata: { full_name: profile.full_name } };
    const session = { access_token: 'mock-token', user };
    localStorage.setItem('pz_auth_cache', JSON.stringify({ session, user, profile, cachedAt: Date.now() }));
    localStorage.setItem('pz_sound_muted', 'true');
    localStorage.setItem('pz_vibration_enabled', 'false');
    localStorage.setItem('pz_theme', options.theme);
    localStorage.setItem('pz_tutorial_seen_/practice', 'true');
    if (options.lesson) {
      const question = { q: 'Which process divides a cell?', type: 'multiple-choice', options: ['Mitosis', 'Photosynthesis'], correct: 0, subject: 'Biology', difficulty: 'Easy', explanation: 'Mitosis creates two daughter cells.' };
      localStorage.setItem('pz_practice_mode', 'lesson');
      localStorage.setItem('pz_practice_queue', JSON.stringify([{ id: 'fixture-question', question, originalIndex: 0, mastery: 0, attempts: 0, isReTest: false }]));
      localStorage.setItem('pz_practice_questions', JSON.stringify([question]));
      localStorage.setItem('pz_practice_total_count', '1');
    }
    // Realtime is deliberately a local transport fixture, not a live service check.
    class FixtureSocket extends EventTarget {
      static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
      readyState = 0; bufferedAmount = 0; binaryType = 'blob'; protocol = ''; extensions = '';
      constructor(url) { super(); this.url = url; setTimeout(() => { this.readyState = 1; this.onopen?.(new Event('open')); }, 0); }
      send(data) {
        try {
          const message = JSON.parse(data);
          if (!Array.isArray(message)) return;
          const [join, ref, topic, event] = message;
          if (event === 'phx_join' || event === 'heartbeat') setTimeout(() => this.onmessage?.(new MessageEvent('message', { data: JSON.stringify([join, ref, topic, 'phx_reply', { status: 'ok', response: {} }]) })), 0);
        } catch { /* Binary realtime frames are outside this fixture. */ }
      }
      close() { this.readyState = 3; this.onclose?.(new CloseEvent('close')); }
    }
    window.WebSocket = FixtureSocket;
  }, fixtureProfile, { lesson, theme });
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = new URL(request.url());
    if (['localhost', '127.0.0.1'].includes(url.hostname) || ['data:', 'blob:'].includes(url.protocol)) return request.continue();
    let body = url.pathname.includes('/profiles') && url.searchParams.get('id') === `eq.${fixtureProfile.id}` ? fixtureProfile : [];
    if (url.hostname.includes('workers.dev')) {
      const item = { term: 'Mitosis', definition: 'Cell division', statement: 'Mitosis divides a cell.', isTrue: true, question: 'Which process divides a cell?', correctAnswer: 'Mitosis', wrongAnswers: ['Photosynthesis','Respiration','Diffusion'], items: ['Mitosis','Meiosis','Division','Photosynthesis'], oddIndex: 3, reason: 'Photosynthesis makes sugars.', word: 'MITOSIS', hint: 'Cell division', options: ['A. Mitosis','B. Diffusion','C. Respiration','D. Photosynthesis'], correct_answer: 'A', explanation: 'Mitosis creates two daughter cells.' };
      body = { choices: [{ message: { content: JSON.stringify([item]) } }] };
    }
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
      'access-control-allow-headers': request.headers()['access-control-request-headers'] || 'authorization, apikey, content-type, x-client-info, prefer, accept-profile, content-profile, range',
    };
    if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
    return request.respond({ status: 200, contentType: 'application/json', headers, body: JSON.stringify(body) });
  });
}
