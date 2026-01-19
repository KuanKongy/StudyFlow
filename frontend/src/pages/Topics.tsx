import { Link } from 'react-router-dom';
import { Plus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useStudy } from '@/contexts/StudyContext';
import { EmptyState } from '@/components/EmptyState';
import { PrivacyBadge } from '@/components/PrivacyBadge';
import { MaterialBadge } from '@/components/MaterialBadge';

export default function Topics() {
  const { topics, getGroupById, getMaterialsByTopic } = useStudy();

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">All Topics</h1>
          <p className="text-muted-foreground">Your private and group study topics</p>
        </div>
        <Link to="/app/topics/new">
          <Button><Plus className="w-4 h-4 mr-2" />New Topic</Button>
        </Link>
      </div>

      {topics.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-8 h-8" />}
          title="No topics yet"
          description="Create your first topic to start organizing your study materials."
          action={<Link to="/app/topics/new"><Button><Plus className="w-4 h-4 mr-2" />Create Topic</Button></Link>}
        />
      ) : (
        <div className="space-y-3">
          {topics.map((topic) => {
            const group = topic.groupIds?.[0] ? getGroupById(topic.groupIds[0]) : null;
            const materials = getMaterialsByTopic(topic.id);

            return (
              <Link key={topic.id} to={`/app/topics/${topic.id}`}>
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
    </div>
  );
}
