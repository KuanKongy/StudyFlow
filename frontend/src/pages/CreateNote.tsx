import { useState } from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTopics, useCreateNote } from '@/hooks/useApi';
import { toast } from 'sonner';
import { CharCounter } from '@/components/CharCounter';
import { LIMITS } from '@/lib/validation';

export default function CreateNote() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const topicIdFromUrl = searchParams.get('topicId');

  const { data: topics = [] } = useTopics();
  const createNote = useCreateNote();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [topicId, setTopicId] = useState(topicIdFromUrl || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (!topicId) {
      toast.error('Please pick a topic — every note lives inside one');
      return;
    }
    if (!content.trim()) {
      toast.error('Please write some content first');
      return;
    }

    try {
      const result = await createNote.mutateAsync({
        title: title.trim(),
        topicId,
        content,
      });
      toast.success(`Created "${title}"!`);
      navigate(`/app/materials/${result.materialId}/note`);
    } catch {
      toast.error('Failed to create note');
    }
  };

  return (
    <div className="px-4 py-5 sm:p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <Link to={topicIdFromUrl ? `/app/topics/${topicIdFromUrl}` : '/app'}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-study-note" />
            Create Note
          </h1>
          <p className="text-muted-foreground">Start a new note</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Note Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Chapter 1 Notes"
                maxLength={LIMITS.NOTE_TITLE}
              />
              <CharCounter current={title.length} max={LIMITS.NOTE_TITLE} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic">Topic *</Label>
              <Select value={topicId || undefined} onValueChange={setTopicId}>
                <SelectTrigger id="topic">
                  <SelectValue placeholder="Select a topic" />
                </SelectTrigger>
                <SelectContent>
                  {topics.map((topic) => (
                    <SelectItem key={topic.id} value={topic.id}>
                      {topic.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {topics.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  You don't have any topics yet —{' '}
                  <Link to="/app/topics/new" className="text-primary underline">create one first</Link>.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Start writing your note..."
                rows={10}
                className="font-mono text-sm"
                maxLength={LIMITS.NOTE_CONTENT}
              />
              <CharCounter current={content.length} max={LIMITS.NOTE_CONTENT} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={createNote.isPending}>
            Create Note
          </Button>
          <Link to={topicIdFromUrl ? `/app/topics/${topicIdFromUrl}` : '/app'}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
