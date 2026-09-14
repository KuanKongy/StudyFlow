import { useState, useEffect, useRef } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Code, ExternalLink, Eye, FileCheck, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useMaterial, useNote, useTopics, useGroups, useJobs, useRegenerateSummary } from '@/hooks/useApi';
import { useStudy } from '@/contexts/StudyContext';
import { useAuth } from '@/contexts/AuthContext';
import { MaterialBadge } from '@/components/MaterialBadge';
import { PrivacyBadge } from '@/components/PrivacyBadge';
import { EmptyState } from '@/components/EmptyState';
import { MarkdownContent } from '@/components/MarkdownContent';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function SummaryView() {
  const { materialId } = useParams<{ materialId: string }>();
  const { aiDisclosureAccepted, setAiDisclosureAccepted } = useStudy();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [mode, setMode] = useState<'rendered' | 'raw'>('rendered');
  const [showAiDisclosure, setShowAiDisclosure] = useState(false);

  const { data: material, isLoading: materialLoading, isError: materialError } = useMaterial(materialId);
  const { data: note, isLoading: noteLoading } = useNote(materialId);
  const { data: parentMaterial } = useMaterial(material?.derivedFrom);
  const { data: topics = [] } = useTopics();
  const { data: groups = [] } = useGroups();
  const { data: jobs = [] } = useJobs();
  const regenerate = useRegenerateSummary();

  const topic = material?.topicId ? topics.find((t) => t.id === material.topicId) : null;
  const group = topic?.groupIds?.[0] ? groups.find((g) => g.id === topic.groupIds[0]) : null;
  const isOwner = !!material && material.ownerId === user?.id;

  const activeRegenJob = jobs.find(
    (j) =>
      j.type === 'GENERATE_SUMMARY' &&
      j.replaceMaterialId === materialId &&
      ['queued', 'processing', 'retrying'].includes(j.status)
  );
  const isRegenerating = regenerate.isPending || !!activeRegenJob;

  // Refresh the summary (and toast) once a tracked regeneration job finishes.
  const trackedJobId = useRef<string | null>(null);
  useEffect(() => {
    if (activeRegenJob) {
      trackedJobId.current = activeRegenJob.id;
      return;
    }
    if (!trackedJobId.current) return;
    const finished = jobs.find((j) => j.id === trackedJobId.current);
    if (!finished) return;
    trackedJobId.current = null;
    if (finished.status === 'done') {
      qc.invalidateQueries({ queryKey: ['note', materialId] });
      qc.invalidateQueries({ queryKey: ['material', materialId] });
      qc.invalidateQueries({ queryKey: ['materials'] });
      toast.success('Summary regenerated!');
    } else if (finished.status === 'failed') {
      toast.error(finished.error ? `Regeneration failed: ${finished.error}` : 'Regeneration failed');
    }
  }, [jobs, activeRegenJob, materialId, qc]);

  const startRegeneration = async () => {
    if (!materialId) return;
    try {
      await regenerate.mutateAsync(materialId);
      toast.success('Summary regeneration started! It will replace this summary when done.');
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 429) toast.error('AI rate limit reached — try again in an hour.');
      else if (status === 503) toast.error('AI is temporarily unavailable — try again shortly.');
      else toast.error('Failed to start summary regeneration');
    }
  };

  const handleRegenerate = () => {
    if (!aiDisclosureAccepted) {
      setShowAiDisclosure(true);
      return;
    }
    startRegeneration();
  };

  const handleAiDisclosureAccept = () => {
    setAiDisclosureAccepted(true);
    setShowAiDisclosure(false);
    startRegeneration();
  };

  if (!materialId) {
    return <Navigate to="/app/topics" replace />;
  }

  if (materialLoading || noteLoading) {
    return (
      <div className="px-4 py-5 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
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
      <div className="px-4 py-5 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
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
    <div className="px-4 py-5 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
      <AlertDialog open={showAiDisclosure} onOpenChange={(open) => !open && setShowAiDisclosure(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>AI Processing Disclosure</AlertDialogTitle>
            <AlertDialogDescription>
              Your note content will be sent to OpenAI for processing. Data may transit through US-based servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowAiDisclosure(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAiDisclosureAccept}>I understand, continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
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

        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            value={mode}
            onValueChange={setMode}
            options={[
              { value: 'rendered', label: 'Rendered', icon: Eye },
              { value: 'raw', label: 'Raw', icon: Code },
            ]}
          />
          {isOwner && material.derivedFrom && (
            <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={isRegenerating}>
              <RefreshCw className={cn('w-4 h-4 mr-1', isRegenerating && 'animate-spin')} />
              {isRegenerating ? 'Regenerating…' : 'Regenerate'}
            </Button>
          )}
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
          {mode === 'rendered' ? (
            <MarkdownContent content={note?.content ?? 'No content yet.'} />
          ) : (
            <div className="whitespace-pre-wrap font-mono text-sm">{note?.content ?? 'No content yet.'}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
