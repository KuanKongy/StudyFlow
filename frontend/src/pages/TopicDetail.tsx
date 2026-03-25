import { useState, useEffect } from 'react';
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';
import { Plus, FileText, FileCheck, Layers, Settings, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useStudy } from '@/contexts/StudyContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  useTopics, useGroups, useTopicMaterials, useUpdateTopic, useDeleteTopic, useDeleteMaterial,
} from '@/hooks/useApi';
import { EmptyState } from '@/components/EmptyState';
import { PrivacyBadge } from '@/components/PrivacyBadge';
import { MaterialBadge } from '@/components/MaterialBadge';
import { CharCounter } from '@/components/CharCounter';
import { LIMITS } from '@/lib/validation';
import { toast } from 'sonner';

export default function TopicDetail() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const { setSelectedGroupId } = useStudy();
  const { user } = useAuth();
  const { data: topics = [], isLoading: topicsLoading } = useTopics();
  const { data: groups = [], isLoading: groupsLoading } = useGroups();
  const { data: materials = [], isLoading: materialsLoading } = useTopicMaterials(topicId ?? undefined);
  const updateTopicMutation = useUpdateTopic();
  const deleteTopicMutation = useDeleteTopic();
  const deleteMaterialMutation = useDeleteMaterial();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedGroupToAdd, setSelectedGroupToAdd] = useState('');

  const topic = topicId ? topics.find((t) => t.id === topicId) : null;
  const getGroupById = (id: string) => groups.find((g) => g.id === id) ?? null;
  const isLoading = topicsLoading || groupsLoading;

  useEffect(() => {
    if (topic?.groupIds?.[0]) {
      setSelectedGroupId(topic.groupIds[0]);
    }
  }, [topic?.groupIds, setSelectedGroupId]);

  if (!topicsLoading && !topic && topicId) {
    return <Navigate to="/app/topics" replace />;
  }

  if (isLoading || !topic) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto animate-fade-in">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader><div className="h-4 bg-muted rounded w-24" /></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="h-12 bg-muted rounded" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const group = topic.groupIds?.[0] ? getGroupById(topic.groupIds[0]) : null;
  const isOwner = topic.ownerId === user?.id;

  const notes = materials.filter((m) => m.type === 'note');
  const summaries = materials.filter((m) => m.type === 'summary');
  const flashcardSets = materials.filter((m) => m.type === 'flashcard_set');

  const availableGroups = groups.filter(
    (g) => g.memberIds.includes(user?.id || '') && (!topic.groupIds || !topic.groupIds.includes(g.id))
  );

  const handleSaveSettings = async () => {
    const updates: Record<string, any> = {};
    if (newTitle.trim() && newTitle.trim() !== topic.title) updates.title = newTitle.trim();
    if (newDescription !== (topic.description || '')) updates.description = newDescription;
    if (Object.keys(updates).length === 0) {
      setSettingsOpen(false);
      return;
    }
    try {
      await updateTopicMutation.mutateAsync({ topicId: topic.id, updates });
      toast.success('Topic updated!');
      setSettingsOpen(false);
    } catch {
      toast.error('Failed to update topic');
    }
  };

  const handleDeleteTopic = async () => {
    try {
      await deleteTopicMutation.mutateAsync(topic.id);
      toast.success('Topic and all materials deleted');
      navigate('/app/topics');
    } catch {
      toast.error('Failed to delete topic');
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    try {
      await deleteMaterialMutation.mutateAsync(materialId);
      toast.success('Material deleted');
    } catch {
      toast.error('Failed to delete material');
    }
  };

  const handleAddToGroup = async () => {
    if (!selectedGroupToAdd) {
      toast.error('Please select a group');
      return;
    }
    try {
      const newGroupIds = [...(topic.groupIds || []), selectedGroupToAdd];
      await updateTopicMutation.mutateAsync({
        topicId: topic.id,
        updates: { groupIds: newGroupIds },
      });
      setSelectedGroupToAdd('');
      toast.success('Topic added to group!');
    } catch {
      toast.error('Failed to add topic to group');
    }
  };

  const handleRemoveFromGroup = async (groupId: string) => {
    try {
      const newGroupIds = (topic.groupIds || []).filter((id) => id !== groupId);
      await updateTopicMutation.mutateAsync({
        topicId: topic.id,
        updates: { groupIds: newGroupIds },
      });
      toast.success('Topic removed from group');
    } catch {
      toast.error('Failed to remove topic from group');
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{topic.title}</h1>
            <PrivacyBadge privacy={topic.privacy} groupName={group?.name} />
          </div>
          {topic.description && <p className="text-muted-foreground">{topic.description}</p>}
          {topic.groupIds && topic.groupIds.length > 0 && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {topic.groupIds.map((gId) => {
                const g = getGroupById(gId);
                return g ? (
                  <Link key={gId} to={`/app/groups/${gId}`}>
                    <Badge variant="outline" className="gap-1 hover:bg-secondary/80">{g.name}</Badge>
                  </Link>
                ) : null;
              })}
            </div>
          )}
        </div>
        {isOwner && (
          <Dialog
            open={settingsOpen}
            onOpenChange={(open) => {
              setSettingsOpen(open);
              if (open) {
                setNewTitle(topic.title);
                setNewDescription(topic.description || '');
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />Settings
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Topic Settings</DialogTitle>
                <DialogDescription>Update title, description, groups, or delete this topic.</DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value.slice(0, LIMITS.TOPIC_TITLE))}
                    maxLength={LIMITS.TOPIC_TITLE}
                    placeholder="Enter topic name"
                  />
                  <CharCounter current={newTitle.length} max={LIMITS.TOPIC_TITLE} />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value.slice(0, LIMITS.TOPIC_DESCRIPTION))}
                    rows={3}
                    maxLength={LIMITS.TOPIC_DESCRIPTION}
                    placeholder="What is this topic about?"
                  />
                  <CharCounter current={newDescription.length} max={LIMITS.TOPIC_DESCRIPTION} />
                </div>

                <Button onClick={handleSaveSettings} className="w-full">Save Changes</Button>

                {/* Group Management */}
                <div className="space-y-2">
                  <Label>Current Groups</Label>
                  {topic.groupIds && topic.groupIds.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {topic.groupIds.map((gId) => {
                        const g = getGroupById(gId);
                        return g ? (
                          <Badge key={gId} variant="secondary" className="gap-1 pr-1">
                            {g.name}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 ml-1 hover:bg-destructive/20"
                              onClick={() => handleRemoveFromGroup(gId)}
                              disabled={updateTopicMutation.isPending}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not in any groups</p>
                  )}
                </div>

                {availableGroups.length > 0 && (
                  <div className="space-y-2">
                    <Label>Add to Group</Label>
                    <div className="flex gap-2">
                      <Select value={selectedGroupToAdd} onValueChange={setSelectedGroupToAdd}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select a group" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableGroups.map((g) => (
                            <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={handleAddToGroup} disabled={!selectedGroupToAdd || updateTopicMutation.isPending}>
                        Add
                      </Button>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full">
                        <Trash2 className="w-4 h-4 mr-2" />Delete Topic
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Topic?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this topic and ALL materials inside it, including materials created by others. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteTopic}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >Delete Everything</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* 3-Column Material Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notes Column */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-study-note" />
              Notes
            </CardTitle>
            <Link to={`/app/notes/new?topicId=${topic.id}`}>
              <Button variant="ghost" size="icon-sm"><Plus className="w-4 h-4" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            {materialsLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="h-14 bg-muted rounded animate-pulse" />)}
              </div>
            ) : notes.length === 0 ? (
              <EmptyState
                icon={<FileText className="w-6 h-6" />}
                title="No notes"
                description="Create your first note"
                className="py-8"
                action={
                  <Link to={`/app/notes/new?topicId=${topic.id}`}>
                    <Button size="sm"><Plus className="w-4 h-4 mr-1" />Add Note</Button>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-2">
                {notes.map((note) => (
                  <div key={note.id} className="flex items-center gap-1 group">
                    <Link to={`/app/materials/${note.id}/note`} className="flex-1 min-w-0">
                      <div className="p-3 rounded-lg hover:bg-muted transition-colors">
                        <p className="font-medium text-sm truncate">{note.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(note.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </Link>
                    {note.ownerId === user?.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{note.title}"?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteMaterial(note.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summaries Column */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-study-summary" />
              Summaries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {materialsLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="h-14 bg-muted rounded animate-pulse" />)}
              </div>
            ) : summaries.length === 0 ? (
              <EmptyState
                icon={<FileCheck className="w-6 h-6" />}
                title="No summaries"
                description="Generate from a note"
                className="py-8"
              />
            ) : (
              <div className="space-y-2">
                {summaries.map((s) => (
                  <div key={s.id} className="flex items-center gap-1 group">
                    <Link to={`/app/materials/${s.id}/summary`} className="flex-1 min-w-0">
                      <div className="p-3 rounded-lg hover:bg-muted transition-colors">
                        <p className="font-medium text-sm truncate">{s.title}</p>
                        <MaterialBadge type={s.type} />
                      </div>
                    </Link>
                    {s.ownerId === user?.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{s.title}"?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteMaterial(s.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Flashcards Column */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-study-flashcard" />
              Flashcards
            </CardTitle>
            <Link to={`/app/flashcards/new?topicId=${topic.id}`}>
              <Button variant="ghost" size="icon-sm"><Plus className="w-4 h-4" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            {materialsLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="h-14 bg-muted rounded animate-pulse" />)}
              </div>
            ) : flashcardSets.length === 0 ? (
              <EmptyState
                icon={<Layers className="w-6 h-6" />}
                title="No flashcards"
                description="Create or generate flashcards"
                className="py-8"
                action={
                  <Link to={`/app/flashcards/new?topicId=${topic.id}`}>
                    <Button size="sm"><Plus className="w-4 h-4 mr-1" />Add Set</Button>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-2">
                {flashcardSets.map((set) => (
                  <div key={set.id} className="flex items-center gap-1 group">
                    <Link to={`/app/materials/${set.id}/flashcards`} className="flex-1 min-w-0">
                      <div className="p-3 rounded-lg hover:bg-muted transition-colors">
                        <p className="font-medium text-sm truncate">{set.title}</p>
                        <MaterialBadge type={set.type} />
                      </div>
                    </Link>
                    {set.ownerId === user?.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{set.title}"?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteMaterial(set.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
