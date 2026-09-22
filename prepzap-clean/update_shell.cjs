const fs = require('fs');
let content = fs.readFileSync('src/components/ToolPageShell.tsx', 'utf8');

// Add imports
content = content.replace('import { useNavigate, Link } from "react-router-dom";', 'import { useNavigate, Link, useLocation } from "react-router-dom";\nimport { useTutorialModal } from "@/hooks/useTutorialModal";\nimport { TutorialModal } from "@/components/TutorialModal";\nimport { TUTORIAL_CONTENT } from "@/lib/tutorialContent";');

// Hook
content = content.replace('const navigate = useNavigate();', 'const navigate = useNavigate();\n  const location = useLocation();\n  const tutorial = useTutorialModal(location.pathname);');

// Icon trigger
content = content.replace('<SourceSelectorPill />', '<SourceSelectorPill />\n            <span className="material-symbols-outlined" style={{ fontSize: 20, cursor: "pointer", color: TEXT2 }} onClick={() => tutorial.show()}>help</span>');

// Render
content = content.replace('<div>{children}</div>', '<div>{children}</div>\n        <TutorialModal isOpen={tutorial.isOpen} onDismiss={tutorial.dismiss} features={TUTORIAL_CONTENT[location.pathname] || []} title="How it works" />');

fs.writeFileSync('src/components/ToolPageShell.tsx', content, 'utf8');
