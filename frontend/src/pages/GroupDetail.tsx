import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';
import { Settings, Copy, Plus, FileText, Check, UserMinus, Lock, Globe, Crown, Trash2, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  useGroups, useTopics, useAllMaterials, useUsers, useRemoveMember,
  useUpdateTopic, useDeleteGroup, useUpdateGroup, useLeaveGroup,
} from '@/hooks/useApi';
import { EmptyState } from '@/components/EmptyState';
import { MaterialBadge } from '@/components/MaterialBadge';
import { CharCounter } from '@/components/CharCounter';
import { LIMITS } from '@/lib/validation';
import { toast } from 'sonner';

export default function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { setSelectedGroupId } = useStudy();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [addTopicDialogOpen, setAddTopicDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAvatar, setNewAvatar] = useState('');
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const { data: groups = [], isLoading: groupsLoading } = useGroups();
  const { data: topics = [] } = useTopics();
  const { data: allMaterials = [] } = useAllMaterials();

  const group = groupId ? groups.find((g) => g.id === groupId) : null;

  const { data: users = [] } = useUsers(group ? [group.ownerId, ...group.memberIds] : []);

  const removeMemberMutation = useRemoveMember();
  const updateTopicMutation = useUpdateTopic();
  const deleteGroupMutation = useDeleteGroup();
  const updateGroupMutation = useUpdateGroup();
  const leaveGroupMutation = useLeaveGroup();

  useEffect(() => {
    if (group) {
      setSelectedGroupId(group.id);
    }
    return () => setSelectedGroupId(null);
  }, [group, setSelectedGroupId]);

  if (groupsLoading || !groupId) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return <Navigate to="/app/groups" replace />;
  }

  const groupTopics = topics.filter((t) => t.groupIds?.includes(group.id));
  const isOwner = group.ownerId === user?.id;
  const owner = users.find((u) => u.id === group.ownerId || u.authId === group.ownerId);

  const availableTopics = topics.filter(
    (t) => t.ownerId === user?.id && (!t.groupIds || !t.groupIds.includes(group.id))
  );

  const getUserById = (authId: string) =>
    users.find((u) => u.id === authId || u.authId === authId);

  const getMaterialsByTopic = (topicId: string) =>
    allMaterials.filter((m) => m.topicId === topicId);

  const copyJoinCode = () => {
    if (group.joinCode) {
      navigator.clipboard.writeText(group.joinCode);
      setCopied(true);
      toast.success('Join code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleKickMember = async (memberId: string) => {
    if (memberId === group.ownerId) {
      toast.error('Cannot remove the group owner');
      return;
    }
    try {
      await removeMemberMutation.mutateAsync({ groupId: group.id, userId: memberId });
      toast.success('Member removed from group');
    } catch {
      toast.error('Failed to remove member');
    }
  };

  const handleLeaveGroup = async () => {
    try {
      await leaveGroupMutation.mutateAsync(group.id);
      toast.success('You left the group');
      navigate('/app/groups');
    } catch {
      toast.error('Failed to leave group');
    }
  };

  const handleAddExistingTopic = async () => {
    if (!selectedTopicId) {
      toast.error('Please select a topic');
      return;
    }
    const topic = availableTopics.find((t) => t.id === selectedTopicId);
    if (!topic) return;
    try {
      await updateTopicMutation.mutateAsync({
        topicId: selectedTopicId,
        updates: { groupIds: [...(topic.groupIds || []), group.id] },
      });
      setAddTopicDialogOpen(false);
      setSelectedTopicId('');
      toast.success('Topic added to group!');
    } catch {
      toast.error('Failed to add topic');
    }
  };

  const handleDeleteGroup = async () => {
    try {
      await deleteGroupMutation.mutateAsync(group.id);
      toast.success('Group deleted');
      navigate('/app/groups');
    } catch {
      toast.error('Failed to delete group');
    }
  };

  const handleSaveSettings = async () => {
    const updates: Record<string, any> = {};
    if (newName.trim() && newName.trim() !== group.name) updates.name = newName.trim();
    if (newDescription !== (group.description || '')) updates.description = newDescription;
    if (newAvatar !== (group.avatar || '')) updates.avatar = newAvatar.trim();
    if (Object.keys(updates).length === 0) {
      setSettingsOpen(false);
      return;
    }
    try {
      await updateGroupMutation.mutateAsync({ groupId: group.id, updates });
      toast.success('Group updated!');
      setSettingsOpen(false);
    } catch {
      toast.error('Failed to update group');
    }
  };

  const profileUser = profileUserId ? getUserById(profileUserId) : null;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4 min-w-0">
          <Avatar className="w-16 h-16 rounded-xl shrink-0">
            <AvatarImage src={group.avatar} className="rounded-xl" />
            <AvatarFallback className="rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 text-accent text-2xl font-bold">
              {group.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold mb-1 truncate">{group.name}</h1>
              {group.joinCode ? (
                <Badge variant="secondary" className="gap-1 shrink-0"><Lock className="w-3 h-3" />Private</Badge>
              ) : (
                <Badge variant="secondary" className="gap-1 shrink-0"><Globe className="w-3 h-3" />Public</Badge>
              )}
            </div>
            {group.description && (
              <p className="text-muted-foreground line-clamp-2">{group.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isOwner && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <LogOut className="w-4 h-4 mr-2" />Leave
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Leave Group?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You will lose access to shared topics in this group. Your own topics will become private.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLeaveGroup}>Leave</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {isOwner && (
            <Dialog
              open={settingsOpen}
              onOpenChange={(open) => {
                setSettingsOpen(open);
                if (open) {
                  setNewName(group.name);
                  setNewDescription(group.description || '');
                  setNewAvatar(group.avatar || '');
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
                  <DialogTitle>Group Settings</DialogTitle>
                  <DialogDescription>Manage your group settings</DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>Group Picture URL</Label>
                    <Input
                      value={newAvatar}
                      onChange={(e) => setNewAvatar(e.target.value)}
                      placeholder="https://example.com/group-avatar.png"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Group Name</Label>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value.slice(0, LIMITS.GROUP_NAME))}
                      placeholder="Enter group name"
                      maxLength={LIMITS.GROUP_NAME}
                    />
                    <CharCounter current={newName.length} max={LIMITS.GROUP_NAME} />
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value.slice(0, LIMITS.GROUP_DESCRIPTION))}
                      placeholder="What is this group about?"
                      rows={3}
                      maxLength={LIMITS.GROUP_DESCRIPTION}
                    />
                    <CharCounter current={newDescription.length} max={LIMITS.GROUP_DESCRIPTION} />
                  </div>

                  <Button onClick={handleSaveSettings} className="w-full">Save Changes</Button>

                  <div className="pt-4 border-t">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full">
                          <Trash2 className="w-4 h-4 mr-2" />Delete Group
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Group?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. All topics will be detached from this group and become private.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteGroup}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
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
                  {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
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
              <button className="font-medium hover:underline text-left" onClick={() => setProfileUserId(group.ownerId)}>
                {owner?.name || owner?.username || 'Unknown'}
              </button>
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
              <DialogDescription>Create a new topic or add an existing one.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Link to={`/app/topics/new?groupId=${group.id}`}>
                <Button className="w-full"><Plus className="w-4 h-4 mr-2" />Create New Topic</Button>
              </Link>
              {availableTopics.length > 0 && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or add existing</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Select value={selectedTopicId} onValueChange={setSelectedTopicId}>
                      <SelectTrigger><SelectValue placeholder="Select a topic" /></SelectTrigger>
                      <SelectContent>
                        {availableTopics.map((topic) => (
                          <SelectItem key={topic.id} value={topic.id}>{topic.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" className="w-full" onClick={handleAddExistingTopic} disabled={!selectedTopicId}>
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
                  action={<Link to={`/app/topics/new?groupId=${group.id}`}><Button>Create Topic</Button></Link>}
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
                            {topic.description && <p className="text-sm text-muted-foreground truncate">{topic.description}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            {materials.slice(0, 3).map((m) => <MaterialBadge key={m.id} type={m.type} />)}
                            {materials.length > 3 && <span className="text-xs text-muted-foreground">+{materials.length - 3}</span>}
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
            <CardTitle className="text-base">Members ({group.memberIds.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {group.memberIds.map((memberId) => {
                const member = getUserById(memberId);
                const isMemberOwner = memberId === group.ownerId;
                return (
                  <div key={memberId} className="flex items-center gap-3">
                    <button onClick={() => setProfileUserId(memberId)} className="shrink-0">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={member?.avatar} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {member?.username?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                    <div className="flex-1 min-w-0">
                      <button onClick={() => setProfileUserId(memberId)} className="text-sm font-medium truncate hover:underline block text-left">
                        {member?.name || member?.username || 'Unknown'}
                      </button>
                      {isMemberOwner && <Badge variant="secondary" className="text-xs">Owner</Badge>}
                    </div>
                    {isOwner && !isMemberOwner && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive">
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove member?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove {member?.name || member?.username || 'this member'} from the group. Their topics will be detached and their shared materials may be deleted. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleKickMember(memberId)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profile Modal */}
      <Dialog open={!!profileUserId} onOpenChange={(open) => { if (!open) setProfileUserId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Member Profile</DialogTitle>
          </DialogHeader>
          {profileUser && (
            <div className="flex flex-col items-center gap-4 py-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={profileUser.avatar} />
                <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                  {profileUser.username?.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="text-center space-y-1">
                <p className="text-lg font-semibold">{profileUser.name || profileUser.username}</p>
                <p className="text-sm text-muted-foreground">@{profileUser.username}</p>
                <p className="text-sm text-muted-foreground">{profileUser.email}</p>
                <p className="text-xs text-muted-foreground">
                  Member since {new Date(profileUser.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
