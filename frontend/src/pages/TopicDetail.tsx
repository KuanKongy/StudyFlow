import { useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { Plus, FileText, FileCheck, Layers, Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useStudy } from '@/contexts/StudyContext';
import { useAuth } from '@/contexts/AuthContext';
import { EmptyState } from '@/components/EmptyState';
import { PrivacyBadge } from '@/components/PrivacyBadge';
import { MaterialBadge } from '@/components/MaterialBadge';
import { toast } from 'sonner';

export default function TopicDetail() {
  const { topicId } = useParams<{ topicId: string }>();
  const { 
    getTopicById, 
    getGroupById, 
    getMaterialsByTopic, 
    setSelectedGroupId,
    groups,
    addTopicToGroup,
    removeTopicFromGroup,
    updateTopic,
  } = useStudy();
  const { user } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedGroupToAdd, setSelectedGroupToAdd] = useState('');

  const topic = topicId ? getTopicById(topicId) : null;
  if (!topic) return <Navigate to="/app/topics" replace />;

  const group = topic.groupIds?.[0] ? getGroupById(topic.groupIds[0]) : null;
  const materials = getMaterialsByTopic(topic.id);
  const isOwner = topic.ownerId === user?.id;

  if (topic.groupIds?.[0]) setSelectedGroupId(topic.groupIds[0]);

  const notes = materials.filter((m) => m.type === 'note');
  const summaries = materials.filter((m) => m.type === 'summary');
  const flashcardSets = materials.filter((m) => m.type === 'flashcard_set');

  // Groups not already associated with this topic
  const availableGroups = groups.filter(
    (g) => g.memberIds.includes(user?.id || '') && (!topic.groupIds || !topic.groupIds.includes(g.id))
  );

  const handleAddToGroup = () => {
    if (!selectedGroupToAdd) {
      toast.error('Please select a group');
      return;
    }
    addTopicToGroup(topic.id, selectedGroupToAdd);
    setSelectedGroupToAdd('');
    toast.success('Topic added to group!');
  };

  const handleRemoveFromGroup = (groupId: string) => {
    removeTopicFromGroup(topic.id, groupId);
    toast.success('Topic removed from group');
  };

  const handleSaveName = () => {
    if (newName.trim()) {
      updateTopic(topic.id, { title: newName.trim() });
      toast.success('Topic name updated!');
    }
    setSettingsOpen(false);
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto animate-fade-in">
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
                  <Badge key={gId} variant="outline" className="gap-1">
                    {g.name}
                  </Badge>
                ) : null;
              })}
            </div>
          )}
        </div>
        {isOwner && (
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => setNewName(topic.title)}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Topic Settings</DialogTitle>
                <DialogDescription>Manage topic name and group associations</DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                {/* Change Name */}
                <div className="space-y-2">
                  <Label>Topic Name</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Enter topic name"
                  />
                  <Button size="sm" onClick={handleSaveName}>
                    Save Name
                  </Button>
                </div>

                {/* Current Groups */}
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

                {/* Add to Group */}
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
                            <SelectItem key={g.id} value={g.id}>
                              {g.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={handleAddToGroup} disabled={!selectedGroupToAdd}>
                        Add
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-study-note" />
              Notes
            </CardTitle>
            <Link to={`/app/notes/new?topicId=${topic.id}`}>
              <Button variant="ghost" size="icon-sm">
                <Plus className="w-4 h-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {notes.length === 0 ? (
              <EmptyState
                icon={<FileText className="w-6 h-6" />}
                title="No notes"
                description="Create your first note"
                className="py-8"
                action={
                  <Link to={`/app/notes/new?topicId=${topic.id}`}>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Note
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-2">
                {notes.map((note) => (
                  <Link key={note.id} to={`/app/materials/${note.id}/note`} className="block">
                    <div className="p-3 rounded-lg hover:bg-muted transition-colors">
                      <p className="font-medium text-sm truncate">{note.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-study-summary" />
              Summaries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summaries.length === 0 ? (
              <EmptyState
                icon={<FileCheck className="w-6 h-6" />}
                title="No summaries"
                description="Generate from a note"
                className="py-8"
              />
            ) : (
              <div className="space-y-2">
                {summaries.map((s) => (
                  <Link key={s.id} to={`/app/materials/${s.id}/summary`} className="block">
                    <div className="p-3 rounded-lg hover:bg-muted transition-colors">
                      <p className="font-medium text-sm truncate">{s.title}</p>
                      <MaterialBadge type={s.type} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-study-flashcard" />
              Flashcards
            </CardTitle>
            <Link to={`/app/flashcards/new?topicId=${topic.id}`}>
              <Button variant="ghost" size="icon-sm">
                <Plus className="w-4 h-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {flashcardSets.length === 0 ? (
              <EmptyState
                icon={<Layers className="w-6 h-6" />}
                title="No flashcards"
                description="Create or generate flashcards"
                className="py-8"
                action={
                  <Link to={`/app/flashcards/new?topicId=${topic.id}`}>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Set
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-2">
                {flashcardSets.map((set) => (
                  <Link key={set.id} to={`/app/materials/${set.id}/flashcards`} className="block">
                    <div className="p-3 rounded-lg hover:bg-muted transition-colors">
                      <p className="font-medium text-sm truncate">{set.title}</p>
                      <MaterialBadge type={set.type} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
