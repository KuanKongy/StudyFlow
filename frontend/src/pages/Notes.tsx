import { Link } from 'react-router-dom';
import { FileText, Plus, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useStudy } from '@/contexts/StudyContext';
import { useAuth } from '@/contexts/AuthContext';
import { EmptyState } from '@/components/EmptyState';

export default function Notes() {
  const { user } = useAuth();
  const { getMyNotes, getTopicById } = useStudy();

  const myNotes = user ? getMyNotes(user.id) : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Notes</h1>
          <p className="text-muted-foreground mt-1">All your notes in one place</p>
        </div>
        <Link to="/app/notes/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Note
          </Button>
        </Link>
      </div>

      {myNotes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No notes yet"
          description="Create your first note to start studying"
          action={
            <Link to="/app/notes/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Note
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {myNotes.map((note) => {
            const topic = note.topicId ? getTopicById(note.topicId) : null;
            return (
              <Link key={note.id} to={`/app/materials/${note.id}/note`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{note.title}</CardTitle>
                        {topic && (
                          <CardDescription className="truncate">
                            In: {topic.title}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
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
