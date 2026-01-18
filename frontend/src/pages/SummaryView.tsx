import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useStudy } from '@/contexts/StudyContext';
import { MaterialBadge } from '@/components/MaterialBadge';
import { PrivacyBadge } from '@/components/PrivacyBadge';

const sampleSummaryContent = `## Key Takeaways: Binary Trees
- A binary tree is a hierarchical data structure
- BST maintains ordering for efficient search
- Balanced trees: All operations O(log n)
`;

export default function SummaryView() {
  const { materialId } = useParams<{ materialId: string }>();
  const { getMaterialById, getTopicById, getGroupById, materials } = useStudy();

  const material = materialId ? getMaterialById(materialId) : null;
  if (!material) return <Navigate to="/app/topics" replace />;

  const topic = material.topicId ? getTopicById(material.topicId) : null;
  const group = topic?.groupIds?.[0] ? getGroupById(topic.groupIds[0]) : null;
  const parentMaterial = material.derivedFrom ? materials.find((m) => m.id === material.derivedFrom) : null;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Link to={material.topicId ? `/app/topics/${material.topicId}` : '/app'}>
          <Button variant="ghost" size="icon-sm"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{material.title}</h1>
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

      {parentMaterial && (
        <Card className="mb-6 bg-muted/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Generated from:</span>
              <span className="font-medium">{parentMaterial.title}</span>
            </div>
            <Link to={`/app/materials/${parentMaterial.id}/note`}>
              <Button variant="ghost" size="sm">View Original<ExternalLink className="w-3 h-3 ml-1" /></Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6">
          <div className="whitespace-pre-wrap font-mono text-sm">{sampleSummaryContent}</div>
        </CardContent>
      </Card>
    </div>
  );
}
