const fs = require("fs");
let content = fs.readFileSync("src/pages/AITutor.tsx", "utf8");

const importLine = `import { getRelevantContext } from "@/lib/rag";\n`;
if (!content.includes(importLine)) {
    content = importLine + content;
}

// Modify the handleSend function where it builds systemPrompt
const searchContext = `const contextText = buildAIContext();
    
    // Add new user message to UI
    const newUserMsg: Message = { id: uuidv4(), role: "user", content: finalMsg };`;

const replaceContext = `const activeSources = loadContext();
    const sourceIds = activeSources.map((s: any) => s.id);
    const ragContext = await getRelevantContext(finalMsg, sourceIds);
    const contextText = ragContext || buildAIContext(); // Fallback to raw text if RAG fails or is empty
    
    // Add new user message to UI
    const newUserMsg: Message = { id: uuidv4(), role: "user", content: finalMsg };`;

content = content.replace(searchContext, replaceContext);
fs.writeFileSync("src/pages/AITutor.tsx", content, "utf8");
