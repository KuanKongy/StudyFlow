import { useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Shuffle,
  List,
  Play,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useAuth } from '@/contexts/AuthContext';
import {
  useMaterial,
  useFlashcardSet,
  useFlashcards,
  useTopics,
  useGroups,
  useCreateFlashcard,
  useUpdateFlashcard,
  useDeleteFlashcard,
} from '@/hooks/useApi';
import { MaterialBadge } from '@/components/MaterialBadge';
import { PrivacyBadge } from '@/components/PrivacyBadge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CharCounter } from '@/components/CharCounter';
import { LIMITS } from '@/lib/validation';

type ViewMode = 'list' | 'study';

export default function FlashcardsView() {
  const { materialId } = useParams<{ materialId: string }>();
  const { user } = useAuth();
  const { data: material, isLoading: matLoading } = useMaterial(materialId);
  const { data: flashcardSet } = useFlashcardSet(materialId);
  const { data: flashcards = [], isLoading: cardsLoading } = useFlashcards(flashcardSet?.id);
  const { data: topics = [] } = useTopics();
  const { data: groups = [] } = useGroups();
  const createFlashcardMutation = useCreateFlashcard();
  const updateFlashcardMutation = useUpdateFlashcard();
  const deleteFlashcardMutation = useDeleteFlashcard();

  const [mode, setMode] = useState<ViewMode>('list');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  // Study-mode traversal order; null = natural order
  const [order, setOrder] = useState<number[] | null>(null);

  if (matLoading || cardsLoading) {
    return (
      <div className="px-4 py-5 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-8 w-8 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!material || material.type !== 'flashcard_set') {
    return <Navigate to="/app/flashcards" replace />;
  }

  const topic = material.topicId ? topics.find((t) => t.id === material.topicId) : null;
  const group = topic?.groupIds?.[0] ? groups.find((g) => g.id === topic.groupIds[0]) : null;
  const isOwner = material.ownerId === user?.id;

  // Traverse in shuffled order when one is set (and still valid for this deck)
  const orderedCards =
    order && order.length === flashcards.length ? order.map((i) => flashcards[i]) : flashcards;
  const currentCard = orderedCards[currentIndex];
  const progress = flashcards.length > 0 ? ((currentIndex + 1) / flashcards.length) * 100 : 0;

  const goNext = () => {
    if (currentIndex < orderedCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const shuffle = () => {
    const indices = flashcards.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    setOrder(indices);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const reset = () => {
    setOrder(null);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const toggleExpand = (cardId: string) => {
    const next = new Set(expandedCards);
    if (next.has(cardId)) next.delete(cardId);
    else next.add(cardId);
    setExpandedCards(next);
  };

  const handleAddFlashcard = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      toast.error('Please enter both question and answer');
      return;
    }
    if (!flashcardSet) {
      toast.error('Flashcard set not loaded');
      return;
    }
    try {
      await createFlashcardMutation.mutateAsync({
        setId: flashcardSet.id,
        question: newQuestion.trim(),
        answer: newAnswer.trim(),
      });
      setNewQuestion('');
      setNewAnswer('');
      setShowAddForm(false);
      toast.success('Flashcard added!');
    } catch {
      toast.error('Failed to add flashcard');
    }
  };

  const handleStartEdit = (cardId: string, question: string, answer: string) => {
    setEditingCard(cardId);
    setEditQuestion(question);
    setEditAnswer(answer);
  };

  const handleSaveEdit = async (cardId: string) => {
    if (!editQuestion.trim() || !editAnswer.trim()) {
      toast.error('Please enter both question and answer');
      return;
    }
    try {
      await updateFlashcardMutation.mutateAsync({
        cardId,
        updates: { question: editQuestion.trim(), answer: editAnswer.trim() },
      });
      setEditingCard(null);
      toast.success('Flashcard updated!');
    } catch {
      toast.error('Failed to update flashcard');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteFlashcardMutation.mutateAsync(deleteTarget);
      toast.success('Flashcard deleted!');
    } catch {
      toast.error('Failed to delete flashcard');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="px-4 py-5 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link to={material.topicId ? `/app/topics/${material.topicId}` : '/app/flashcards'}>
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 break-words text-xl font-bold">{material.title}</h1>
              <MaterialBadge type="flashcard_set" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              {topic && (
                <>
                  <span className="text-sm text-muted-foreground">{topic.title}</span>
                  <span className="text-muted-foreground">·</span>
                  <PrivacyBadge privacy={topic.privacy} groupName={group?.name} />
                </>
              )}
            </div>
          </div>
        </div>

        <SegmentedControl
          value={mode}
          onValueChange={setMode}
          options={[
            { value: 'list', label: 'List', icon: List },
            { value: 'study', label: 'Study', icon: Play },
          ]}
        />
      </div>

      {mode === 'list' ? (
        <div className="space-y-3">
          {!isOwner && (
            <p className="text-sm text-muted-foreground">
              Shared with you — only the owner can add, edit, or delete cards.
            </p>
          )}
          {isOwner && (
          <Card className="border-dashed">
            <CardContent className="p-4">
              {showAddForm ? (
                <div className="space-y-3">
                  <Input placeholder="Question" value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} maxLength={LIMITS.FLASHCARD_QUESTION} autoFocus />
                  <CharCounter current={newQuestion.length} max={LIMITS.FLASHCARD_QUESTION} />
                  <Textarea placeholder="Answer" value={newAnswer} onChange={(e) => setNewAnswer(e.target.value)} rows={3} maxLength={LIMITS.FLASHCARD_ANSWER} />
                  <CharCounter current={newAnswer.length} max={LIMITS.FLASHCARD_ANSWER} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddFlashcard} disabled={createFlashcardMutation.isPending}>
                      <Check className="w-4 h-4 mr-1" />{createFlashcardMutation.isPending ? 'Adding...' : 'Add'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
                      <X className="w-4 h-4 mr-1" />Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="ghost" className="w-full justify-center text-muted-foreground" onClick={() => setShowAddForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />Add New Flashcard
                </Button>
              )}
            </CardContent>
          </Card>
          )}

          {flashcards.map((card, index) => (
            <Card key={card.id}>
              <CardContent className="p-4">
                {editingCard === card.id ? (
                  <div className="space-y-3">
                    <Input placeholder="Question" value={editQuestion} onChange={(e) => setEditQuestion(e.target.value)} maxLength={LIMITS.FLASHCARD_QUESTION} />
                    <CharCounter current={editQuestion.length} max={LIMITS.FLASHCARD_QUESTION} />
                    <Textarea placeholder="Answer" value={editAnswer} onChange={(e) => setEditAnswer(e.target.value)} rows={3} maxLength={LIMITS.FLASHCARD_ANSWER} />
                    <CharCounter current={editAnswer.length} max={LIMITS.FLASHCARD_ANSWER} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSaveEdit(card.id)}>
                        <Check className="w-4 h-4 mr-1" />Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingCard(null)}>
                        <X className="w-4 h-4 mr-1" />Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-medium text-muted-foreground w-6">{index + 1}.</span>
                    <div className="flex-1 cursor-pointer" onClick={() => toggleExpand(card.id)}>
                      <p className="font-medium mb-2">{card.question}</p>
                      <div className={cn('overflow-hidden transition-all duration-300', expandedCards.has(card.id) ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0')}>
                        <div className="pt-3 border-t text-muted-foreground">{card.answer}</div>
                      </div>
                      {!expandedCards.has(card.id) && <p className="text-xs text-primary mt-2">Click to reveal answer</p>}
                    </div>
                    {isOwner && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon-sm" aria-label="Edit flashcard" onClick={() => handleStartEdit(card.id, card.question, card.answer)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label="Delete flashcard" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(card.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          {flashcards.length === 0 ? (
            <Card className="p-4 text-center sm:p-8">
              <p className="text-muted-foreground">No flashcards yet. Add some in List mode!</p>
            </Card>
          ) : (
            <>
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Card {currentIndex + 1} of {flashcards.length}</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="perspective-1000 cursor-pointer mb-6" onClick={() => setIsFlipped(!isFlipped)}>
                <div className={cn('relative w-full aspect-[3/2] flashcard-flip', isFlipped && 'flipped')}>
                  <Card className="absolute inset-0 flashcard-front backface-hidden">
                    <CardContent className="h-full flex flex-col items-center justify-center p-5 text-center sm:p-8">
                      <p className="text-xs text-muted-foreground mb-4">Question</p>
                      <p className="text-lg font-medium">{currentCard?.question}</p>
                      <p className="text-xs text-primary mt-6">Click to flip</p>
                    </CardContent>
                  </Card>
                  <Card className="absolute inset-0 flashcard-back backface-hidden bg-success/5 border-success/20">
                    <CardContent className="h-full flex flex-col items-center justify-center p-5 text-center sm:p-8">
                      <p className="text-xs text-muted-foreground mb-4">Answer</p>
                      <p className="text-lg">{currentCard?.answer}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" size="icon" onClick={goPrev} disabled={currentIndex === 0}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button variant="outline" size="icon" onClick={reset}>
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={shuffle}>
                  <Shuffle className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={goNext} disabled={currentIndex === flashcards.length - 1}>
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this flashcard?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
