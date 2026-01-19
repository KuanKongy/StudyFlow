import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Group, Topic, Material, Job, Flashcard, User } from '@/types';

// Mock users
const mockUsers: User[] = [
  {
    id: 'user-1',
    authId: 'auth0|123',
    email: 'john@example.com',
    username: 'johndoe',
    createdAt: '2024-01-01T10:00:00Z',
    avatar: undefined,
  },
  {
    id: 'user-2',
    authId: 'auth0|456',
    email: 'jane@example.com',
    username: 'janesmith',
    createdAt: '2024-01-02T10:00:00Z',
    avatar: undefined,
  },
  {
    id: 'user-3',
    authId: 'auth0|789',
    email: 'bob@example.com',
    username: 'bobwilson',
    createdAt: '2024-01-03T10:00:00Z',
    avatar: undefined,
  },
];

const mockGroups: Group[] = [
  {
    id: 'group-1',
    name: 'CS 101 Study Group',
    joinCode: 'CS101-XYZ',
    ownerId: 'user-1',
    memberIds: ['user-1', 'user-2', 'user-3'],
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'group-2',
    name: 'Biology Lab Partners',
    joinCode: undefined, // Public group
    ownerId: 'user-2',
    memberIds: ['user-1', 'user-2'],
    createdAt: '2024-01-20T14:30:00Z',
  },
];

const mockTopics: Topic[] = [
  {
    id: 'topic-1',
    title: 'Binary Trees',
    description: 'Understanding tree data structures',
    privacy: 'group',
    groupIds: ['group-1'],
    ownerId: 'user-1',
    createdAt: '2024-01-16T09:00:00Z',
  },
  {
    id: 'topic-2',
    title: 'Graph Algorithms',
    description: 'BFS, DFS, Dijkstra, and more',
    privacy: 'group',
    groupIds: ['group-1', 'group-2'],
    ownerId: 'user-3',
    createdAt: '2024-01-17T11:00:00Z',
  },
  {
    id: 'topic-3',
    title: 'Personal Study Notes',
    description: 'My private collection',
    privacy: 'private',
    groupIds: undefined,
    ownerId: 'user-1',
    createdAt: '2024-01-10T08:00:00Z',
  },
];

const mockMaterials: Material[] = [
  {
    id: 'mat-1',
    topicId: 'topic-1',
    type: 'note',
    title: 'Binary Tree Fundamentals',
    ownerId: 'user-1',
    createdAt: '2024-01-16T09:30:00Z',
    updatedAt: '2024-01-18T14:00:00Z',
  },
  {
    id: 'mat-2',
    topicId: 'topic-1',
    type: 'summary',
    title: 'Binary Tree Summary',
    ownerId: 'user-1',
    derivedFrom: 'mat-1',
    createdAt: '2024-01-17T10:00:00Z',
    updatedAt: '2024-01-17T10:00:00Z',
  },
  {
    id: 'mat-3',
    topicId: 'topic-1',
    type: 'flashcard_set',
    title: 'Tree Traversal Flashcards',
    ownerId: 'user-1',
    derivedFrom: 'mat-1',
    createdAt: '2024-01-18T11:00:00Z',
    updatedAt: '2024-01-18T11:00:00Z',
  },
  {
    id: 'mat-4',
    topicId: 'topic-3',
    type: 'note',
    title: 'Quick Reference Notes',
    ownerId: 'user-1',
    createdAt: '2024-01-10T08:30:00Z',
    updatedAt: '2024-01-20T16:00:00Z',
  },
];

const mockJobs: Job[] = [
  {
    id: 'job-1',
    type: 'GENERATE_SUMMARY',
    status: 'processing',
    inputMaterialId: 'mat-4',
    ownerId: 'user-1',
    createdAt: '2024-01-20T16:00:00Z',
    startedAt: '2024-01-20T16:01:00Z',
  },
];

const mockFlashcards: Flashcard[] = [
  {
    id: 'fc-1',
    setId: 'mat-3',
    question: 'What is the time complexity of searching in a balanced BST?',
    answer: 'O(log n) - because we eliminate half the tree at each step.',
    createdAt: '2024-01-18T11:00:00Z',
  },
  {
    id: 'fc-2',
    setId: 'mat-3',
    question: 'What are the three types of tree traversal?',
    answer: 'Pre-order (root, left, right), In-order (left, root, right), Post-order (left, right, root)',
    createdAt: '2024-01-18T11:00:00Z',
  },
  {
    id: 'fc-3',
    setId: 'mat-3',
    question: 'What is the difference between a binary tree and a BST?',
    answer: 'A BST maintains ordering: left children < parent < right children. A binary tree has no ordering requirement.',
    createdAt: '2024-01-18T11:00:00Z',
  },
];

