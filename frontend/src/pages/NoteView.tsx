import { useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Save, Sparkles, Layers, CheckCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useStudy } from '@/contexts/StudyContext';
import { MaterialBadge } from '@/components/MaterialBadge';
import { PrivacyBadge } from '@/components/PrivacyBadge';
import { toast } from 'sonner';

const sampleNoteContent = `# Binary Tree Fundamentals

A binary tree is a tree data structure where each node has at most two children.

## Key Properties
- **Height**: The longest path from root to leaf
- **Depth**: Distance from the root to a node

## Traversal Methods
- **Pre-order**: Root → Left → Right
- **In-order**: Left → Root → Right  
- **Post-order**: Left → Right → Root

## Implementation Notes
Binary trees can be implemented using:
1. Node-based structure with pointers
2. Array-based representation

### Node Structure
\`\`\`
class TreeNode {
  value: T
  left: TreeNode | null
  right: TreeNode | null
}
\`\`\`

## Time Complexities
| Operation | Average | Worst |
|-----------|---------|-------|
| Search    | O(log n)| O(n)  |
| Insert    | O(log n)| O(n)  |
| Delete    | O(log n)| O(n)  |
`;

export default function NoteView() {
  const { materialId } = useParams<{ materialId: string }>();
  const { getMaterialById, getTopicById, getGroupById } = useStudy();
  const [content, setContent] = useState(sampleNoteContent);
  const [isSaved, setIsSaved] = useState(true);
  const [isGenerating, setIsGenerating] = useState<'summary' | 'flashcards' | null>(null);

  const material = materialId ? getMaterialById(materialId) : null;

  if (!material || material.type !== 'note') {
    return <Navigate to="/app/topics" replace />;
  }

  const topic = material.topicId ? getTopicById(material.topicId) : null;
  const group = topic?.groupIds?.[0] ? getGroupById(topic.groupIds[0]) : null;

  const handleSave = () => {
    setIsSaved(true);
    toast.success('Note saved!');
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    setIsSaved(false);
  };

  const handleGenerateSummary = () => {
    setIsGenerating('summary');
    toast.info('Generating summary...');
    setTimeout(() => {
      setIsGenerating(null);
      toast.success('Summary generated!');
    }, 3000);
  };

  const handleGenerateFlashcards = () => {
    setIsGenerating('flashcards');
    toast.info('Generating flashcards...');
    setTimeout(() => {
      setIsGenerating(null);
      toast.success('Flashcards generated!');
    }, 3000);
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to={material.topicId ? `/app/topics/${material.topicId}` : '/app'}>
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{material.title}</h1>
              <MaterialBadge type="note" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              {topic && (
                <>
                  <span className="text-sm text-muted-foreground">{topic.title}</span>
                  <span className="text-muted-foreground">•</span>
                  <PrivacyBadge privacy={topic.privacy} groupName={group?.name} />
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* AI Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isGenerating !== null}>
                <Sparkles className="w-4 h-4 mr-2" />
                AI Actions
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleGenerateSummary} disabled={isGenerating !== null}>
                <Sparkles className="w-4 h-4 mr-2" />
                {isGenerating === 'summary' ? 'Generating...' : 'Generate Summary'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleGenerateFlashcards} disabled={isGenerating !== null}>
                <Layers className="w-4 h-4 mr-2" />
                {isGenerating === 'flashcards' ? 'Generating...' : 'Generate Flashcards'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaved}>
            {isSaved ? (
              <>
                <CheckCircle className="w-4 h-4 mr-1 text-success" />
                Saved
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="p-0 flex-1 overflow-hidden">
          <Textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            className="h-full min-h-[500px] border-0 rounded-lg font-mono text-sm resize-none focus-visible:ring-0 overflow-auto"
            placeholder="Start writing..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
