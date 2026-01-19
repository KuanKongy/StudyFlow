export interface User {
  id: string;
  authId: string;
  email: string;
  username: string;
  name?: string; // Display name
  createdAt: string;
  avatar?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  joinCode?: string; // If no code, then public, otherwise private
  ownerId: string;
  memberIds: string[];
  createdAt: string;
}

export interface Topic {
  id: string;
  title: string;
  name?: string; // Alias for title
  description?: string;
  privacy: 'private' | 'group';
  groupIds?: string[]; // Topic can be in multiple groups
  ownerId: string;
  createdAt: string;
  updatedAt?: string;
}

export type MaterialType = 'note' | 'flashcard_set' | 'summary';

export interface Summary {
  id: string;
  materialId: string;
  content: string;
}

export interface Material {
  id: string;
  type: MaterialType;
  title: string;
  description?: string;
  ownerId: string;
  topicId?: string;
  derivedFrom?: string; // ID of the input material (for AI-generated content)
  parentMaterialId?: string; // Alias for derivedFrom
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  materialId: string;
  content: string;
}

export interface FlashcardSet {
  id: string;
  materialId: string;
}

export interface Flashcard {
  id: string;
  setId: string;
  question: string;
  answer: string;
  createdAt: string;
}

export type JobStatus = 'pending' | 'processing' | 'done' | 'failed';
export type JobType = 'GENERATE_SUMMARY' | 'GENERATE_FLASHCARDS';

export interface Job {
  id: string;
  type: JobType;
  inputMaterialId: string;
  resultMaterialId?: string;
  ownerId: string;
  status: JobStatus;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
}