interface StudyContextType {
  users: User[];
  groups: Group[];
  topics: Topic[];
  materials: Material[];
  jobs: Job[];
  flashcards: Flashcard[];
  selectedGroupId: string | null;
  setSelectedGroupId: (id: string | null) => void;
  getUserById: (id: string) => User | undefined;
  getGroupById: (id: string) => Group | undefined;
  getTopicById: (id: string) => Topic | undefined;
  getMaterialById: (id: string) => Material | undefined;
  getTopicsByGroup: (groupId: string) => Topic[];
  getMaterialsByTopic: (topicId: string) => Material[];
  getFlashcardsBySet: (setId: string) => Flashcard[];
  getPrivateTopics: () => Topic[];
  getMyTopics: (userId: string) => Topic[];
  getMyNotes: (userId: string) => Material[];
  getMySummaries: (userId: string) => Material[];
  getMyFlashcardSets: (userId: string) => Material[];
  createGroup: (name: string, joinCode?: string) => Group;
  createTopic: (title: string, privacy: 'private' | 'group', groupIds?: string[]) => Topic;
  updateTopic: (topicId: string, updates: Partial<Topic>) => void;
  addTopicToGroup: (topicId: string, groupId: string) => void;
  removeTopicFromGroup: (topicId: string, groupId: string) => void;
  joinGroup: (groupId: string, joinCode: string) => boolean;
  kickMember: (groupId: string, userId: string) => void;
  createFlashcard: (setId: string, question: string, answer: string) => Flashcard;
  updateFlashcard: (flashcardId: string, question: string, answer: string) => void;
  deleteFlashcard: (flashcardId: string) => void;
  createFlashcardSet: (title: string, topicId?: string) => Material;
  createNote: (title: string, topicId?: string, content?: string) => Material;
  deleteGroup: (groupId: string) => void;
  updateGroup: (groupId: string, updates: Partial<Group>) => void;
  getMyGroups: (userId: string) => Group[];
}

const StudyContext = createContext<StudyContextType | undefined>(undefined);

