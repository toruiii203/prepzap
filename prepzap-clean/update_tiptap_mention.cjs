const fs = require("fs");
let content = fs.readFileSync("src/components/TiptapEditor.tsx", "utf8");

const importMention = `import Mention from "@tiptap/extension-mention";\nimport suggestion from "./suggestion";\n`;
if (!content.includes("extension-mention")) {
    content = content.replace(`import Placeholder from "@tiptap/extension-placeholder";`, `import Placeholder from "@tiptap/extension-placeholder";\n${importMention}`);
}

const searchExt = `StarterKit,
      Placeholder.configure({`;
const replaceExt = `StarterKit,
      Mention.configure({
        HTMLAttributes: {
          class: 'mention inline-block px-1.5 py-0.5 rounded-md bg-[#e3e8f8] border-2 border-[#1c1c19] text-[#1e3a8a] font-bold shadow-[2px_2px_0px_#1c1c19] mx-1 cursor-pointer hover:bg-[#dbeafe] transition-colors',
        },
        suggestion: {
          ...suggestion,
          char: '[[',
        },
      }),
      Placeholder.configure({`;
content = content.replace(searchExt, replaceExt);

fs.writeFileSync("src/components/TiptapEditor.tsx", content, "utf8");
