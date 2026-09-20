const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const mrRegex = /function MobileRootRedirect\(\) \{\s*const \{ session, loading \} = useAuth\(\);\s*if \(loading\) return <AppSkeleton \/>;/g;
content = content.replace(mrRegex, 'function MobileRootRedirect() {\n  const { session, loading } = useAuth();\n  const minLoading = useMinimumLoading(loading, 350);\n  if (minLoading) return <AppSkeleton />;');

fs.writeFileSync('src/App.tsx', content, 'utf8');
