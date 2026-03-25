import { Navigate, Link } from 'react-router-dom';
import { BookOpen, Sparkles, Users, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Login() {
  const { isAuthenticated, login, isLoading, error } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Signing you in...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) return <Navigate to="/app" replace />;

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-sidebar to-primary/90 text-white p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
              <BookOpen className="w-7 h-7" />
            </div>
            <span className="text-2xl font-bold">StudyFlow</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4">Study smarter,<br />together.</h1>
          <p className="text-lg text-white/80 max-w-md">Create collaborative study groups, share notes, and let AI help you generate summaries and flashcards.</p>
        </div>
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0"><Users className="w-5 h-5" /></div>
            <div><h3 className="font-semibold mb-1">Collaborative Groups</h3><p className="text-sm text-white/70">Study together with classmates.</p></div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0"><Sparkles className="w-5 h-5" /></div>
            <div><h3 className="font-semibold mb-1">AI-Powered Learning</h3><p className="text-sm text-white/70">Generate summaries and flashcards.</p></div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0"><Brain className="w-5 h-5" /></div>
            <div><h3 className="font-semibold mb-1">Smart Flashcards</h3><p className="text-sm text-white/70">Master concepts with interactive sessions.</p></div>
          </div>
        </div>
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold">StudyFlow</span>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Welcome to StudyFlow</h2>
            <p className="text-muted-foreground">Organize notes, summaries, and flashcards with your study group.</p>
          </div>
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              <p className="font-medium mb-1">Authentication error</p>
              <p>{error}</p>
            </div>
          )}
          <Button onClick={login} variant="hero" size="xl" className="w-full">Get started</Button>
          <p className="text-center text-xs text-muted-foreground">
            By continuing, you agree to our{' '}
            <Link to="/terms" className="underline hover:text-foreground">Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
