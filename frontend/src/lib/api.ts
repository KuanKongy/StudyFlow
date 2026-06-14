import type { User, Group, Topic, Material, Note, FlashcardSet, Flashcard, Job } from '@/types';

export type TokenGetter = () => Promise<string>;

function ts(epoch: number | string): string {
  if (typeof epoch === 'string') return epoch;
  return new Date(epoch).toISOString();
}

function mapUser(raw: any): User {
  if (!raw) return raw;
  return {
    id: raw.authId,
    mongoId: raw._id?.toString?.() ?? raw._id,
    authId: raw.authId,
    email: raw.email ?? '',
    username: raw.username ?? raw.email?.split('@')[0] ?? 'user',
    name: raw.name ?? raw.username,
    createdAt: ts(raw.createdAt),
    avatar: raw.picture ?? undefined,
    onboardedAt: raw.onboardedAt ? ts(raw.onboardedAt) : raw.onboardedAt ?? null,
  };
}

function mapGroup(raw: any): Group {
  if (!raw) return raw;
  return {
    id: (raw._id ?? raw.groupId)?.toString?.() ?? raw._id ?? raw.groupId,
    name: raw.name,
    description: raw.description,
    avatar: raw.avatar ?? undefined,
    joinCode: raw.joinCode ?? null,
    ownerId: raw.ownerId,
    memberIds: raw.memberIds ?? [],
    createdAt: ts(raw.createdAt),
    updatedAt: raw.updatedAt ? ts(raw.updatedAt) : undefined,
  };
}

function mapTopic(raw: any): Topic {
  if (!raw) return raw;
  const groupIds = (raw.groupIds ?? []).map((id: any) => id?.toString?.() ?? id);
  return {
    id: raw._id?.toString?.() ?? raw._id,
    title: raw.title,
    description: raw.description,
    privacy: groupIds.length > 0 ? 'group' : 'private',
    groupIds,
    ownerId: raw.ownerId,
    createdAt: ts(raw.createdAt),
    updatedAt: raw.updatedAt ? ts(raw.updatedAt) : undefined,
  };
}

const MAT_TYPE_MAP: Record<string, string> = {
  flashcardSet: 'flashcard_set',
  note: 'note',
  summary: 'summary',
};

function mapMaterial(raw: any): Material {
  if (!raw) return raw;
  return {
    id: raw._id?.toString?.() ?? raw._id,
    type: (MAT_TYPE_MAP[raw.type] ?? raw.type) as Material['type'],
    title: raw.title,
    description: raw.description,
    ownerId: raw.ownerId,
    topicId: raw.topicId?.toString?.() ?? raw.topicId ?? undefined,
    derivedFrom: raw.derivedFrom?.toString?.() ?? raw.derivedFrom ?? undefined,
    createdAt: ts(raw.createdAt),
    updatedAt: ts(raw.updatedAt),
    isOwner: raw.isOwner,
  };
}

function mapNote(raw: any): Note {
  if (!raw) return raw;
  return {
    id: raw._id?.toString?.() ?? raw._id,
    materialId: raw.materialId?.toString?.() ?? raw.materialId,
    content: raw.content ?? '',
  };
}

function mapFlashcardSet(raw: any): FlashcardSet {
  if (!raw) return raw;
  return {
    id: raw._id?.toString?.() ?? raw._id,
    materialId: raw.materialId?.toString?.() ?? raw.materialId,
  };
}

function mapFlashcard(raw: any): Flashcard {
  if (!raw) return raw;
  return {
    id: raw._id?.toString?.() ?? raw._id,
    setId: raw.setId?.toString?.() ?? raw.setId,
    question: raw.question,
    answer: raw.answer,
    createdAt: ts(raw.createdAt),
  };
}

