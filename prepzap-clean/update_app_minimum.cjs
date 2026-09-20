const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const hookCode = `
function useMinimumLoading(loading: boolean, minDuration: number = 350) {
  const [isMinLoading, setIsMinLoading] = useState(true);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (!loading) {
      const elapsed = Date.now() - startTime;
      if (elapsed < minDuration) {
        const timer = setTimeout(() => setIsMinLoading(false), minDuration - elapsed);
        return () => clearTimeout(timer);
      } else {
        setIsMinLoading(false);
      }
    } else {
      setIsMinLoading(true);
    }
  }, [loading, minDuration, startTime]);

  return isMinLoading;
}
`;

if (!content.includes('function useMinimumLoading')) {
  // Insert hookCode right after imports and before the first component (SplashScreen)
  content = content.replace('function SplashScreen', hookCode + '\nfunction SplashScreen');
}

// Modify ProtectedRoute
const prOld = `function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, needsOnboarding } = useAuth();

  if (loading) return <AppSkeleton />;`;
const prNew = `function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, needsOnboarding } = useAuth();
  const minLoading = useMinimumLoading(loading, 350);

  if (minLoading) return <AppSkeleton />;`;
content = content.replace(prOld, prNew);

// Modify MobileRootRedirect
const mrOld = `function MobileRootRedirect() {
  const { session, loading } = useAuth();
  if (loading) return <AppSkeleton />;`;
const mrNew = `function MobileRootRedirect() {
  const { session, loading } = useAuth();
  const minLoading = useMinimumLoading(loading, 350);
  if (minLoading) return <AppSkeleton />;`;
content = content.replace(mrOld, mrNew);

fs.writeFileSync('src/App.tsx', content, 'utf8');
