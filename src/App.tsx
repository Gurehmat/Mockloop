import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { AppShell, Button, ErrorPanel, LoadingScreen } from './components/ui';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Setup from './pages/Setup';
import Interview from './pages/Interview';
import Results from './pages/Results';

function PublicRoute() {
  const { userId, onboardingComplete, loading, error } = useAuth();

  if (loading) {
    return <LoadingScreen title="Loading MockLoop" description="Checking your session and interview data." />;
  }

  if (error) {
    return (
      <AppShell>
        <ErrorPanel
          action={
            <Button onClick={() => window.location.reload()} type="button">
              Retry
            </Button>
          }
          message={error}
          title="Authentication bootstrap failed"
        />
      </AppShell>
    );
  }

  if (userId) {
    return <Navigate replace to={onboardingComplete ? '/dashboard' : '/onboarding'} />;
  }

  return <Outlet />;
}

function ProtectedRoute() {
  const { userId, onboardingComplete, loading, error } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen title="Loading MockLoop" description="Checking your session and interview data." />;
  }

  if (error) {
    return (
      <AppShell>
        <ErrorPanel
          action={
            <Button onClick={() => window.location.reload()} type="button">
              Retry
            </Button>
          }
          message={error}
          title="Authentication bootstrap failed"
        />
      </AppShell>
    );
  }

  if (!userId) {
    return <Navigate replace state={{ from: location.pathname }} to="/auth" />;
  }

  if (!onboardingComplete && location.pathname !== '/onboarding') {
    return <Navigate replace to="/onboarding" />;
  }

  return <Outlet />;
}

function OnboardingRoute() {
  const { userId, onboardingComplete, loading, error } = useAuth();

  if (loading) {
    return <LoadingScreen title="Loading your profile" description="Preparing your onboarding steps." />;
  }

  if (error) {
    return (
      <AppShell>
        <ErrorPanel
          action={
            <Button onClick={() => window.location.reload()} type="button">
              Retry
            </Button>
          }
          message={error}
          title="Authentication bootstrap failed"
        />
      </AppShell>
    );
  }

  if (!userId) {
    return <Navigate replace to="/auth" />;
  }

  if (onboardingComplete) {
    return <Navigate replace to="/dashboard" />;
  }

  return <Onboarding />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route element={<Landing />} path="/" />
        <Route element={<Auth />} path="/auth" />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<Dashboard />} path="/dashboard" />
        <Route element={<Setup />} path="/setup" />
        <Route element={<Interview />} path="/interview/:sessionId" />
        <Route element={<Results />} path="/results/:sessionId" />
      </Route>

      <Route element={<OnboardingRoute />} path="/onboarding" />
      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
