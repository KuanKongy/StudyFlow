import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Globe, Lock, Copy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useCreateGroup } from '@/hooks/useApi';
import { toast } from 'sonner';
import { CharCounter } from '@/components/CharCounter';
import { LIMITS } from '@/lib/validation';

function generateJoinCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function CreateGroup() {
  const navigate = useNavigate();
  const createGroupMutation = useCreateGroup();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [joinCode, setJoinCode] = useState(generateJoinCode());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    try {
      const group = await createGroupMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        joinCode: isPrivate ? joinCode : undefined,
      });
      toast.success('Group created successfully!');
      navigate(`/app/groups/${group.id}`);
    } catch {
      toast.error('Failed to create group');
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
          <CardTitle>Create a Study Group</CardTitle>
          <CardDescription>
            Invite classmates to collaborate on study materials together.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Group Name *</Label>
              <Input
                id="name"
                placeholder="e.g., CS 101 Study Group"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={LIMITS.GROUP_NAME}
                autoFocus
              />
              <CharCounter current={name.length} max={LIMITS.GROUP_NAME} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What will your group be studying?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={LIMITS.GROUP_DESCRIPTION}
              />
              <CharCounter current={description.length} max={LIMITS.GROUP_DESCRIPTION} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isPrivate ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                  <Label htmlFor="visibility">
                    {isPrivate ? 'Private — join by code only' : 'Public — anyone can browse and join'}
                  </Label>
                </div>
                <Switch
                  id="visibility"
                  checked={isPrivate}
                  onCheckedChange={setIsPrivate}
                />
              </div>

              {isPrivate && (
                <div className="space-y-2 rounded-lg border p-3 bg-muted/50">
                  <Label htmlFor="joinCode">Join Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="joinCode"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      className="font-mono tracking-wider"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={() => setJoinCode(generateJoinCode())} title="Regenerate code">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button type="button" variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(joinCode); toast.success('Code copied!'); }} title="Copy code">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Share this code with people you want to invite.</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createGroupMutation.isPending}
                className="flex-1"
              >
                {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
