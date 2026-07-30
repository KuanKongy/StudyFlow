import { useState, useEffect } from 'react';
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Sparkles, Layers, CheckCircle, ChevronDown, Eye, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useStudy } from '@/contexts/StudyContext';
import { useAuth } from '@/contexts/AuthContext';
import { MaterialBadge } from '@/components/MaterialBadge';
import { PrivacyBadge } from '@/components/PrivacyBadge';
import { EmptyState } from '@/components/EmptyState';
import {
  useMaterial,
  useNote,
  useUpdateNote,
  useGenerateSummary,
  useGenerateFlashcards,
  useTopics,
  useGroups,
} from '@/hooks/useApi';
import { toast } from 'sonner';
import { CharCounter } from '@/components/CharCounter';
import { LIMITS } from '@/lib/validation';

export default function NoteView() {
  const { materialId } = useParams<{ materialId: string }>();
  const navigate = useNavigate();
  const { aiDisclosureAccepted, setAiDisclosureAccepted } = useStudy();
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [isSaved, setIsSaved] = useState(true);
  const [showAiDisclosure, setShowAiDisclosure] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [pendingAiAction, setPendingAiAction] = useState<'summary' | 'flashcards' | null>(null);

  const { data: material, isLoading: materialLoading, isError: materialError } = useMaterial(materialId);
  const { data: note, isLoading: noteLoading, isError: noteError } = useNote(materialId);
  const updateNote = useUpdateNote();
  const generateSummary = useGenerateSummary();
  const generateFlashcards = useGenerateFlashcards();
  const { data: topics = [] } = useTopics();
  const { data: groups = [] } = useGroups();

  const topic = material?.topicId ? topics.find((t) => t.id === material.topicId) : null;
  const group = topic?.groupIds?.[0] ? groups.find((g) => g.id === topic.groupIds[0]) : null;
  const isOwner = !!material && material.ownerId === user?.id;
  const backTo = material?.topicId ? `/app/topics/${material.topicId}` : '/app/notes';

  useEffect(() => {
    if (note?.content !== undefined) {
      setContent(note.content);
      setIsSaved(true);
    }
  }, [note?.content]);

  // Warn before the tab closes or reloads with unsaved edits
  useEffect(() => {
    if (isSaved) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isSaved]);

  const handleContentChange = (value: string) => {
    setContent(value);
    setIsSaved(false);
  };

  const handleSave = async () => {
    if (!materialId || !material) return;
    try {
      await updateNote.mutateAsync({
        materialId,
        title: material.title,
        content,
      });
      setIsSaved(true);
      toast.success('Note saved!');
    } catch {
      toast.error('Failed to save note');
    }
  };

  const handleBack = () => {
    if (!isSaved && isOwner) {
      setShowLeaveConfirm(true);
      return;
    }
    navigate(backTo);
  };

  const handleSaveAndLeave = async () => {
    if (!materialId || !material) return;
    try {
      await updateNote.mutateAsync({ materialId, title: material.title, content });
      navigate(backTo);
    } catch {
      toast.error('Failed to save note — staying on this page');
      setShowLeaveConfirm(false);
    }
  };

  const runAiAction = async (action: 'summary' | 'flashcards') => {
    if (!materialId) return;
    const mutation = action === 'summary' ? generateSummary : generateFlashcards;
    try {
      await mutation.mutateAsync(materialId);
      toast.success(
        action === 'summary'
          ? 'Summary generation started! Track it under AI Jobs.'
          : 'Flashcard generation started! Track it under AI Jobs.'
      );
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 429) toast.error('AI rate limit reached — try again in an hour.');
      else if (status === 503) toast.error('AI is temporarily unavailable — try again shortly.');
      else toast.error(`Failed to start ${action} generation`);
    } finally {
      setPendingAiAction(null);
    }
  };

  const handleAiAction = (action: 'summary' | 'flashcards') => {
    if (!aiDisclosureAccepted) {
      setPendingAiAction(action);
      setShowAiDisclosure(true);
      return;
    }
    runAiAction(action);
  };

  const handleAiDisclosureAccept = () => {
    setAiDisclosureAccepted(true);
    setShowAiDisclosure(false);
    if (pendingAiAction) {
      runAiAction(pendingAiAction);
    }
  };

  const handleAiDisclosureCancel = () => {
    setShowAiDisclosure(false);
    setPendingAiAction(null);
  };

  const isGenerating = generateSummary.isPending || generateFlashcards.isPending;

  if (!materialId) {
    return <Navigate to="/app/topics" replace />;
  }

  if (materialLoading || noteLoading) {
    return (
      <div className="px-4 py-5 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-8 w-8 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-[500px] w-full rounded-lg" />
      </div>
    );
  }

  if (materialError || noteError || !material) {
    return (
      <div className="px-4 py-5 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
        <EmptyState
          icon={FileText}
          title="Note not found"
          description="This note may have been deleted, or you may not have access to it."
          action={
            <Link to="/app/notes">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Notes
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (material.type !== 'note') {
    return <Navigate to="/app/topics" replace />;
  }

  return (
    <div className="px-4 py-5 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in h-full flex flex-col">
      <AlertDialog open={showAiDisclosure} onOpenChange={(open) => !open && handleAiDisclosureCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>AI Processing Disclosure</AlertDialogTitle>
            <AlertDialogDescription>
              Your note content will be sent to OpenAI for processing. Data may transit through US-based servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleAiDisclosureCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAiDisclosureAccept}>I understand, continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved edits to this note. Save them before leaving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <Button variant="outline" onClick={() => navigate(backTo)}>
              Discard changes
            </Button>
            <AlertDialogAction onClick={handleSaveAndLeave} disabled={updateNote.isPending}>
              {updateNote.isPending ? 'Saving…' : 'Save & leave'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon-sm" onClick={handleBack} aria-label="Back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 break-words text-xl font-bold">{material.title}</h1>
              <MaterialBadge type="note" />
              {!isOwner && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground border rounded-full px-2 py-0.5">
                  <Eye className="w-3 h-3" />
                  Read-only
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {topic && (
                <>
                  <span className="text-sm text-muted-foreground">{topic.title}</span>
                  <span className="text-muted-foreground">•</span>
                  <PrivacyBadge privacy={topic.privacy} groupName={group?.name} />
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isGenerating}>
                <Sparkles className="w-4 h-4 mr-2" />
                AI Actions
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleAiAction('summary')} disabled={isGenerating}>
                <Sparkles className="w-4 h-4 mr-2" />
                {generateSummary.isPending ? 'Generating...' : 'Generate Summary'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAiAction('flashcards')} disabled={isGenerating}>
                <Layers className="w-4 h-4 mr-2" />
                {generateFlashcards.isPending ? 'Generating...' : 'Generate Flashcards'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {isOwner && (
            <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaved || updateNote.isPending}>
              {updateNote.isPending ? (
                'Saving…'
              ) : isSaved ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-1 text-success" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
          <Textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            className="flex-1 min-h-[500px] border-0 rounded-lg font-mono text-sm resize-none focus-visible:ring-0 overflow-auto"
            placeholder="Start writing..."
            maxLength={LIMITS.NOTE_CONTENT}
            readOnly={!isOwner}
            aria-label="Note content"
          />
          <div className="px-4 pb-2 flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {!isOwner
                ? 'Shared with you — only the owner can edit this note.'
                : isSaved
                  ? ''
                  : 'Unsaved changes'}
            </span>
            <CharCounter current={content.length} max={LIMITS.NOTE_CONTENT} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
