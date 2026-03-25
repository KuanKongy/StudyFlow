import { ArrowLeft, Sparkles, Clock, CheckCircle, XCircle, Loader2, FileText, Layers, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useJobs, useAllMaterials } from '@/hooks/useApi';
import { EmptyState } from '@/components/EmptyState';
import { Job } from '@/types';

const getStatusIcon = (status: Job['status']) => {
  switch (status) {
    case 'queued':
      return <Clock className="w-4 h-4" />;
    case 'processing':
    case 'retrying':
      return <Loader2 className="w-4 h-4 animate-spin" />;
    case 'done':
      return <CheckCircle className="w-4 h-4" />;
    case 'failed':
      return <XCircle className="w-4 h-4" />;
  }
};

const getStatusColor = (status: Job['status']) => {
  switch (status) {
    case 'queued':
      return 'bg-muted text-muted-foreground';
    case 'processing':
    case 'retrying':
      return 'bg-accent/10 text-accent';
    case 'done':
      return 'bg-success/10 text-success';
    case 'failed':
      return 'bg-destructive/10 text-destructive';
  }
};

const getJobTypeIcon = (type: Job['type']) => {
  switch (type) {
    case 'GENERATE_SUMMARY':
      return <FileText className="w-5 h-5 text-study-summary" />;
    case 'GENERATE_FLASHCARDS':
      return <Layers className="w-5 h-5 text-study-flashcard" />;
  }
};

const getJobTypeLabel = (type: Job['type']) => {
  switch (type) {
    case 'GENERATE_SUMMARY':
      return 'Generate Summary';
    case 'GENERATE_FLASHCARDS':
      return 'Generate Flashcards';
  }
};

export default function AIJobs() {
  const { data: jobs = [], isLoading } = useJobs();
  const { data: materials = [] } = useAllMaterials();

  const getMaterialById = (id: string) => materials.find((m) => m.id === id);

  const activeJobs = jobs.filter(
    (j) => j.status === 'queued' || j.status === 'processing' || j.status === 'retrying'
  );
  const completedJobs = jobs.filter((j) => j.status === 'done');
  const failedJobs = jobs.filter((j) => j.status === 'failed');

  const renderJobCard = (job: Job) => {
    const inputMaterial = getMaterialById(job.inputMaterialId);
    const resultMaterial = job.resultMaterialId ? getMaterialById(job.resultMaterialId) : null;

    return (
      <Card key={job.id} className="study-card">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              {getJobTypeIcon(job.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium truncate">{getJobTypeLabel(job.type)}</h3>
                <Badge className={`${getStatusColor(job.status)} gap-1`}>
                  {getStatusIcon(job.status)}
                  {job.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                From: {inputMaterial?.title || 'Unknown material'}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span>Created: {new Date(job.createdAt).toLocaleString()}</span>
                {job.startedAt && (
                  <span>Started: {new Date(job.startedAt).toLocaleString()}</span>
                )}
                {job.finishedAt && (
                  <span>Finished: {new Date(job.finishedAt).toLocaleString()}</span>
                )}
              </div>
              {job.error && (
                <p className="text-sm text-destructive mt-2">{job.error}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {job.status === 'done' && resultMaterial && (
                <Link
                  to={`/app/materials/${resultMaterial.id}/${resultMaterial.type === 'flashcard_set' ? 'flashcards' : resultMaterial.type}`}
                >
                  <Button variant="outline" size="sm">
                    View Result
                  </Button>
                </Link>
              )}
              {job.status === 'failed' && (
                <Button variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Retry
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/app">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-accent" />
            AI Jobs
          </h1>
          <p className="text-muted-foreground">Track your AI-generated content</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="w-8 h-8" />}
          title="No AI jobs yet"
          description="Generate summaries or flashcards from your notes to see jobs here."
        />
      ) : (
        <div className="space-y-8">
          {/* Active Jobs */}
          {activeJobs.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-accent" />
                Active Jobs ({activeJobs.length})
              </h2>
              <div className="space-y-3">
                {activeJobs.map(renderJobCard)}
              </div>
            </div>
          )}

          {/* Completed Jobs */}
          {completedJobs.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                Completed ({completedJobs.length})
              </h2>
              <div className="space-y-3">
                {completedJobs.map(renderJobCard)}
              </div>
            </div>
          )}

          {/* Failed Jobs */}
          {failedJobs.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-destructive" />
                Failed ({failedJobs.length})
              </h2>
              <div className="space-y-3">
                {failedJobs.map(renderJobCard)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
