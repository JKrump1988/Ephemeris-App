import "@/App.css";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { AstrologerChatProvider } from "@/context/AstrologerChatContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AccountPage from "@/pages/AccountPage";
import AcademyPage from "@/pages/AcademyPage";
import AstrologerPage from "@/pages/AstrologerPage";
import AuthPage from "@/pages/AuthPage";
import DailyPage from "@/pages/DailyPage";
import DashboardPage from "@/pages/DashboardPage";
import LandingPage from "@/pages/LandingPage";
import OnboardingPage from "@/pages/OnboardingPage";
import ReadingPage from "@/pages/ReadingPage";


function ProtectedRoute({ children, requireChart = false }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <div className="px-6 py-24 text-sm uppercase tracking-[0.24em] text-slate-400" data-testid="route-loading-state">Loading…</div>;
  }

  if (!isAuthenticated) {
    return <Navigate replace to="/auth" />;
  }

  if (requireChart && !user?.has_chart) {
    return <Navigate replace to="/onboarding" />;
  }

  return children;
}


function RoutedPage({ children, requireAuth = false, requireChart = false }) {
  const content = requireAuth ? <ProtectedRoute requireChart={requireChart}>{children}</ProtectedRoute> : children;
  return <AppShell>{content}</AppShell>;
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <AuthProvider>
        <AstrologerChatProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<RoutedPage><LandingPage /></RoutedPage>} />
              <Route path="/auth" element={<RoutedPage><AuthPage /></RoutedPage>} />
              <Route path="/onboarding" element={<RoutedPage requireAuth><OnboardingPage /></RoutedPage>} />
              <Route path="/dashboard" element={<RoutedPage requireAuth requireChart><DashboardPage /></RoutedPage>} />
              <Route path="/readings/:tier" element={<RoutedPage requireAuth requireChart><ReadingPage /></RoutedPage>} />
              <Route path="/daily" element={<RoutedPage requireAuth requireChart><DailyPage /></RoutedPage>} />
              <Route path="/astrologer" element={<RoutedPage requireAuth requireChart><AstrologerPage /></RoutedPage>} />
              <Route path="/academy" element={<RoutedPage requireAuth requireChart><AcademyPage /></RoutedPage>} />
              <Route path="/account" element={<RoutedPage requireAuth requireChart><AccountPage /></RoutedPage>} />
              <Route path="*" element={<Navigate replace to="/" />} />
            </Routes>
            <Toaster closeButton mobileOffset="96px" offset="84px" position="top-right" richColors />
          </BrowserRouter>
        </AstrologerChatProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
