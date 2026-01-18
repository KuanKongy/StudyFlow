import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Lock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useStudy } from '@/contexts/StudyContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function CreateTopic() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { groups, createTopic } = useStudy();

  const initialPrivacy = searchParams.get('privacy') as 'private' | 'group' | null;
  const initialGroupId = searchParams.get('groupId');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'private' | 'group'>(
    initialGroupId ? 'group' : initialPrivacy || 'private'
  );
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(
    initialGroupId ? [initialGroupId] : []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Please enter a topic title');
      return;
    }

    if (privacy === 'group' && selectedGroupIds.length === 0) {
      toast.error('Please select at least one group');
      return;
    }

    setIsSubmitting(true);

    try {
      const topic = createTopic(
        title.trim(),
        privacy,
        privacy === 'group' ? selectedGroupIds : undefined
      );
      toast.success('Topic created successfully!');
      navigate(`/app/topics/${topic.id}`);
    } catch {
      toast.error('Failed to create topic');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-xl mx-auto animate-fade-in">
      <Button
        variant="ghost"
        size="sm"
        className="mb-6"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Create a Topic</CardTitle>
          <CardDescription>
            Organize your study materials into topics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Topic Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Binary Trees"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What will you study in this topic?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <Label>Visibility</Label>
              <RadioGroup
                value={privacy}
                onValueChange={(v) => setPrivacy(v as 'private' | 'group')}
                className="grid grid-cols-2 gap-4"
              >
                <label
                  htmlFor="private"
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors',
                    privacy === 'private'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  )}
                >
                  <RadioGroupItem value="private" id="private" />
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Private</span>
                  </div>
                </label>

                <label
                  htmlFor="group"
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors',
                    privacy === 'group'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  )}
                >
                  <RadioGroupItem value="group" id="group" />
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-accent" />
                    <span className="font-medium">Group</span>
                  </div>
                </label>
              </RadioGroup>
            </div>

            {privacy === 'group' && (
              <div className="space-y-2">
                <Label>Select Groups *</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  A topic can belong to multiple groups
                </p>
                <div className="space-y-2">
                  {groups.map((group) => (
                    <label
                      key={group.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                        selectedGroupIds.includes(group.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/50'
                      )}
                    >
                      <Checkbox
                        checked={selectedGroupIds.includes(group.id)}
                        onCheckedChange={() => handleGroupToggle(group.id)}
                      />
                      <span className="font-medium">{group.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? 'Creating...' : 'Create Topic'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
