import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { StudyProvider } from "@/contexts/StudyContext";
import { AppLayout } from "@/components/layout/AppLayout";
import type { AppState } from "@auth0/auth0-react";
import type { ReactNode } from "react";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Groups from "@/pages/Groups";
import GroupDetail from "@/pages/GroupDetail";
import CreateGroup from "@/pages/CreateGroup";
import JoinGroup from "@/pages/JoinGroup";
import Topics from "@/pages/Topics";
import TopicDetail from "@/pages/TopicDetail";
import CreateTopic from "@/pages/CreateTopic";
import NoteView from "@/pages/NoteView";
import CreateNote from "@/pages/CreateNote";
import Notes from "@/pages/Notes";
import FlashcardsView from "@/pages/FlashcardsView";
import CreateFlashcardSet from "@/pages/CreateFlashcardSet";
import Flashcards from "@/pages/Flashcards";
import SummaryView from "@/pages/SummaryView";
import Summaries from "@/pages/Summaries";
import Profile from "@/pages/Profile";
import AIJobs from "@/pages/AIJobs";
import Onboarding from "@/pages/Onboarding";
import TermsOfService from "@/pages/TermsOfService";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function RootRedirect() {
  const { isLoading } = useAuth0();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  return <Navigate to="/app" replace />;
}

function OnboardingGuard({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user && !user.onboardedAt) {
    return <Navigate to="/app/onboarding" replace />;
  }
  return <>{children}</>;
}

function Auth0ProviderWithNavigate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  const onRedirectCallback = (appState?: AppState) => {
    navigate(appState?.returnTo || "/app", { replace: true });
  };

  return (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      }}
      onRedirectCallback={onRedirectCallback}
      useRefreshTokens={true}
      cacheLocation="localstorage"
    >
      {children}
    </Auth0Provider>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" />
        <BrowserRouter>
          <Auth0ProviderWithNavigate>
            <AuthProvider>
              <StudyProvider>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/" element={<RootRedirect />} />
                  <Route path="/app/onboarding" element={<Onboarding />} />
                  <Route path="/app" element={<OnboardingGuard><AppLayout /></OnboardingGuard>}>
                    <Route index element={<Dashboard />} />
                    <Route path="groups" element={<Groups />} />
                    <Route path="groups/new" element={<CreateGroup />} />
                    <Route path="groups/join" element={<JoinGroup />} />
                    <Route path="groups/:groupId" element={<GroupDetail />} />
                    <Route path="topics" element={<Topics />} />
                    <Route path="topics/new" element={<CreateTopic />} />
                    <Route path="topics/:topicId" element={<TopicDetail />} />
                    <Route path="materials/:materialId/note" element={<NoteView />} />
                    <Route path="materials/:materialId/summary" element={<SummaryView />} />
                    <Route path="materials/:materialId/flashcards" element={<FlashcardsView />} />
                    <Route path="notes" element={<Notes />} />
                    <Route path="notes/new" element={<CreateNote />} />
                    <Route path="summaries" element={<Summaries />} />
                    <Route path="flashcards" element={<Flashcards />} />
                    <Route path="flashcards/new" element={<CreateFlashcardSet />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="jobs" element={<AIJobs />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </StudyProvider>
            </AuthProvider>
          </Auth0ProviderWithNavigate>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
