import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Plus, Calendar, Users, Trash2, CheckSquare, Square, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAllMaterials, useTopics, useBatchDeleteMaterials } from '@/hooks/useApi';
import { EmptyState } from '@/components/EmptyState';
import { toast } from 'sonner';

type Filter = 'all' | 'mine' | 'shared';

export default function Flashcards() {
  const [filter, setFilter] = useState<Filter>('all');
  const { data: materials = [], isLoading } = useAllMaterials(filter);
  const { data: topics = [] } = useTopics();
  const batchDelete = useBatchDeleteMaterials();

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const flashcardSets = materials.filter((m) => m.type === 'flashcard_set');

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    try {
      await batchDelete.mutateAsync(Array.from(selected));
      toast.success(`Deleted ${selected.size} flashcard set(s)`);
      setSelected(new Set());
      setSelectMode(false);
    } catch {
      toast.error('Failed to delete flashcard sets');
    }
  };

  const exitSelectMode = () => { setSelectMode(false); setSelected(new Set()); };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Flashcard Sets</h1>
          <p className="text-muted-foreground mt-1">All your flashcard sets for studying</p>
        </div>
        <div className="flex gap-2">
          {!selectMode && flashcardSets.some((s) => s.isOwner !== false) && (
            <Button variant="outline" size="sm" onClick={() => setSelectMode(true)}>
              <CheckSquare className="w-4 h-4 mr-2" />Select
            </Button>
          )}
          <Link to="/app/flashcards/new">
            <Button><Plus className="w-4 h-4 mr-2" />New Flashcard Set</Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {(['all', 'mine', 'shared'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === f ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {f === 'all' ? 'All' : f === 'mine' ? 'Mine' : 'Shared'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : flashcardSets.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={filter === 'shared' ? 'No shared flashcard sets' : 'No flashcard sets yet'}
          description={filter === 'shared' ? 'Join a group to see shared flashcard sets' : 'Create your first flashcard set to start studying'}
          action={filter !== 'shared' ? (
            <Link to="/app/flashcards/new"><Button><Plus className="w-4 h-4 mr-2" />Create Flashcard Set</Button></Link>
          ) : undefined}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {flashcardSets.map((set) => {
            const topic = set.topicId ? topics.find((t) => t.id === set.topicId) : null;
            const isOwned = set.isOwner !== false;
            const isSelected = selected.has(set.id);

            if (selectMode) {
              return (
                <Card
                  key={set.id}
                  className={`cursor-pointer transition-shadow h-full ${isSelected ? 'ring-2 ring-primary' : ''} ${!isOwned ? 'opacity-50' : ''}`}
                  onClick={() => isOwned && toggleSelect(set.id)}
                >
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="p-2">
                        {isOwned ? (
                          isSelected ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <Square className="w-5 h-5 text-muted-foreground/30" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{set.title}</CardTitle>
                        {topic && <CardDescription className="truncate">In: {topic.title}</CardDescription>}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            }

            return (
              <Link key={set.id} to={`/app/materials/${set.id}/flashcards`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-study-flashcard/10">
                        <Layers className="w-5 h-5 text-study-flashcard" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg truncate">{set.title}</CardTitle>
                          {set.isOwner === false && (
                            <Badge variant="secondary" className="shrink-0 gap-1 text-xs">
                              <Users className="w-3 h-3" />Shared
                            </Badge>
                          )}
                        </div>
                        {topic && <CardDescription className="truncate">In: {topic.title}</CardDescription>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
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

      {selectMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-background border shadow-lg rounded-lg px-4 py-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={selected.size === 0 || batchDelete.isPending}>
                <Trash2 className="w-4 h-4 mr-2" />
                {batchDelete.isPending ? 'Deleting...' : `Delete ${selected.size}`}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selected.size} flashcard set(s)?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the selected flashcard sets and all their cards. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleBatchDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button variant="ghost" size="sm" onClick={exitSelectMode}>
            <X className="w-4 h-4 mr-1" />Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
