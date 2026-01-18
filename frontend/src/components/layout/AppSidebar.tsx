import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BookOpen,
  Users,
  FolderOpen,
  Plus,
  ChevronDown,
  FileText,
  FileCheck,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useStudy } from '@/contexts/StudyContext';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export function AppSidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const { groups, getMyTopics, getMyNotes, getMySummaries, getMyFlashcardSets } = useStudy();
  const [groupsOpen, setGroupsOpen] = useState(true);
  const [topicsOpen, setTopicsOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(false);
  const [summariesOpen, setSummariesOpen] = useState(false);
  const [flashcardsOpen, setFlashcardsOpen] = useState(false);

  const myTopics = user ? getMyTopics(user.id) : [];
  const myNotes = user ? getMyNotes(user.id) : [];
  const mySummaries = user ? getMySummaries(user.id) : [];
  const myFlashcardSets = user ? getMyFlashcardSets(user.id) : [];

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col min-h-screen border-r border-sidebar-border">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        <Link to="/app" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg">StudyFlow</span>
        </Link>
        <ThemeToggle />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* My Groups */}
        <Collapsible open={groupsOpen} onOpenChange={setGroupsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between text-sidebar-muted hover:text-sidebar-foreground" size="sm">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                My Groups
              </span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", groupsOpen && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 mt-1">
            {groups.slice(0, 3).map((group) => (
              <Link key={group.id} to={`/app/groups/${group.id}`}>
                <Button
                  variant={location.pathname === `/app/groups/${group.id}` ? 'sidebar-active' : 'sidebar'}
                  className="w-full pl-8"
                  size="sm"
                >
                  <span className="truncate">{group.name}</span>
                </Button>
              </Link>
            ))}
            <Link to="/app/groups">
              <Button variant="sidebar" className="w-full pl-8 text-sidebar-muted" size="sm">
                View all ({groups.length})
              </Button>
            </Link>
          </CollapsibleContent>
        </Collapsible>

        {/* My Topics */}
        <Collapsible open={topicsOpen} onOpenChange={setTopicsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between text-sidebar-muted hover:text-sidebar-foreground" size="sm">
              <span className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                My Topics
              </span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", topicsOpen && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 mt-1">
            {myTopics.slice(0, 3).map((topic) => (
              <Link key={topic.id} to={`/app/topics/${topic.id}`}>
                <Button
                  variant={location.pathname === `/app/topics/${topic.id}` ? 'sidebar-active' : 'sidebar'}
                  className="w-full pl-8"
                  size="sm"
                >
                  <span className="truncate">{topic.title}</span>
                </Button>
              </Link>
            ))}
            <Link to="/app/topics">
              <Button variant="sidebar" className="w-full pl-8 text-sidebar-muted" size="sm">
                View all ({myTopics.length})
              </Button>
            </Link>
          </CollapsibleContent>
        </Collapsible>

        {/* My Notes */}
        <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between text-sidebar-muted hover:text-sidebar-foreground" size="sm">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                My Notes
              </span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", notesOpen && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 mt-1">
            {myNotes.slice(0, 3).map((note) => (
              <Link key={note.id} to={`/app/materials/${note.id}/note`}>
                <Button
                  variant={location.pathname === `/app/materials/${note.id}/note` ? 'sidebar-active' : 'sidebar'}
                  className="w-full pl-8"
                  size="sm"
                >
                  <span className="truncate">{note.title}</span>
                </Button>
              </Link>
            ))}
            <Link to="/app/notes">
              <Button variant="sidebar" className="w-full pl-8 text-sidebar-muted" size="sm">
                View all ({myNotes.length})
              </Button>
            </Link>
          </CollapsibleContent>
        </Collapsible>

        {/* My Summaries */}
        <Collapsible open={summariesOpen} onOpenChange={setSummariesOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between text-sidebar-muted hover:text-sidebar-foreground" size="sm">
              <span className="flex items-center gap-2">
                <FileCheck className="w-4 h-4" />
                My Summaries
              </span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", summariesOpen && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 mt-1">
            {mySummaries.slice(0, 3).map((summary) => (
              <Link key={summary.id} to={`/app/materials/${summary.id}/summary`}>
                <Button
                  variant={location.pathname === `/app/materials/${summary.id}/summary` ? 'sidebar-active' : 'sidebar'}
                  className="w-full pl-8"
                  size="sm"
                >
                  <span className="truncate">{summary.title}</span>
                </Button>
              </Link>
            ))}
            <Link to="/app/summaries">
              <Button variant="sidebar" className="w-full pl-8 text-sidebar-muted" size="sm">
                View all ({mySummaries.length})
              </Button>
            </Link>
          </CollapsibleContent>
        </Collapsible>

        {/* My Flashcards */}
        <Collapsible open={flashcardsOpen} onOpenChange={setFlashcardsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between text-sidebar-muted hover:text-sidebar-foreground" size="sm">
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                My Flashcards
              </span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", flashcardsOpen && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 mt-1">
            {myFlashcardSets.slice(0, 3).map((set) => (
              <Link key={set.id} to={`/app/materials/${set.id}/flashcards`}>
                <Button
                  variant={location.pathname === `/app/materials/${set.id}/flashcards` ? 'sidebar-active' : 'sidebar'}
                  className="w-full pl-8"
                  size="sm"
                >
                  <span className="truncate">{set.title}</span>
                </Button>
              </Link>
            ))}
            <Link to="/app/flashcards">
              <Button variant="sidebar" className="w-full pl-8 text-sidebar-muted" size="sm">
                View all ({myFlashcardSets.length})
              </Button>
            </Link>
          </CollapsibleContent>
        </Collapsible>
      </nav>
    </aside>
  );
}
