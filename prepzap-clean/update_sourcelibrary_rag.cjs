const fs = require("fs");
let content = fs.readFileSync("src/pages/SourceLibrary.tsx", "utf8");

const importLine = `import { processDocumentForRAG } from "@/lib/rag";\n`;
if (!content.includes(importLine)) {
    content = importLine + content;
}

const search = `await addSource({
            id: fileId,
            name: file.name,
            size: (file.size / 1024).toFixed(1) + " KB",
            type: file.type,
            uploadedAt: new Date().toISOString(),
            preview: fullText.slice(0, 500),
            fullText,
          });`;
          
const replace = `await addSource({
            id: fileId,
            name: file.name,
            size: (file.size / 1024).toFixed(1) + " KB",
            type: file.type,
            uploadedAt: new Date().toISOString(),
            preview: fullText.slice(0, 500),
            fullText,
          });
          
          // Background task: Chunk and generate embeddings for RAG
          processDocumentForRAG(fileId, fullText).catch(e => console.error("RAG processing failed:", e));`;

content = content.replace(search, replace);
fs.writeFileSync("src/pages/SourceLibrary.tsx", content, "utf8");
