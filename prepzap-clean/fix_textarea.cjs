const fs = require('fs');

let content = fs.readFileSync('src/pages/AITutor.tsx', 'utf8');

content = content.replace(
  'onChange={(e) => handleTextareaChange(e, textareaRef)}',
  'onChange={(e) => handleTextareaChange(e, textareaRef)}\n              onBlur={() => { window.scrollTo(0, 0); document.body.scrollTop = 0; }}'
);

content = content.replace(
  'onChange={(e) => handleTextareaChange(e, desktopTextareaRef)}',
  'onChange={(e) => handleTextareaChange(e, desktopTextareaRef)}\n              onBlur={() => { window.scrollTo(0, 0); document.body.scrollTop = 0; }}'
);

// We should also change the main wrapper from style={{ height: "100dvh" }} to fixed inset-0 to ensure it NEVER gets pushed up off-screen by the browser layout engine.
content = content.replace(
  '<div className="w-full bg-[#FAF7F2] flex flex-col" style={{ height: "100dvh", overflow: "hidden" }}>',
  '<div className="w-full bg-[#FAF7F2] flex flex-col fixed inset-0 z-0" style={{ height: "100dvh", overflow: "hidden" }}>'
);

fs.writeFileSync('src/pages/AITutor.tsx', content, 'utf8');
