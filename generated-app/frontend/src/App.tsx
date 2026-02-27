import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppProvider, useApp } from '@/context/AppContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { CreateIssueModal } from '@/components/CreateIssueModal';
import { SearchModal } from '@/components/SearchModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Suspense, lazy, useEffect } from 'react';

// Lazy load pages
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const ProjectList = lazy(() => import('@/pages/ProjectList'));
const CreateProject = lazy(() => import('@/pages/CreateProject'));
const BoardView = lazy(() => import('@/pages/BoardView'));
const BacklogView = lazy(() => import('@/pages/BacklogView'));
const IssueDetail = lazy(() => import('@/pages/IssueDetail'));
const ProjectSettings = lazy(() => import('@/pages/ProjectSettings'));
const Reports = lazy(() => import('@/pages/Reports'));
const Login = lazy(() => import('@/pages/Login'));
const Signup = lazy(() => import('@/pages/Signup'));

// Simple loading spinner
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#D4A373] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Full-page loading spinner for auth check
function AuthLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-3 border-[#D4A373] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Loading...</p>
      </div>
    </div>
  );
}

// Route protection wrapper - redirects to login if not authenticated
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// Wrapper that sets current project from URL params
function ProjectRouteWrapper({ children }: { children: React.ReactNode }) {
  const { projectId } = useParams<{ projectId: string }>();
  const { setCurrentProject, state } = useApp();

  useEffect(() => {
    if (projectId && state.currentProjectId !== projectId) {
      setCurrentProject(projectId);
    }
  }, [projectId, setCurrentProject, state.currentProjectId]);

  return <>{children}</>;
}

// Keyboard shortcuts
function GlobalShortcuts() {
  const { openCreateIssue, toggleSidebar } = useApp();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') return;

      if (e.key === 'c' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        openCreateIssue();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '[') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [openCreateIssue, toggleSidebar]);

  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppProvider>
          <BrowserRouter>
            <Routes>
              {/* Public auth routes */}
              <Route path="/login" element={
                <Suspense fallback={<AuthLoader />}><Login /></Suspense>
              } />
              <Route path="/signup" element={
                <Suspense fallback={<AuthLoader />}><Signup /></Suspense>
              } />

              {/* Protected routes */}
              <Route element={
                <RequireAuth>
                  <>
                    <GlobalShortcuts />
                    <CreateIssueModal />
                    <SearchModal />
                    <AppLayout />
                  </>
                </RequireAuth>
              }>
                <Route path="/" element={
                  <Suspense fallback={<PageLoader />}><Dashboard /></Suspense>
                } />
                <Route path="/projects" element={
                  <Suspense fallback={<PageLoader />}><ProjectList /></Suspense>
                } />
                <Route path="/projects/new" element={
                  <Suspense fallback={<PageLoader />}><CreateProject /></Suspense>
                } />
                <Route path="/project/:projectId/board" element={
                  <Suspense fallback={<PageLoader />}>
                    <ProjectRouteWrapper><BoardView /></ProjectRouteWrapper>
                  </Suspense>
                } />
                <Route path="/project/:projectId/backlog" element={
                  <Suspense fallback={<PageLoader />}>
                    <ProjectRouteWrapper><BacklogView /></ProjectRouteWrapper>
                  </Suspense>
                } />
                <Route path="/project/:projectId/sprints" element={
                  <Suspense fallback={<PageLoader />}>
                    <ProjectRouteWrapper><BacklogView /></ProjectRouteWrapper>
                  </Suspense>
                } />
                <Route path="/project/:projectId/reports" element={
                  <Suspense fallback={<PageLoader />}>
                    <ProjectRouteWrapper><Reports /></ProjectRouteWrapper>
                  </Suspense>
                } />
                <Route path="/project/:projectId/settings" element={
                  <Suspense fallback={<PageLoader />}>
                    <ProjectRouteWrapper><ProjectSettings /></ProjectRouteWrapper>
                  </Suspense>
                } />
                <Route path="/project/:projectId/issues/:issueId" element={
                  <Suspense fallback={<PageLoader />}>
                    <ProjectRouteWrapper><IssueDetail /></ProjectRouteWrapper>
                  </Suspense>
                } />
                <Route path="/issues/:issueId" element={
                  <Suspense fallback={<PageLoader />}><IssueDetail /></Suspense>
                } />
                <Route path="/project/:projectId/*" element={
                  <Suspense fallback={<PageLoader />}>
                    <ProjectRouteWrapper><BoardView /></ProjectRouteWrapper>
                  </Suspense>
                } />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AppProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
