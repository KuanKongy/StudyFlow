import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';
import { Settings, Copy, Plus, FileText, Check, UserMinus, Lock, Globe, Crown, Trash2, Camera } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStudy } from '@/contexts/StudyContext';
import { useAuth } from '@/contexts/AuthContext';
import { EmptyState } from '@/components/EmptyState';
import { MaterialBadge } from '@/components/MaterialBadge';
import { toast } from 'sonner';

export default function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { 
    getGroupById, 
    getTopicsByGroup, 
    getMaterialsByTopic, 
    setSelectedGroupId, 
    getUserById,
    kickMember,
    topics,
    addTopicToGroup,
    deleteGroup,
    updateGroup,
  } = useStudy();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [addTopicDialogOpen, setAddTopicDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [newName, setNewName] = useState('');

  const group = groupId ? getGroupById(groupId) : null;

  if (!group) {
    return <Navigate to="/app/groups" replace />;
  }

  // Set this as the selected group for sidebar context
  setSelectedGroupId(group.id);

  const groupTopics = getTopicsByGroup(group.id);
  const isOwner = group.ownerId === user?.id;
  const owner = getUserById(group.ownerId);

  // Get topics that are not already in this group
  const availableTopics = topics.filter(
    (t) => t.ownerId === user?.id && (!t.groupIds || !t.groupIds.includes(group.id))
  );

  const copyJoinCode = () => {
    if (group.joinCode) {
      navigator.clipboard.writeText(group.joinCode);
      setCopied(true);
      toast.success('Join code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleKickMember = (memberId: string) => {
    if (memberId === group.ownerId) {
      toast.error("Cannot remove the group owner");
      return;
    }
    kickMember(group.id, memberId);
    toast.success('Member removed from group');
  };

  const handleAddExistingTopic = () => {
    if (!selectedTopicId) {
      toast.error('Please select a topic');
      return;
    }
    addTopicToGroup(selectedTopicId, group.id);
    setAddTopicDialogOpen(false);
    setSelectedTopicId('');
    toast.success('Topic added to group!');
  };

  const handleDeleteGroup = () => {
    deleteGroup(group.id);
    toast.success('Group deleted');
    navigate('/app/groups');
  };

  const handleSaveSettings = () => {
    if (newName.trim()) {
      updateGroup(group.id, { name: newName.trim() });
      toast.success('Group updated!');
    }
    setSettingsOpen(false);
  };

  const handleChangeAvatar = () => {
    // Simulate avatar change
    toast.success('Group avatar updated!');
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 text-accent flex items-center justify-center text-2xl font-bold">
            {group.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold mb-1">{group.name}</h1>
              {group.joinCode ? (
                <Badge variant="secondary" className="gap-1">
                  <Lock className="w-3 h-3" />
                  Private
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <Globe className="w-3 h-3" />
                  Public
                </Badge>
              )}
            </div>
            {group.description && (
              <p className="text-muted-foreground">{group.description}</p>
            )}
          </div>
        </div>

        {isOwner && (
          <Dialog open={settingsOpen} onOpenChange={(open) => {
            setSettingsOpen(open);
            if (open) setNewName(group.name);
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Group Settings</DialogTitle>
                <DialogDescription>Manage your group settings</DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                {/* Group Avatar */}
                <div className="space-y-2">
                  <Label>Group Picture</Label>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 text-accent flex items-center justify-center text-2xl font-bold">
                        {group.name.charAt(0)}
                      </div>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        className="absolute -bottom-1 -right-1 rounded-full"
                        onClick={handleChangeAvatar}
                      >
                        <Camera className="w-4 h-4" />
                      </Button>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleChangeAvatar}>
                      Change Picture
                    </Button>
                  </div>
                </div>

                {/* Group Name */}
                <div className="space-y-2">
                  <Label>Group Name</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Enter group name"
                  />
                </div>

                <Button onClick={handleSaveSettings} className="w-full">
                  Save Changes
                </Button>

                {/* Delete Group */}
                <div className="pt-4 border-t">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Group
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Group?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. All topics will remain but will be removed from this group.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {group.joinCode && (
          <Card className="study-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Join Code</p>
                  <p className="font-mono font-semibold text-lg">{group.joinCode}</p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={copyJoinCode}>
                  {copied ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="study-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium">{owner?.username || 'Unknown'}</p>
              <p className="text-xs text-muted-foreground">Group Owner</p>
            </div>
          </CardContent>
        </Card>

        <Dialog open={addTopicDialogOpen} onOpenChange={setAddTopicDialogOpen}>
          <DialogTrigger asChild>
            <Card className="study-card hover:border-primary/50 cursor-pointer transition-colors h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Add Topic</p>
                  <p className="text-xs text-muted-foreground">New or existing</p>
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Topic to Group</DialogTitle>
              <DialogDescription>
                Create a new topic or add an existing one to this group.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Link to={`/app/topics/new?groupId=${group.id}`}>
                <Button className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Topic
                </Button>
              </Link>
              
              {availableTopics.length > 0 && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or add existing</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Select value={selectedTopicId} onValueChange={setSelectedTopicId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a topic" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTopics.map((topic) => (
                          <SelectItem key={topic.id} value={topic.id}>
                            {topic.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleAddExistingTopic}
                      disabled={!selectedTopicId}
                    >
                      Add Selected Topic
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Topics */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Topics</CardTitle>
            </CardHeader>
            <CardContent>
              {groupTopics.length === 0 ? (
                <EmptyState
                  icon={<FileText className="w-8 h-8" />}
                  title="No topics yet"
                  description="Create the first topic for this group to start collaborating."
                  action={
                    <Link to={`/app/topics/new?groupId=${group.id}`}>
                      <Button>Create Topic</Button>
                    </Link>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {groupTopics.map((topic) => {
                    const materials = getMaterialsByTopic(topic.id);

                    return (
                      <Link key={topic.id} to={`/app/topics/${topic.id}`}>
                        <div className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted transition-colors">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{topic.title}</p>
                            {topic.description && (
                              <p className="text-sm text-muted-foreground truncate">
                                {topic.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {materials.slice(0, 3).map((m) => (
                              <MaterialBadge key={m.id} type={m.type} />
                            ))}
                            {materials.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{materials.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Members */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Members ({group.memberIds.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {group.memberIds.map((memberId) => {
                const member = getUserById(memberId);
                const isMemberOwner = memberId === group.ownerId;

                return (
                  <div key={memberId} className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {member?.username?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {member?.username || 'Unknown'}
                      </p>
                      {isMemberOwner && (
                        <Badge variant="secondary" className="text-xs">Owner</Badge>
                      )}
                    </div>
                    {isOwner && !isMemberOwner && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleKickMember(memberId)}
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
