import { useState } from 'react';
import { ArrowLeft, Users, Lock, Globe, UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useStudy } from '@/contexts/StudyContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';

export default function JoinGroup() {
  const navigate = useNavigate();
  const { groups, joinGroup, getUserById } = useStudy();
  const { user } = useAuth();
  const [joinCode, setJoinCode] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Groups the user is not a member of
  const availableGroups = groups.filter((g) => !g.memberIds.includes(user?.id || ''));
  const publicGroups = availableGroups.filter((g) => !g.joinCode);
  const privateGroups = availableGroups.filter((g) => g.joinCode);

  const handleJoinWithCode = () => {
    if (!joinCode.trim()) {
      toast.error('Please enter a join code');
      return;
    }

    // Find group with this join code
    const group = groups.find((g) => g.joinCode === joinCode.trim());
    if (!group) {
      toast.error('Invalid join code');
      return;
    }

    if (group.memberIds.includes(user?.id || '')) {
      toast.info('You are already a member of this group');
      navigate(`/app/groups/${group.id}`);
      return;
    }

    const success = joinGroup(group.id, joinCode.trim());
    if (success) {
      toast.success(`Joined "${group.name}" successfully!`);
      navigate(`/app/groups/${group.id}`);
    } else {
      toast.error('Failed to join group');
    }
  };

  const handleJoinPublicGroup = (groupId: string) => {
    const success = joinGroup(groupId, '');
    if (success) {
      const group = groups.find((g) => g.id === groupId);
      toast.success(`Joined "${group?.name}" successfully!`);
      navigate(`/app/groups/${groupId}`);
    } else {
      toast.error('Failed to join group');
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/app/groups">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Join a Group</h1>
          <p className="text-muted-foreground">Find and join study groups</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Join with Code */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Join Private Group
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="joinCode">Enter Join Code</Label>
              <Input
                id="joinCode"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="e.g., CS101-XYZ"
              />
            </div>
            <Button onClick={handleJoinWithCode} className="w-full">
              <UserPlus className="w-4 h-4 mr-2" />
              Join Group
            </Button>
          </CardContent>
        </Card>

        {/* Public Groups Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Public Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Public groups are open to everyone. Browse and join instantly.
            </p>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary">{publicGroups.length} available</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Public Groups */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Available Public Groups</h2>
        {publicGroups.length === 0 ? (
          <EmptyState
            icon={<Globe className="w-8 h-8" />}
            title="No public groups available"
            description="All public groups have been joined or none exist yet."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {publicGroups.map((group) => {
              const owner = getUserById(group.ownerId);
              return (
                <Card key={group.id} className="study-card">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 text-accent flex items-center justify-center text-lg font-semibold shrink-0">
                        {group.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{group.name}</h3>
                        {group.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {group.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex -space-x-2">
                            {group.memberIds.slice(0, 3).map((id) => {
                              const member = getUserById(id);
                              return (
                                <Avatar key={id} className="w-6 h-6 border-2 border-card">
                                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                    {member?.username?.charAt(0).toUpperCase() || '?'}
                                  </AvatarFallback>
                                </Avatar>
                              );
                            })}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {group.memberIds.length} members
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-4"
                      onClick={() => handleJoinPublicGroup(group.id)}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Join Group
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
