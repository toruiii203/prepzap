const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Import AppSkeleton
if (!content.includes('import { AppSkeleton }')) {
    content = content.replace(
        'import { PageErrorBoundary } from "@/components/PageErrorBoundary";',
        'import { PageErrorBoundary } from "@/components/PageErrorBoundary";\nimport { AppSkeleton } from "@/components/AppSkeleton";'
    );
}

// 2. Replace ProtectedRoute loading
const prTarget = `  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#1a0a0a", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(245,237,232,0.75)", fontSize: 14 }}>
        Loading page...
      </div>
    );
  }`;
const prReplace = `  if (loading) return <AppSkeleton />;`;
content = content.replace(prTarget, prReplace);

// 3. Replace MobileRootRedirect loading
const mrTarget = `  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#FAF7F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <img src="/icon-512.png" alt="Loading" style={{ width: 72, height: 72, opacity: 0.7 }} />
    </div>
  );`;
const mrReplace = `  if (loading) return <AppSkeleton />;`;
content = content.replace(mrTarget, mrReplace);

fs.writeFileSync('src/App.tsx', content, 'utf8');
