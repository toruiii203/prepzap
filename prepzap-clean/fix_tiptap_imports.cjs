const fs = require('fs');
let file = fs.readFileSync('src/components/TiptapEditor.tsx', 'utf8');
file = file.replace('import { useEditor, EditorContent, FloatingMenu, BubbleMenu } from "@tiptap/react";', 'import { useEditor, EditorContent } from "@tiptap/react";\nimport { FloatingMenu, BubbleMenu } from "@tiptap/react/menus";');
fs.writeFileSync('src/components/TiptapEditor.tsx', file);
