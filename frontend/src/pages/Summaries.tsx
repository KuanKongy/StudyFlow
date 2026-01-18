import { Link } from 'react-router-dom';
import { FileCheck, Calendar, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useStudy } from '@/contexts/StudyContext';
import { useAuth } from '@/contexts/AuthContext';
import { EmptyState } from '@/components/EmptyState';

export default function Summaries() {
  const { user } = useAuth();
  const { getMySummaries, getTopicById, getMaterialById } = useStudy();

  const mySummaries = user ? getMySummaries(user.id) : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Summaries</h1>
          <p className="text-muted-foreground mt-1">AI-generated summaries from your notes</p>
        </div>
      </div>

      {mySummaries.length === 0 ? (
        <EmptyState
          icon={FileCheck}
          title="No summaries yet"
          description="Generate summaries from your notes using AI"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mySummaries.map((summary) => {
            const topic = summary.topicId ? getTopicById(summary.topicId) : null;
            const parentMaterial = summary.derivedFrom ? getMaterialById(summary.derivedFrom) : null;
            return (
              <Link key={summary.id} to={`/app/materials/${summary.id}/summary`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-success/10">
                        <FileCheck className="w-5 h-5 text-success" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{summary.title}</CardTitle>
                        {topic && (
                          <CardDescription className="truncate">
                            In: {topic.title}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {parentMaterial && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>From:</span>
                        <span className="font-medium truncate">{parentMaterial.title}</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(summary.createdAt).toLocaleDateString()}</span>
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
