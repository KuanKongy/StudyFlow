import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Layers, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTopics, useCreateFlashcardSet } from '@/hooks/useApi';
import { toast } from 'sonner';
import { CharCounter } from '@/components/CharCounter';
import { LIMITS } from '@/lib/validation';

interface CardDraft {
  id: number;
  question: string;
  answer: string;
}

let nextId = 1;

export default function CreateFlashcardSet() {
  const navigate = useNavigate();
  const { data: topics = [] } = useTopics();
  const createSetMutation = useCreateFlashcardSet();
  const [title, setTitle] = useState('');
  const [topicId, setTopicId] = useState('');
  const [cards, setCards] = useState<CardDraft[]>([
    { id: nextId++, question: '', answer: '' },
  ]);

  const addCard = () => {
    setCards([...cards, { id: nextId++, question: '', answer: '' }]);
  };

  const removeCard = (id: number) => {
    if (cards.length <= 1) return;
    setCards(cards.filter((c) => c.id !== id));
  };

  const updateCard = (id: number, field: 'question' | 'answer', value: string) => {
    setCards(cards.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('Please enter a title'); return; }
    if (!topicId) { toast.error('Please select a topic'); return; }
    const validCards = cards.filter((c) => c.question.trim() && c.answer.trim());
    if (validCards.length === 0) { toast.error('Add at least one flashcard with question and answer'); return; }

    try {
      const result = await createSetMutation.mutateAsync({
        title: title.trim(),
        topicId,
        cards: validCards.map((c) => ({ question: c.question.trim(), answer: c.answer.trim() })),
      });
      toast.success('Flashcard set created!');
      navigate(`/app/materials/${result.materialId}/flashcards`);
    } catch {
      toast.error('Failed to create flashcard set');
    }
  };

  return (
    <div className="px-4 py-5 sm:p-6 lg:p-8 max-w-3xl mx-auto animate-fade-in">
      <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4 mr-2" />Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-study-flashcard" />
            Create Flashcard Set
          </CardTitle>
          <CardDescription>
            Create flashcards manually, or use AI generation from a note.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" placeholder="e.g., Biology Chapter 5 Vocab" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={LIMITS.FLASHCARD_SET_TITLE} autoFocus />
              <CharCounter current={title.length} max={LIMITS.FLASHCARD_SET_TITLE} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic">Topic *</Label>
              <Select value={topicId} onValueChange={setTopicId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a topic" />
                </SelectTrigger>
                <SelectContent>
                  {topics.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Flashcards ({cards.length})</Label>
                <Button type="button" variant="outline" size="sm" onClick={addCard}>
                  <Plus className="w-4 h-4 mr-1" />Add Card
                </Button>
              </div>

              {cards.map((card, idx) => (
                <div key={card.id} className="rounded-lg border p-4 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Card {idx + 1}</span>
                    {cards.length > 1 && (
                      <Button type="button" variant="ghost" size="icon-sm" className="text-destructive" onClick={() => removeCard(card.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <Input placeholder="Question" value={card.question} onChange={(e) => updateCard(card.id, 'question', e.target.value)} maxLength={LIMITS.FLASHCARD_QUESTION} />
                  <CharCounter current={card.question.length} max={LIMITS.FLASHCARD_QUESTION} />
                  <Textarea placeholder="Answer" rows={2} value={card.answer} onChange={(e) => updateCard(card.id, 'answer', e.target.value)} maxLength={LIMITS.FLASHCARD_ANSWER} />
                  <CharCounter current={card.answer.length} max={LIMITS.FLASHCARD_ANSWER} />
                </div>
              ))}
            </div>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={createSetMutation.isPending} className="flex-1">
                {createSetMutation.isPending ? 'Creating...' : 'Create Flashcard Set'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
