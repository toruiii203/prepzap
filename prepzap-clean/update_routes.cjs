const fs = require('fs');

// App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace('import StudyPet from "./pages/StudyPet";\n', '');
app = app.replace('<Route path="/pet" element={<StudyPet />} />\n', '');
fs.writeFileSync('src/App.tsx', app);

// MobileBottomNav.tsx
let nav = fs.readFileSync('src/components/MobileBottomNav.tsx', 'utf8');
nav = nav.replace("{ name: 'Pet', path: '/pet', icon: 'pets' },", "{ name: 'Notes', path: '/notes', icon: 'edit_document' },");
fs.writeFileSync('src/components/MobileBottomNav.tsx', nav);
console.log("Replaced nav and app routes");
