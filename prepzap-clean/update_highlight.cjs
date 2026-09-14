const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');

css = css.replace(
  '::selection { background: rgba(240,160,64,0.2); color: var(--pz-text); }',
  '::selection { background: rgba(255, 77, 46, 0.3); color: inherit; } /* #FF4D2E with opacity */'
);

// Tiptap specifically sometimes uses ProseMirror-selectednode
css += `\n\n/* Tiptap Editor Highlights */
.ProseMirror ::selection {
  background: rgba(255, 77, 46, 0.3) !important;
  color: inherit !important;
}
.ProseMirror-selectednode {
  outline: 2px solid #FF4D2E;
}
`;

fs.writeFileSync('src/index.css', css);
console.log("Updated index.css");
