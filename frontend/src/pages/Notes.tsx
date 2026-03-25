import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, Calendar, Users, Trash2, CheckSquare, Square, X } from 'lucide-react';
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

export default function Notes() {
  const [filter, setFilter] = useState<Filter>('all');
  const { data: materials = [], isLoading } = useAllMaterials(filter);
  const { data: topics = [] } = useTopics();
  const batchDelete = useBatchDeleteMaterials();

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const notes = materials.filter((m) => m.type === 'note');

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    try {
      await batchDelete.mutateAsync(Array.from(selected));
      toast.success(`Deleted ${selected.size} note(s)`);
      setSelected(new Set());
      setSelectMode(false);
    } catch {
      toast.error('Failed to delete notes');
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notes</h1>
          <p className="text-muted-foreground mt-1">All your notes in one place</p>
        </div>
        <div className="flex gap-2">
          {!selectMode && notes.some((n) => n.isOwner !== false) && (
            <Button variant="outline" size="sm" onClick={() => setSelectMode(true)}>
              <CheckSquare className="w-4 h-4 mr-2" />Select
            </Button>
          )}
          <Link to="/app/notes/new">
            <Button><Plus className="w-4 h-4 mr-2" />New Note</Button>
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader><div className="h-4 bg-muted rounded w-3/4" /></CardHeader>
              <CardContent><div className="h-3 bg-muted rounded w-1/4" /></CardContent>
            </Card>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={filter === 'shared' ? 'No shared notes' : 'No notes yet'}
          description={filter === 'shared' ? 'Join a group to see shared notes' : 'Create your first note to start studying'}
          action={filter !== 'shared' ? (
            <Link to="/app/notes/new"><Button><Plus className="w-4 h-4 mr-2" />Create Note</Button></Link>
          ) : undefined}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => {
            const topic = note.topicId ? topics.find((t) => t.id === note.topicId) : null;
            const isOwned = note.isOwner !== false;
            const isSelected = selected.has(note.id);

            if (selectMode) {
              return (
                <Card
                  key={note.id}
                  className={`cursor-pointer transition-shadow h-full ${isSelected ? 'ring-2 ring-primary' : ''} ${!isOwned ? 'opacity-50' : ''}`}
                  onClick={() => isOwned && toggleSelect(note.id)}
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
                        <CardTitle className="text-lg truncate">{note.title}</CardTitle>
                        {topic && <CardDescription className="truncate">In: {topic.title}</CardDescription>}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            }

            return (
              <Link key={note.id} to={`/app/materials/${note.id}/note`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg truncate">{note.title}</CardTitle>
                          {note.isOwner === false && (
                            <Badge variant="secondary" className="shrink-0 gap-1 text-xs">
                              <Users className="w-3 h-3" />Shared
                            </Badge>
                          )}
                        </div>
                        {topic && <CardDescription className="truncate">In: {topic.title}</CardDescription>}
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

      {selectMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-background border shadow-lg rounded-lg px-4 py-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={selected.size === 0 || batchDelete.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {batchDelete.isPending ? 'Deleting...' : `Delete ${selected.size}`}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selected.size} note(s)?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the selected notes. This action cannot be undone.
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
