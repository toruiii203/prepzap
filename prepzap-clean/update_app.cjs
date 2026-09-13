const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/import StudyPet from "\.\/pages\/StudyPet";/g, '');
app = app.replace(/<Route path="\/pet" element=\{<StudyPet \/>\} \/>/g, '');
fs.writeFileSync('src/App.tsx', app);
