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
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

  if (matLoading || cardsLoading) {
    return <div className="p-6 text-muted-foreground">Loading flashcards...</div>;
  }

  if (!material || material.type !== 'flashcard_set') {
    return <Navigate to="/app/flashcards" replace />;
  }

  const topic = material.topicId ? topics.find((t) => t.id === material.topicId) : null;
  const group = topic?.groupIds?.[0] ? groups.find((g) => g.id === topic.groupIds[0]) : null;

  const currentCard = flashcards[currentIndex];
  const progress = flashcards.length > 0 ? ((currentIndex + 1) / flashcards.length) * 100 : 0;

  const goNext = () => {
    if (currentIndex < flashcards.length - 1) {
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
    setCurrentIndex(Math.floor(Math.random() * flashcards.length));
    setIsFlipped(false);
  };

  const reset = () => {
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

  const handleDelete = async (cardId: string) => {
    try {
      await deleteFlashcardMutation.mutateAsync(cardId);
      toast.success('Flashcard deleted!');
    } catch {
      toast.error('Failed to delete flashcard');
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to={material.topicId ? `/app/topics/${material.topicId}` : '/app/flashcards'}>
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{material.title}</h1>
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

        <div className="flex items-center gap-2">
          <Button variant={mode === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setMode('list')}>
            <List className="w-4 h-4 mr-1" />List
          </Button>
          <Button variant={mode === 'study' ? 'secondary' : 'ghost'} size="sm" onClick={() => setMode('study')}>
            <Play className="w-4 h-4 mr-1" />Study
          </Button>
        </div>
      </div>

      {mode === 'list' ? (
        <div className="space-y-3">
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
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => handleStartEdit(card.id, card.question, card.answer)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(card.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          {flashcards.length === 0 ? (
            <Card className="p-8 text-center">
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
                    <CardContent className="h-full flex flex-col items-center justify-center p-8 text-center">
                      <p className="text-xs text-muted-foreground mb-4">Question</p>
                      <p className="text-lg font-medium">{currentCard?.question}</p>
                      <p className="text-xs text-primary mt-6">Click to flip</p>
                    </CardContent>
                  </Card>
                  <Card className="absolute inset-0 flashcard-back backface-hidden bg-success/5 border-success/20">
                    <CardContent className="h-full flex flex-col items-center justify-center p-8 text-center">
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
    </div>
  );
}
