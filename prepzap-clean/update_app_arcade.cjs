const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const imports = `import Arcade from "./pages/Arcade";
import MemoryMatch from "./pages/arcade/MemoryMatch";
import TrueFalseBlitz from "./pages/arcade/TrueFalseBlitz";
import Termle from "./pages/arcade/Termle";`;

content = content.replace(/import Arcade from "\.\/pages\/Arcade";[\s\S]*?\/\/ import Termle from "\.\/pages\/arcade\/Termle";/, imports);

const routes = `<Route path="/arcade" element={<ProtectedRoute><Arcade /></ProtectedRoute>} />
          <Route path="/arcade/memory-match" element={<ProtectedRoute><MemoryMatch /></ProtectedRoute>} />
          <Route path="/arcade/true-false" element={<ProtectedRoute><TrueFalseBlitz /></ProtectedRoute>} />
          <Route path="/arcade/termle" element={<ProtectedRoute><Termle /></ProtectedRoute>} />`;

content = content.replace('<Route path="/arcade" element={<ProtectedRoute><Arcade /></ProtectedRoute>} />', routes);

fs.writeFileSync('src/App.tsx', content, 'utf8');
