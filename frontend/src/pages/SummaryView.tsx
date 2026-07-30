import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMaterial, useNote, useTopics, useGroups } from '@/hooks/useApi';
import { MaterialBadge } from '@/components/MaterialBadge';
import { PrivacyBadge } from '@/components/PrivacyBadge';
import { EmptyState } from '@/components/EmptyState';

export default function SummaryView() {
  const { materialId } = useParams<{ materialId: string }>();

  const { data: material, isLoading: materialLoading, isError: materialError } = useMaterial(materialId);
  const { data: note, isLoading: noteLoading } = useNote(materialId);
  const { data: parentMaterial } = useMaterial(material?.derivedFrom);
  const { data: topics = [] } = useTopics();
  const { data: groups = [] } = useGroups();

  const topic = material?.topicId ? topics.find((t) => t.id === material.topicId) : null;
  const group = topic?.groupIds?.[0] ? groups.find((g) => g.id === topic.groupIds[0]) : null;

  if (!materialId) {
    return <Navigate to="/app/topics" replace />;
  }

  if (materialLoading || noteLoading) {
    return (
      <div className="px-4 py-5 sm:p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-8 w-8 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-24 w-full rounded-lg mb-6" />
        <Skeleton className="h-80 w-full rounded-lg" />
      </div>
    );
  }

  if (materialError || !material) {
    return (
      <div className="px-4 py-5 sm:p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in">
        <EmptyState
          icon={FileCheck}
          title="Summary not found"
          description="This summary may have been deleted, or you may not have access to it."
          action={
            <Link to="/app/summaries">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Summaries
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="px-4 py-5 sm:p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link to={material.topicId ? `/app/topics/${material.topicId}` : '/app/summaries'}>
            <Button variant="ghost" size="icon-sm" aria-label="Back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 break-words text-xl font-bold">{material.title}</h1>
              <MaterialBadge type={material.type} />
            </div>
            {topic && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">{topic.title}</span>
                <span className="text-muted-foreground">•</span>
                <PrivacyBadge privacy={topic.privacy} groupName={group?.name} />
              </div>
            )}
          </div>
        </div>
      </div>

      {parentMaterial && (
        <Card className="mb-6 bg-muted/50">
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
              <span className="text-sm text-muted-foreground">Generated from:</span>
              <span className="font-medium truncate">{parentMaterial.title}</span>
            </div>
            <Link to={`/app/materials/${parentMaterial.id}/note`}>
              <Button variant="ghost" size="sm">View Original<ExternalLink className="w-3 h-3 ml-1" /></Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6">
          <div className="whitespace-pre-wrap font-mono text-sm">{note?.content ?? 'No content yet.'}</div>
        </CardContent>
      </Card>
    </div>
  );
}
