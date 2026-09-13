const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

// Insert import if not there
if (!app.includes('import NotesWorkspace')) {
  app = app.replace(
    'import VisualLearner from "./pages/VisualLearner";',
    'import VisualLearner from "./pages/VisualLearner";\nimport NotesWorkspace from "./pages/NotesWorkspace";'
  );
}

// Add route
if (!app.includes('<Route path="/notes"')) {
  app = app.replace(
    '<Route path="/visual-learner" element={<VisualLearner />} />',
    '<Route path="/visual-learner" element={<VisualLearner />} />\n          <Route path="/notes" element={<NotesWorkspace />} />'
  );
}

fs.writeFileSync('src/App.tsx', app);
console.log("Updated App.tsx with Notes route");