function mapJob(raw: any): Job {
  if (!raw) return raw;
  return {
    id: raw._id?.toString?.() ?? raw._id,
    type: raw.type,
    inputMaterialId: raw.inputMaterialId?.toString?.() ?? raw.inputMaterialId,
    resultMaterialId: raw.resultMaterialId?.toString?.() ?? raw.resultMaterialId ?? undefined,
    ownerId: raw.ownerId,
    status: raw.status,
    createdAt: ts(raw.createdAt),
    startedAt: raw.startedAt ? ts(raw.startedAt) : undefined,
    finishedAt: raw.finishedAt ? ts(raw.finishedAt) : undefined,
    error: raw.error,
  };
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

async function apiFetch<T>(
  path: string,
  getToken: TokenGetter,
  options?: RequestInit,
): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const err = new Error(body.error || body.message || res.statusText);
    (err as any).status = res.status;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ==================== Users ====================

export async function fetchMe(getToken: TokenGetter): Promise<User> {
  const raw = await apiFetch('/api/me', getToken);
  return mapUser(raw);
}

export async function batchFetchUsers(getToken: TokenGetter, authIds: string[]): Promise<User[]> {
  const raw = await apiFetch<any[]>('/api/users/batch', getToken, {
    method: 'POST',
    body: JSON.stringify({ authIds }),
  });
  return raw.map(mapUser);
}

export async function updateProfile(
  getToken: TokenGetter,
  updates: { username?: string; name?: string; picture?: string; onboardedAt?: number },
): Promise<User> {
  const raw = await apiFetch('/api/me', getToken, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return mapUser(raw);
}

export async function deleteAccount(getToken: TokenGetter): Promise<void> {
  await apiFetch('/api/account', getToken, { method: 'DELETE' });
}

// ==================== Groups ====================

export async function fetchGroups(getToken: TokenGetter): Promise<Group[]> {
  const raw = await apiFetch<any[]>('/api/groups', getToken);
  return raw.map(mapGroup);
}

export async function fetchAvailableGroups(getToken: TokenGetter): Promise<Group[]> {
  const raw = await apiFetch<any[]>('/api/groups/available', getToken);
  return raw.map(mapGroup);
}

export async function createGroup(
  getToken: TokenGetter,
  name: string,
  opts?: { description?: string; joinCode?: string },
): Promise<Group> {
  const raw = await apiFetch('/api/groups', getToken, {
    method: 'POST',
    body: JSON.stringify({ name, description: opts?.description, joinCode: opts?.joinCode || undefined }),
  });
  return mapGroup(raw);
}

export async function joinGroup(getToken: TokenGetter, joinCode: string): Promise<Group> {
  const raw: any = await apiFetch('/api/groups/join', getToken, {
    method: 'POST',
    body: JSON.stringify({ joinCode }),
  });
  return mapGroup(raw.group);
}

export async function updateGroup(getToken: TokenGetter, groupId: string, updates: Partial<Group>): Promise<void> {
  await apiFetch(`/api/groups/${groupId}`, getToken, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteGroup(getToken: TokenGetter, groupId: string): Promise<void> {
  await apiFetch(`/api/groups/${groupId}`, getToken, { method: 'DELETE' });
}

export async function addMember(getToken: TokenGetter, groupId: string, userId: string): Promise<void> {
  await apiFetch(`/api/groups/${groupId}/members`, getToken, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export async function removeMember(getToken: TokenGetter, groupId: string, userId: string): Promise<void> {
  await apiFetch(`/api/groups/${groupId}/members`, getToken, {
    method: 'DELETE',
    body: JSON.stringify({ userId }),
  });
}

export async function leaveGroup(getToken: TokenGetter, groupId: string): Promise<void> {
  await apiFetch(`/api/groups/${groupId}/leave`, getToken, { method: 'POST' });
}

// ==================== Topics ====================

export async function fetchTopics(getToken: TokenGetter): Promise<Topic[]> {
  const raw = await apiFetch<any[]>('/api/topics', getToken);
  return raw.map(mapTopic);
}

export async function createTopic(
  getToken: TokenGetter,
  title: string,
  description: string,
  groupIds: string[],
): Promise<Topic> {
  const raw = await apiFetch('/api/topics', getToken, {
    method: 'POST',
    body: JSON.stringify({ title, description, groupIds }),
  });
  return mapTopic(raw);
}

export async function updateTopic(
  getToken: TokenGetter,
  topicId: string,
  updates: { title?: string; description?: string; groupIds?: string[] },
): Promise<Topic> {
  const raw = await apiFetch(`/api/topics/${topicId}`, getToken, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return mapTopic(raw);
}

export async function deleteTopic(getToken: TokenGetter, topicId: string): Promise<void> {
  await apiFetch(`/api/topics/${topicId}`, getToken, { method: 'DELETE' });
}

export async function batchDeleteTopics(getToken: TokenGetter, topicIds: string[]): Promise<void> {
  await apiFetch('/api/topics/batch-delete', getToken, {
    method: 'POST',
    body: JSON.stringify({ topicIds }),
  });
}

// ==================== Materials ====================

export async function fetchAllMaterials(
  getToken: TokenGetter,
  filter: 'all' | 'mine' | 'shared' = 'all',
): Promise<Material[]> {
  const raw = await apiFetch<any[]>(`/api/materials?filter=${filter}`, getToken);
  return raw.map(mapMaterial);
}

export async function fetchTopicMaterials(getToken: TokenGetter, topicId: string): Promise<Material[]> {
  const raw = await apiFetch<any[]>(`/api/topics/${topicId}/materials`, getToken);
  return raw.map(mapMaterial);
}

export async function fetchMaterial(getToken: TokenGetter, materialId: string): Promise<Material> {
  const raw = await apiFetch(`/api/materials/${materialId}`, getToken);
  return mapMaterial(raw);
}

// ==================== Notes ====================

export async function fetchNote(getToken: TokenGetter, materialId: string): Promise<Note> {
  const raw = await apiFetch(`/api/materials/${materialId}/note`, getToken);
  return mapNote(raw);
}

export async function createNote(
  getToken: TokenGetter,
  title: string,
  topicId: string,
  content: string,
): Promise<{ materialId: string }> {
  return apiFetch('/api/notes', getToken, {
    method: 'POST',
    body: JSON.stringify({ title, topicId, content }),
  });
}

export async function updateNote(
  getToken: TokenGetter,
  materialId: string,
  title: string,
  content: string,
): Promise<void> {
  await apiFetch(`/api/materials/${materialId}/note`, getToken, {
    method: 'PUT',
    body: JSON.stringify({ title, content }),
  });
}

export async function deleteNote(getToken: TokenGetter, materialId: string): Promise<void> {
  await apiFetch(`/api/materials/${materialId}/note`, getToken, { method: 'DELETE' });
}

export async function deleteMaterial(getToken: TokenGetter, materialId: string): Promise<void> {
  await apiFetch(`/api/materials/${materialId}`, getToken, { method: 'DELETE' });
}

export async function batchDeleteMaterials(getToken: TokenGetter, materialIds: string[]): Promise<void> {
  await apiFetch('/api/materials/batch-delete', getToken, {
    method: 'POST',
    body: JSON.stringify({ materialIds }),
  });
}

// ==================== Flashcards ====================

export async function fetchFlashcardSet(getToken: TokenGetter, materialId: string): Promise<FlashcardSet> {
  const raw = await apiFetch(`/api/materials/${materialId}/flashcard-set`, getToken);
  return mapFlashcardSet(raw);
}

export async function fetchFlashcards(getToken: TokenGetter, setId: string): Promise<Flashcard[]> {
  const raw = await apiFetch<any[]>(`/api/flashcard-sets/${setId}/cards`, getToken);
  return raw.map(mapFlashcard);
}

export async function updateFlashcard(
  getToken: TokenGetter,
  cardId: string,
  updates: { question?: string; answer?: string; setId?: string },
): Promise<void> {
  await apiFetch(`/api/materials/${cardId}/cards`, getToken, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function createFlashcardSet(
  getToken: TokenGetter,
  title: string,
  topicId: string,
  cards: { question: string; answer: string }[],
): Promise<{ materialId: string; setId: string }> {
  return apiFetch('/api/flashcard-sets', getToken, {
    method: 'POST',
    body: JSON.stringify({ title, topicId, cards }),
  });
}

export async function createFlashcard(
  getToken: TokenGetter,
  setId: string,
  question: string,
  answer: string,
): Promise<Flashcard> {
  const raw = await apiFetch(`/api/flashcard-sets/${setId}/cards`, getToken, {
    method: 'POST',
    body: JSON.stringify({ question, answer }),
  });
  return mapFlashcard(raw);
}

export async function deleteFlashcard(getToken: TokenGetter, cardId: string): Promise<void> {
  await apiFetch(`/api/flashcards/${cardId}`, getToken, { method: 'DELETE' });
}

// ==================== AI Jobs ====================

export async function fetchJobs(getToken: TokenGetter): Promise<Job[]> {
  const raw = await apiFetch<any[]>('/api/jobs', getToken);
  return raw.map(mapJob);
}

export async function fetchJobStatus(getToken: TokenGetter, jobId: string): Promise<{ status: string }> {
  return apiFetch(`/api/jobs/${jobId}`, getToken);
}

export async function generateFlashcards(getToken: TokenGetter, materialId: string): Promise<{ jobId: string }> {
  return apiFetch(`/api/materials/${materialId}/flashcards`, getToken, { method: 'POST' });
}

export async function generateSummary(getToken: TokenGetter, materialId: string): Promise<{ jobId: string }> {
  return apiFetch(`/api/materials/${materialId}/summary`, getToken, { method: 'POST' });
}
