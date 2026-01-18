import { Link } from 'react-router-dom';
import { Layers, Plus, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useStudy } from '@/contexts/StudyContext';
import { useAuth } from '@/contexts/AuthContext';
import { EmptyState } from '@/components/EmptyState';

export default function Flashcards() {
  const { user } = useAuth();
  const { getMyFlashcardSets, getTopicById, getFlashcardsBySet } = useStudy();

  const myFlashcardSets = user ? getMyFlashcardSets(user.id) : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Flashcard Sets</h1>
          <p className="text-muted-foreground mt-1">All your flashcard sets for studying</p>
        </div>
        <Link to="/app/flashcards/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Flashcard Set
          </Button>
        </Link>
      </div>

      {myFlashcardSets.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No flashcard sets yet"
          description="Create your first flashcard set to start studying"
          action={
            <Link to="/app/flashcards/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Flashcard Set
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {myFlashcardSets.map((set) => {
            const topic = set.topicId ? getTopicById(set.topicId) : null;
            const cardCount = getFlashcardsBySet(set.id).length;
            return (
              <Link key={set.id} to={`/app/materials/${set.id}/flashcards`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-accent/10">
                        <Layers className="w-5 h-5 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{set.title}</CardTitle>
                        {topic && (
                          <CardDescription className="truncate">
                            In: {topic.title}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm font-medium">
                      {cardCount} {cardCount === 1 ? 'card' : 'cards'}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(set.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
