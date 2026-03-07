import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText, CheckSquare, Square, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useTopics, useGroups, useAllMaterials, useBatchDeleteTopics } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { EmptyState } from '@/components/EmptyState';
import { PrivacyBadge } from '@/components/PrivacyBadge';
import { MaterialBadge } from '@/components/MaterialBadge';
import { toast } from 'sonner';

type Filter = 'all' | 'mine' | 'shared';

export default function Topics() {
  const [filter, setFilter] = useState<Filter>('all');
  const { user } = useAuth();
  const { data: topics = [], isLoading: topicsLoading } = useTopics();
  const { data: groups = [], isLoading: groupsLoading } = useGroups();
  const { data: allMaterials = [], isLoading: materialsLoading } = useAllMaterials();
  const batchDelete = useBatchDeleteTopics();

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const getGroupById = (id: string) => groups.find((g) => g.id === id) ?? null;
  const getMaterialsByTopic = (topicId: string) => allMaterials.filter((m) => m.topicId === topicId);

  const isLoading = topicsLoading || groupsLoading || materialsLoading;

  const filteredTopics = topics.filter((t) => {
    if (filter === 'mine') return t.ownerId === user?.id;
    if (filter === 'shared') return t.groupIds?.length > 0 && t.ownerId !== user?.id;
    return true;
  });

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    try {
      await batchDelete.mutateAsync(Array.from(selected));
      toast.success(`Deleted ${selected.size} topic(s)`);
      setSelected(new Set());
      setSelectMode(false);
    } catch {
      toast.error('Failed to delete topics');
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Topics</h1>
          <p className="text-muted-foreground">Your private and group study topics</p>
        </div>
        <div className="flex gap-2">
          {!selectMode && filteredTopics.some((t) => t.ownerId === user?.id) && (
            <Button variant="outline" size="sm" onClick={() => setSelectMode(true)}>
              <CheckSquare className="w-4 h-4 mr-2" />Select
            </Button>
          )}
          <Link to="/app/topics/new">
            <Button><Plus className="w-4 h-4 mr-2" />New Topic</Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit mb-6">
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
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTopics.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-8 h-8" />}
          title={filter === 'shared' ? 'No shared topics' : filter === 'mine' ? 'No topics created by you' : 'No topics yet'}
          description={
            filter === 'shared' ? 'Join a group to see shared topics' :
            filter === 'mine' ? 'Create your first topic to start organizing your study materials.' :
            'Create your first topic to start organizing your study materials.'
          }
          action={filter !== 'shared' ? (
            <Link to="/app/topics/new"><Button><Plus className="w-4 h-4 mr-2" />Create Topic</Button></Link>
          ) : undefined}
        />
      ) : (
        <div className={selectMode ? 'space-y-3' : 'space-y-3'}>
          {filteredTopics.map((topic) => {
            const group = topic.groupIds?.[0] ? getGroupById(topic.groupIds[0]) : null;
            const materials = getMaterialsByTopic(topic.id);
            const isOwned = topic.ownerId === user?.id;
            const isSelected = selected.has(topic.id);

            if (selectMode) {
              return (
                <Card
                  key={topic.id}
                  className={`study-card cursor-pointer transition-colors ${isSelected ? 'ring-2 ring-primary' : ''} ${!isOwned ? 'opacity-50' : ''}`}
                  onClick={() => isOwned && toggleSelect(topic.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="p-2">
                        {isOwned ? (
                          isSelected ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <Square className="w-5 h-5 text-muted-foreground/30" />
                        )}
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{topic.title}</h3>
                          <PrivacyBadge privacy={topic.privacy} groupName={group?.name} />
                        </div>
                        {topic.description && <p className="text-sm text-muted-foreground truncate">{topic.description}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            return (
              <Link key={topic.id} to={`/app/topics/${topic.id}`} className="block">
                <Card className="study-card hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{topic.title}</h3>
                          <PrivacyBadge privacy={topic.privacy} groupName={group?.name} />
                        </div>
                        {topic.description && <p className="text-sm text-muted-foreground truncate">{topic.description}</p>}
                      </div>
                      <div className="hidden sm:flex items-center gap-2">
                        {materials.map((m) => <MaterialBadge key={m.id} type={m.type} />)}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(topic.createdAt).toLocaleDateString()}
                      </span>
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
                <AlertDialogTitle>Delete {selected.size} topic(s)?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the selected topics and all materials within them. This action cannot be undone.
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
