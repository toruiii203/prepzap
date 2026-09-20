const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const prRegex = /function ProtectedRoute\(\{ children \}: \{ children: React\.ReactNode \}\) \{\s*const \{ session, loading, needsOnboarding \} = useAuth\(\);\s*if \(loading\) return <AppSkeleton \/>;/g;
content = content.replace(prRegex, 'function ProtectedRoute({ children }: { children: React.ReactNode }) {\n  const { session, loading, needsOnboarding } = useAuth();\n  const minLoading = useMinimumLoading(loading, 350);\n  if (minLoading) return <AppSkeleton />;\n');

fs.writeFileSync('src/App.tsx', content, 'utf8');
