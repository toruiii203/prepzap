const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const routes = `<Route path="/arena/results/:code" element={<ArenaResults />} />
          <Route path="/arcade" element={<Arcade />} />
          <Route path="/arcade/memory-match" element={<MemoryMatch />} />
          <Route path="/arcade/true-false" element={<TrueFalseBlitz />} />
          <Route path="/arcade/termle" element={<Termle />} />`;

content = content.replace('<Route path="/arena/results/:code" element={<ArenaResults />} />', routes);

fs.writeFileSync('src/App.tsx', content, 'utf8');
