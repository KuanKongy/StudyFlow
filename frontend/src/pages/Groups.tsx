import { Link } from 'react-router-dom';
import { Plus, Users, ArrowRight, Lock, Globe, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useStudy } from '@/contexts/StudyContext';
import { useAuth } from '@/contexts/AuthContext';
import { EmptyState } from '@/components/EmptyState';

export default function Groups() {
  const { getMyGroups, getTopicsByGroup, getUserById } = useStudy();
  const { user } = useAuth();

  const myGroups = getMyGroups(user?.id || '');

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">My Groups</h1>
          <p className="text-muted-foreground">
            Collaborate with others in study groups
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/app/groups/join">
            <Button variant="outline">
              <UserPlus className="w-4 h-4 mr-2" />
              Join Group
            </Button>
          </Link>
          <Link to="/app/groups/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Group
            </Button>
          </Link>
        </div>
      </div>

      {/* Groups Grid */}
      {myGroups.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="No groups yet"
          description="Create a study group to collaborate with classmates and share materials."
          action={
            <div className="flex gap-2">
              <Link to="/app/groups/join">
                <Button variant="outline">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Join Group
                </Button>
              </Link>
              <Link to="/app/groups/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Group
                </Button>
              </Link>
            </div>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {myGroups.map((group) => {
            const topics = getTopicsByGroup(group.id);
            const owner = getUserById(group.ownerId);
            const memberAvatars = group.memberIds.slice(0, 4).map((id) => getUserById(id));
            
            return (
              <Link key={group.id} to={`/app/groups/${group.id}`}>
                <Card className="study-card h-full hover:border-accent/50 transition-colors cursor-pointer group">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 text-accent flex items-center justify-center text-lg font-semibold shrink-0">
                        {group.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate group-hover:text-accent transition-colors">
                            {group.name}
                          </h3>
                          {group.joinCode ? (
                            <Lock className="w-3 h-3 text-muted-foreground" />
                          ) : (
                            <Globe className="w-3 h-3 text-muted-foreground" />
                          )}
                        </div>
                        {group.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {group.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            Owner: {owner?.username || 'Unknown'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        {/* Member Avatars */}
                        <div className="flex -space-x-2">
                          {memberAvatars.map((member, idx) => (
                            <Avatar key={idx} className="w-6 h-6 border-2 border-card">
                              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                {member?.username?.charAt(0).toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {group.memberIds.length > 4 && (
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-card">
                              +{group.memberIds.length - 4}
                            </div>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {group.memberIds.length} member{group.memberIds.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
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
