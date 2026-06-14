import { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Save, Sparkles, Layers, CheckCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
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
import { MaterialBadge } from '@/components/MaterialBadge';
import { PrivacyBadge } from '@/components/PrivacyBadge';
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
  const { aiDisclosureAccepted, setAiDisclosureAccepted } = useStudy();
  const [content, setContent] = useState('');
  const [isSaved, setIsSaved] = useState(true);
  const [showAiDisclosure, setShowAiDisclosure] = useState(false);
  const [pendingAiAction, setPendingAiAction] = useState<'summary' | 'flashcards' | null>(null);

  const { data: material } = useMaterial(materialId);
  const { data: note } = useNote(materialId);
  const updateNote = useUpdateNote();
  const generateSummary = useGenerateSummary();
  const generateFlashcards = useGenerateFlashcards();
  const { data: topics = [] } = useTopics();
  const { data: groups = [] } = useGroups();

  const topic = material?.topicId ? topics.find((t) => t.id === material.topicId) : null;
  const group = topic?.groupIds?.[0] ? groups.find((g) => g.id === topic.groupIds[0]) : null;

  useEffect(() => {
    if (note?.content !== undefined) {
      setContent(note.content);
    }
  }, [note?.content]);

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
    } catch (err) {
      toast.error('Failed to save note');
    }
  };

  const runAiAction = async (action: 'summary' | 'flashcards') => {
    if (!materialId) return;
    const mutation = action === 'summary' ? generateSummary : generateFlashcards;
    try {
      await mutation.mutateAsync(materialId);
      toast.success(action === 'summary' ? 'Summary generation started!' : 'Flashcard generation started!');
    } catch (err) {
      toast.error(`Failed to start ${action} generation`);
    } finally {
      setPendingAiAction(null);
    }
  };

  const handleGenerateSummary = () => {
    if (!aiDisclosureAccepted) {
      setPendingAiAction('summary');
      setShowAiDisclosure(true);
      return;
    }
    runAiAction('summary');
  };

  const handleGenerateFlashcards = () => {
    if (!aiDisclosureAccepted) {
      setPendingAiAction('flashcards');
      setShowAiDisclosure(true);
      return;
    }
    runAiAction('flashcards');
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

  if (!material) {
    return null;
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link to={material.topicId ? `/app/topics/${material.topicId}` : '/app'}>
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 break-words text-xl font-bold">{material.title}</h1>
              <MaterialBadge type="note" />
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
              <DropdownMenuItem onClick={handleGenerateSummary} disabled={isGenerating}>
                <Sparkles className="w-4 h-4 mr-2" />
                {generateSummary.isPending ? 'Generating...' : 'Generate Summary'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleGenerateFlashcards} disabled={isGenerating}>
                <Layers className="w-4 h-4 mr-2" />
                {generateFlashcards.isPending ? 'Generating...' : 'Generate Flashcards'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaved || updateNote.isPending}>
            {isSaved ? (
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
          />
          <div className="px-4 pb-2 flex justify-end">
            <CharCounter current={content.length} max={LIMITS.NOTE_CONTENT} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
