const fs = require('fs');
const content = `- [ ] 1. Data-source unification
  - [ ] Dashboard stats
  - [ ] Analytics stats
  - [ ] Mobile dashboard (StudentProfile) stats
- [ ] 2. Formatting session durations
- [ ] 3. Arcade/Arena 0 duration
- [ ] 4. Dashboard "Recent Sessions" widget stuck permanently on "Loading sessions..."
- [ ] 5. Notes page "My Notes" list stuck permanently on "Loading..."
- [ ] 6. Rex Tutor's quick-action button row overflows its container
- [ ] 7. Sidebar "UPGRADE TO PRO" button still shows for Pro account
- [ ] 8. Rex Tutor shows the same AI disclaimer twice
- [ ] 9. Flashcards "Recent Decks" list shows every deck duplicated
- [ ] 10. Quick Study page shows the Cram Mode toggle and Coverage Score twice
- [ ] 11. User avatar initial in the top-right header is inconsistent across pages
- [ ] 12. Daily goal target is inconsistent between screens (Dashboard vs Focus Timer)
- [ ] 13. Arena/Exam Room status badges are contradictory (LIVE + WAITING)
- [ ] 14. Sidebar username is always truncated with no way to see the full name
- [ ] 15. "1 msgs" grammar bug in Rex Tutor's Chat History list
- [ ] 16. Function Visualizer on Math Solver axis-label collision
- [ ] 17. Knowledge Distribution chart on Analytics is unfinished
- [ ] 18. 404 page uses a completely different dark theme
- [ ] 19. Public Exam Room name moderation / delete test rooms
- [ ] 20. No mobile bottom-nav or "All Tools" entry for Settings, Focus Timer, or Arcade
- [ ] 21. Mobile Weekly Study Calendar shows raw numbers instead of icons
- [ ] 22. Mobile Profile page stat tiles show placeholder dashes
- [ ] 23. Mobile Profile page nav-card descriptions are truncated mid-word with no wrap`;
fs.writeFileSync('C:\\Users\\Migs\\.gemini\\antigravity\\brain\\da4ad1ea-0915-4e61-9968-7951e91aba65\\task.md', content, 'utf8');
