import { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Layers } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStudy } from '@/contexts/StudyContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface FlashcardDraft {
  question: string;
  answer: string;
}

export default function CreateFlashcardSet() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const topicIdFromUrl = searchParams.get('topicId');

  const { topics, createFlashcardSet, createFlashcard } = useStudy();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topicId, setTopicId] = useState(topicIdFromUrl || '');
  const [cards, setCards] = useState<FlashcardDraft[]>([
    { question: '', answer: '' },
  ]);

  const myTopics = topics.filter((t) => t.ownerId === user?.id);

  const addCard = () => {
    setCards([...cards, { question: '', answer: '' }]);
  };

  const removeCard = (index: number) => {
    if (cards.length === 1) {
      toast.error('You need at least one flashcard');
      return;
    }
    setCards(cards.filter((_, i) => i !== index));
  };

  const updateCard = (index: number, field: 'question' | 'answer', value: string) => {
    const updated = [...cards];
    updated[index][field] = value;
    setCards(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    // Filter out empty cards
    const validCards = cards.filter((c) => c.question.trim() && c.answer.trim());
    if (validCards.length === 0) {
      toast.error('Please add at least one flashcard with question and answer');
      return;
    }

    // Create the flashcard set
    const set = createFlashcardSet(title, topicId || undefined);

    // Create each flashcard
    validCards.forEach((card) => {
      createFlashcard(set.id, card.question, card.answer);
    });

    toast.success(`Created "${title}" with ${validCards.length} flashcards!`);
    navigate(`/app/materials/${set.id}/flashcards`);
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <Link to={topicIdFromUrl ? `/app/topics/${topicIdFromUrl}` : '/app'}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="w-6 h-6 text-study-flashcard" />
            Create Flashcard Set
          </h1>
          <p className="text-muted-foreground">Build your own flashcards</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Set Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Chapter 5 Vocabulary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What are these flashcards about?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic">Topic (optional)</Label>
              <Select value={topicId || "none"} onValueChange={(val) => setTopicId(val === "none" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a topic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No topic</SelectItem>
                  {myTopics.map((topic) => (
                    <SelectItem key={topic.id} value={topic.id}>
                      {topic.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Flashcards ({cards.length})</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addCard}>
              <Plus className="w-4 h-4 mr-1" />
              Add Card
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {cards.map((card, index) => (
              <div
                key={index}
                className="p-4 border rounded-lg space-y-3 bg-muted/30"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Card {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeCard(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Question</Label>
                  <Textarea
                    value={card.question}
                    onChange={(e) => updateCard(index, 'question', e.target.value)}
                    placeholder="Enter the question..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Answer</Label>
                  <Textarea
                    value={card.answer}
                    onChange={(e) => updateCard(index, 'answer', e.target.value)}
                    placeholder="Enter the answer..."
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit">Create Flashcard Set</Button>
          <Link to={topicIdFromUrl ? `/app/topics/${topicIdFromUrl}` : '/app'}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
