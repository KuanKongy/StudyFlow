import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronRight, AtSign, User, Camera, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateProfile } from '@/hooks/useApi';
import { toast } from 'sonner';
import { validateUsername, validateDisplayName, LIMITS } from '@/lib/validation';
import { CharCounter } from '@/components/CharCounter';
import { TosContent } from '@/components/legal/TosContent';
import { PpContent } from '@/components/legal/PpContent';

type Step = 'tos' | 'privacy' | 'profile';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const updateProfileMutation = useUpdateProfile();

  const [step, setStep] = useState<Step>('tos');
  const [tosScrolled, setTosScrolled] = useState(false);
  const [ppScrolled, setPpScrolled] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');

  const tosRef = useRef<HTMLDivElement>(null);
  const ppRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>, which: 'tos' | 'pp') => {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
    if (atBottom) {
      if (which === 'tos') setTosScrolled(true);
      else setPpScrolled(true);
    }
  }, []);

  const usernameValidation = validateUsername(username);
  const displayNameValidation = validateDisplayName(displayName);

  const handleComplete = async () => {
    if (!usernameValidation.valid) {
      toast.error(usernameValidation.error);
      return;
    }
    if (!displayNameValidation.valid) {
      toast.error(displayNameValidation.error);
      return;
    }
    try {
      await updateProfileMutation.mutateAsync({
        username,
        name: displayName,
        picture: avatarUrl || undefined,
        onboardedAt: Date.now(),
      });
      toast.success('Welcome to StudyFlow!');
      navigate('/app', { replace: true });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save profile');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-center gap-3 mb-8 relative">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <span className="text-2xl font-bold">StudyFlow</span>
          <Button
            variant="outline"
            size="sm"
            className="absolute right-0 border-muted-foreground/50 font-medium"
            onClick={() => logout()}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {(['tos', 'privacy', 'profile'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s ? 'bg-primary text-primary-foreground' :
                (['tos', 'privacy', 'profile'].indexOf(step) > i ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground')
              }`}>
                {i + 1}
              </div>
              {i < 2 && <div className="w-12 h-0.5 bg-muted" />}
            </div>
          ))}
        </div>

        {step === 'tos' && (
          <Card>
            <CardHeader>
              <CardTitle>Terms of Service</CardTitle>
              <CardDescription>Please read the entire Terms of Service before continuing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                ref={tosRef}
                onScroll={(e) => handleScroll(e, 'tos')}
                className="h-80 overflow-y-auto border rounded-lg p-4 text-sm prose dark:prose-invert max-w-none"
              >
                <TosContent />
              </div>
              <Button
                className="w-full"
                onClick={() => setStep('privacy')}
                disabled={!tosScrolled}
              >
                {tosScrolled ? 'I Accept — Continue' : 'Scroll to read all terms'}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'privacy' && (
          <Card>
            <CardHeader>
              <CardTitle>Privacy Policy</CardTitle>
              <CardDescription>Please read the entire Privacy Policy before continuing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                ref={ppRef}
                onScroll={(e) => handleScroll(e, 'pp')}
                className="h-80 overflow-y-auto border rounded-lg p-4 text-sm prose dark:prose-invert max-w-none"
              >
                <PpContent />
              </div>
              <Button
                className="w-full"
                onClick={() => setStep('profile')}
                disabled={!ppScrolled}
              >
                {ppScrolled ? 'I Accept — Continue' : 'Scroll to read full policy'}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'profile' && (
          <Card>
            <CardHeader>
              <CardTitle>Set Up Your Profile</CardTitle>
              <CardDescription>Customize your username, display name, and avatar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-center">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                      {username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="absolute -bottom-1 -right-1 rounded-full"
                    onClick={() => {
                      const random = `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`;
                      setAvatarUrl(random);
                    }}
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Avatar URL (optional)</Label>
                <Input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.png"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <AtSign className="w-4 h-4" />
                  Username
                </Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="your.username"
                  maxLength={LIMITS.USERNAME}
                />
                <div className="flex items-center justify-between">
                  {!usernameValidation.valid && (
                    <p className="text-xs text-destructive">{usernameValidation.error}</p>
                  )}
                  <CharCounter current={username.length} max={LIMITS.USERNAME} className="ml-auto" />
                </div>
                <p className="text-xs text-muted-foreground">Letters, numbers, periods, and underscores only.</p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Display Name
                </Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your Name"
                  maxLength={LIMITS.DISPLAY_NAME}
                />
                <div className="flex items-center justify-between">
                  {!displayNameValidation.valid && (
                    <p className="text-xs text-destructive">{displayNameValidation.error}</p>
                  )}
                  <CharCounter current={displayName.length} max={LIMITS.DISPLAY_NAME} className="ml-auto" />
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleComplete}
                disabled={!usernameValidation.valid || !displayNameValidation.valid || updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? 'Saving...' : 'Complete Setup'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
