export interface User {
  id: string;         // authId (Auth0 sub) — used for ownerId/memberIds comparison
  mongoId: string;    // MongoDB _id
  authId: string;
  email: string;
  username: string;
  name?: string;
  createdAt: string;
  avatar?: string;
  onboardedAt?: string | null;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  joinCode?: string | null;
  ownerId: string;
  memberIds: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface Topic {
  id: string;
  title: string;
  description?: string;
  privacy: 'private' | 'group';
  groupIds: string[];
  ownerId: string;
  createdAt: string;
  updatedAt?: string;
}

export type MaterialType = 'note' | 'flashcard_set' | 'summary';

export interface Material {
  id: string;
  type: MaterialType;
  title: string;
  description?: string;
  ownerId: string;
  topicId?: string;
  derivedFrom?: string;
  createdAt: string;
  updatedAt: string;
  isOwner?: boolean;
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

export type JobStatus = 'queued' | 'processing' | 'done' | 'failed' | 'retrying';
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
