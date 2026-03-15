import { useState } from 'react';
import { ArrowLeft, Camera, User, Mail, Calendar, Save, Trash2, AtSign } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useDeleteAccount, useUpdateProfile } from '@/hooks/useApi';
import { toast } from 'sonner';
import { validateUsername, validateDisplayName, LIMITS } from '@/lib/validation';
import { CharCounter } from '@/components/CharCounter';

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const deleteAccountMutation = useDeleteAccount();
  const updateProfileMutation = useUpdateProfile();

  const [username, setUsername] = useState(user?.username || '');
  const [name, setName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');
  const [avatarInput, setAvatarInput] = useState(user?.avatar || '');
  const [isEditing, setIsEditing] = useState(false);

  const usernameValidation = validateUsername(username);
  const displayNameValidation = validateDisplayName(name);

  const handleSave = async () => {
    if (!usernameValidation.valid) {
      toast.error(usernameValidation.error);
      return;
    }
    if (!displayNameValidation.valid) {
      toast.error(displayNameValidation.error);
      return;
    }
    try {
      await updateProfileMutation.mutateAsync({ username, name });
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update profile');
    }
  };

  const handleAvatarSave = async () => {
    const url = avatarInput.trim();
    try {
      await updateProfileMutation.mutateAsync({ picture: url || null as any });
      setAvatarUrl(url);
      toast.success('Avatar updated!');
    } catch {
      toast.error('Failed to update avatar');
    }
  };

  const handleRandomAvatar = async () => {
    const newAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`;
    try {
      await updateProfileMutation.mutateAsync({ picture: newAvatar });
      setAvatarUrl(newAvatar);
      setAvatarInput(newAvatar);
      toast.success('Avatar updated!');
    } catch {
      toast.error('Failed to update avatar');
    }
  };

  const handleDeleteAccount = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await deleteAccountMutation.mutateAsync();
      toast.success('Account deleted');
      navigate('/login', { replace: true });
      window.location.reload();
    } catch {
      toast.error('Failed to delete account');
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/app">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-muted-foreground">Manage your account settings</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Avatar Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile Picture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="absolute -bottom-1 -right-1 rounded-full"
                  onClick={handleRandomAvatar}
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-1">
                <p className="font-medium">{user?.name || user?.username}</p>
                <p className="text-sm text-muted-foreground">@{user?.username}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Avatar URL</Label>
              <div className="flex gap-2">
                <Input
                  value={avatarInput}
                  onChange={(e) => setAvatarInput(e.target.value)}
                  placeholder="https://example.com/avatar.png"
                />
                <Button variant="outline" size="sm" onClick={handleAvatarSave}>
                  Save
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={handleRandomAvatar}>
                Random Avatar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Details */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Account Details</CardTitle>
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="username" className="flex items-center gap-2">
                  <AtSign className="w-4 h-4" />
                  Username
                </Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={!isEditing}
                  maxLength={LIMITS.USERNAME}
                />
                <div className="flex items-center justify-between">
                  {isEditing && !usernameValidation.valid && (
                    <p className="text-xs text-destructive">{usernameValidation.error}</p>
                  )}
                  {isEditing && <CharCounter current={username.length} max={LIMITS.USERNAME} />}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Display Name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Your display name"
                  maxLength={LIMITS.DISPLAY_NAME}
                />
                <div className="flex items-center justify-between">
                  {isEditing && !displayNameValidation.valid && (
                    <p className="text-xs text-destructive">{displayNameValidation.error}</p>
                  )}
                  {isEditing && <CharCounter current={name.length} max={LIMITS.DISPLAY_NAME} />}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input value={user?.email || ''} disabled />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Member Since
              </Label>
              <Input
                value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''}
                disabled
              />
            </div>

            {isEditing && (
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} disabled={!usernameValidation.valid || !displayNameValidation.valid}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => {
                  setIsEditing(false);
                  setUsername(user?.username || '');
                  setName(user?.name || '');
                }}>
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Account */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Delete Account</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your account and all your data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deleteAccountMutation.isPending}
                  >
                    {deleteAccountMutation.isPending ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
