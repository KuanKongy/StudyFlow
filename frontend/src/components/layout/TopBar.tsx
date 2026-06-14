import { Link } from 'react-router-dom';
import { LogOut, User, Cpu, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useJobs } from '@/hooks/useApi';

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { user, logout } = useAuth();
  const { data: jobs = [] } = useJobs();

  const activeJobs = jobs.filter((j) =>
    ['queued', 'pending', 'processing', 'retrying'].includes(j.status)
  );

  return (
    <header className="h-14 shrink-0 bg-card border-b border-border px-3 sm:px-4 flex items-center justify-between">
      {/* Left side - App name */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="truncate text-base font-semibold text-foreground sm:text-lg">StudyFlow</span>
      </div>

      {/* Right side - Jobs, notifications, user */}
      <div className="flex items-center gap-2">
        {/* Jobs Link */}
        <Link to="/app/jobs">
          <Button variant="ghost" size="icon-sm" className="relative">
            <Cpu className="w-5 h-5" />
            {activeJobs.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-accent-foreground text-xs rounded-full flex items-center justify-center">
                {activeJobs.length}
              </span>
            )}
          </Button>
        </Link>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 pl-2 pr-3">
              <Avatar className="w-7 h-7">
                <AvatarImage src={user?.avatar} alt={user?.username} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:inline">{user?.name || user?.username}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user?.name || user?.username}</span>
                <span className="text-xs font-normal text-muted-foreground">@{user?.username}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link to="/app/profile">
              <DropdownMenuItem>
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
            </Link>
            <Link to="/app/jobs">
              <DropdownMenuItem>
                <Cpu className="w-4 h-4 mr-2" />
                AI Jobs
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
