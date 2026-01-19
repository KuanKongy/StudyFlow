import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { StudyProvider } from "@/contexts/StudyContext";
import { AppLayout } from "@/components/layout/AppLayout";

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
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StudyProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner position="top-right" />
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Navigate to="/app" replace />} />
                <Route path="/app" element={<AppLayout />}>
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
            </BrowserRouter>
          </TooltipProvider>
        </StudyProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