export function StudyProvider({ children }: { children: ReactNode }) {
  const [users] = useState<User[]>(mockUsers);
  const [groups, setGroups] = useState<Group[]>(mockGroups);
  const [topics, setTopics] = useState<Topic[]>(mockTopics);
  const [materials, setMaterials] = useState<Material[]>(mockMaterials);
  const [jobs] = useState<Job[]>(mockJobs);
  const [flashcards, setFlashcards] = useState<Flashcard[]>(mockFlashcards);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const getUserById = (id: string) => users.find((u) => u.id === id);
  const getGroupById = (id: string) => groups.find((g) => g.id === id);
  const getTopicById = (id: string) => topics.find((t) => t.id === id);
  const getMaterialById = (id: string) => materials.find((m) => m.id === id);
  const getTopicsByGroup = (groupId: string) => topics.filter((t) => t.groupIds?.includes(groupId));
  const getMaterialsByTopic = (topicId: string) => materials.filter((m) => m.topicId === topicId);
  const getFlashcardsBySet = (setId: string) => flashcards.filter((f) => f.setId === setId);
  const getPrivateTopics = () => topics.filter((t) => t.privacy === 'private');
  
  const getMyTopics = (userId: string) => topics.filter((t) => t.ownerId === userId);
  const getMyNotes = (userId: string) => materials.filter((m) => m.ownerId === userId && m.type === 'note');
  const getMySummaries = (userId: string) => materials.filter((m) => m.ownerId === userId && m.type === 'summary');
  const getMyFlashcardSets = (userId: string) => materials.filter((m) => m.ownerId === userId && m.type === 'flashcard_set');

  const createGroup = (name: string, joinCode?: string): Group => {
    const newGroup: Group = {
      id: `group-${Date.now()}`,
      name,
      joinCode,
      ownerId: 'user-1',
      memberIds: ['user-1'],
      createdAt: new Date().toISOString(),
    };
    setGroups((prev) => [...prev, newGroup]);
    return newGroup;
  };

  const createTopic = (title: string, privacy: 'private' | 'group', groupIds?: string[]): Topic => {
    const newTopic: Topic = {
      id: `topic-${Date.now()}`,
      title,
      privacy,
      groupIds,
      ownerId: 'user-1',
      createdAt: new Date().toISOString(),
    };
    setTopics((prev) => [...prev, newTopic]);
    return newTopic;
  };

  const updateTopic = (topicId: string, updates: Partial<Topic>) => {
    setTopics((prev) => prev.map((t) => (t.id === topicId ? { ...t, ...updates } : t)));
  };

  const addTopicToGroup = (topicId: string, groupId: string) => {
    setTopics((prev) =>
      prev.map((t) => {
        if (t.id === topicId) {
          const currentGroups = t.groupIds || [];
          if (!currentGroups.includes(groupId)) {
            return { ...t, groupIds: [...currentGroups, groupId], privacy: 'group' as const };
          }
        }
        return t;
      })
    );
  };

  const removeTopicFromGroup = (topicId: string, groupId: string) => {
    setTopics((prev) =>
      prev.map((t) => {
        if (t.id === topicId) {
          const newGroups = (t.groupIds || []).filter((id) => id !== groupId);
          return {
            ...t,
            groupIds: newGroups.length > 0 ? newGroups : undefined,
            privacy: newGroups.length > 0 ? ('group' as const) : ('private' as const),
          };
        }
        return t;
      })
    );
  };

  const joinGroup = (groupId: string, joinCode: string): boolean => {
    const group = getGroupById(groupId);
    if (!group) return false;
    
    // If group has a join code, verify it
    if (group.joinCode && group.joinCode !== joinCode) {
      return false;
    }
    
    // Add current user to group
    if (!group.memberIds.includes('user-1')) {
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, memberIds: [...g.memberIds, 'user-1'] } : g))
      );
    }
    return true;
  };

  const kickMember = (groupId: string, userId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, memberIds: g.memberIds.filter((id) => id !== userId) } : g
      )
    );
  };

  const createFlashcard = (setId: string, question: string, answer: string): Flashcard => {
    const newFlashcard: Flashcard = {
      id: `fc-${Date.now()}`,
      setId,
      question,
      answer,
      createdAt: new Date().toISOString(),
    };
    setFlashcards((prev) => [...prev, newFlashcard]);
    return newFlashcard;
  };

  const updateFlashcard = (flashcardId: string, question: string, answer: string) => {
    setFlashcards((prev) =>
      prev.map((f) => (f.id === flashcardId ? { ...f, question, answer } : f))
    );
  };

  const deleteFlashcard = (flashcardId: string) => {
    setFlashcards((prev) => prev.filter((f) => f.id !== flashcardId));
  };

  const createFlashcardSet = (title: string, topicId?: string): Material => {
    const newMaterial: Material = {
      id: `mat-${Date.now()}`,
      type: 'flashcard_set',
      title,
      topicId,
      ownerId: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setMaterials((prev) => [...prev, newMaterial]);
    return newMaterial;
  };

  const createNote = (title: string, topicId?: string, content?: string): Material => {
    const newMaterial: Material = {
      id: `mat-${Date.now()}`,
      type: 'note',
      title,
      topicId,
      ownerId: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setMaterials((prev) => [...prev, newMaterial]);
    // Note: In a real app, you'd also create the note content record
    return newMaterial;
  };

  const deleteGroup = (groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  const updateGroup = (groupId: string, updates: Partial<Group>) => {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, ...updates } : g)));
  };

  const getMyGroups = (userId: string) => groups.filter((g) => g.memberIds.includes(userId));

  return (
    <StudyContext.Provider
      value={{
        users,
        groups,
        topics,
        materials,
        jobs,
        flashcards,
        selectedGroupId,
        setSelectedGroupId,
        getUserById,
        getGroupById,
        getTopicById,
        getMaterialById,
        getTopicsByGroup,
        getMaterialsByTopic,
        getFlashcardsBySet,
        getPrivateTopics,
        getMyTopics,
        getMyNotes,
        getMySummaries,
        getMyFlashcardSets,
        createGroup,
        createTopic,
        updateTopic,
        addTopicToGroup,
        removeTopicFromGroup,
        joinGroup,
        kickMember,
        createFlashcard,
        updateFlashcard,
        deleteFlashcard,
        createFlashcardSet,
        createNote,
        deleteGroup,
        updateGroup,
        getMyGroups,
      }}
    >
      {children}
    </StudyContext.Provider>
  );
}

export function useStudy() {
  const context = useContext(StudyContext);
  if (context === undefined) {
    throw new Error('useStudy must be used within a StudyProvider');
  }
  return context;
}
