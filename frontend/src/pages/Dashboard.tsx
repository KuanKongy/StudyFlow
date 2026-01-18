import { Link } from 'react-router-dom';
import { Plus, FileText, Users, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useStudy } from '@/contexts/StudyContext';
import { MaterialBadge } from '@/components/MaterialBadge';
import { PrivacyBadge } from '@/components/PrivacyBadge';
import { EmptyState } from '@/components/EmptyState';

export default function Dashboard() {
  const { user } = useAuth();
  const { groups, materials, jobs, topics, getGroupById } = useStudy();

  const recentMaterials = [...materials]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const activeJobs = jobs.filter((j) => j.status === 'pending' || j.status === 'processing');

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold mb-2">
          Welcome back, {user?.name?.split(' ')[0] || user?.username}!
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening in your study space.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link to="/app/topics/new?privacy=private">
          <Card className="study-card hover:border-primary/50 cursor-pointer transition-colors h-full">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium">New Topic</p>
                <p className="text-xs text-muted-foreground">Start studying</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/app/groups/new">
          <Card className="study-card hover:border-accent/50 cursor-pointer transition-colors h-full">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium">Create Group</p>
                <p className="text-xs text-muted-foreground">Study together</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/app/groups">
          <Card className="study-card hover:border-primary/50 cursor-pointer transition-colors h-full">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium">Browse Groups</p>
                <p className="text-xs text-muted-foreground">{groups.length} groups</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/app/topics">
          <Card className="study-card hover:border-primary/50 cursor-pointer transition-colors h-full">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium">All Topics</p>
                <p className="text-xs text-muted-foreground">{topics.length} topics</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Materials */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Materials</CardTitle>
              <Link to="/app/topics">
                <Button variant="ghost" size="sm">
                  View all <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentMaterials.length === 0 ? (
                <EmptyState
                  icon={<FileText className="w-8 h-8" />}
                  title="No materials yet"
                  description="Create your first topic and start adding notes."
                  action={
                    <Link to="/app/topics/new?privacy=private">
                      <Button>Create Topic</Button>
                    </Link>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {recentMaterials.map((material) => {
                    const topic = topics.find((t) => t.id === material.topicId);
                    const group = topic?.groupIds?.[0] ? getGroupById(topic.groupIds[0]) : null;

                    return (
                      <Link
                        key={material.id}
                        to={`/app/materials/${material.id}/${material.type === 'flashcard_set' ? 'flashcards' : material.type}`}
                        className="block"
                      >
                        <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{material.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <MaterialBadge type={material.type} />
                              {topic && (
                                <PrivacyBadge
                                  privacy={topic.privacy}
                                  groupName={group?.name}
                                />
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(material.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Active Jobs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span>AI Jobs</span>
                <Link to="/app/jobs">
                  <Button variant="ghost" size="sm">View all</Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No active jobs
                </p>
              ) : (
                <div className="space-y-3">
                  {activeJobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                    >
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {job.type === 'GENERATE_SUMMARY'
                            ? 'Generating Summary'
                            : 'Generating Flashcards'}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {job.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Groups */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">My Groups</CardTitle>
              <Link to="/app/groups">
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {groups.length === 0 ? (
                <EmptyState
                  icon={<Users className="w-6 h-6" />}
                  title="No groups"
                  description="Create or join a group to study together."
                  className="py-8"
                  action={
                    <Link to="/app/groups/new">
                      <Button size="sm">Create Group</Button>
                    </Link>
                  }
                />
              ) : (
                <div className="space-y-2">
                  {groups.slice(0, 3).map((group) => (
                    <Link key={group.id} to={`/app/groups/${group.id}`}>
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center text-sm font-medium">
                          {group.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{group.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {group.memberIds.length} members
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
