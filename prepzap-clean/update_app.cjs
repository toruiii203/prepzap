const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Imports
content = content.replace('import Arena from "./pages/Arena";', 'import Arena from "./pages/Arena";\nimport Arcade from "./pages/Arcade";\n// Import games here when created: \n// import MemoryMatch from "./pages/arcade/MemoryMatch";\n// import TrueFalseBlitz from "./pages/arcade/TrueFalseBlitz";\n// import Termle from "./pages/arcade/Termle";');

// Routes
content = content.replace('<Route path="/arena/*" element={<ProtectedRoute><Arena /></ProtectedRoute>} />', '<Route path="/arena/*" element={<ProtectedRoute><Arena /></ProtectedRoute>} />\n          <Route path="/arcade" element={<ProtectedRoute><Arcade /></ProtectedRoute>} />');

fs.writeFileSync('src/App.tsx', content, 'utf8');
