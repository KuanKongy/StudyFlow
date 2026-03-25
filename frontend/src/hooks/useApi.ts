import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import * as api from '@/lib/api';

function useToken() {
  const { getToken } = useAuth();
  return getToken;
}

// ==================== Users ====================

export function useMe() {
  const getToken = useToken();
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.fetchMe(getToken),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUsers(authIds: string[]) {
  const getToken = useToken();
  return useQuery({
    queryKey: ['users', authIds],
    queryFn: () => api.batchFetchUsers(getToken, authIds),
    enabled: authIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateProfile() {
  const getToken = useToken();
  const qc = useQueryClient();
  const { refreshUser } = useAuth();
  return useMutation({
    mutationFn: (updates: { username?: string; name?: string; picture?: string; onboardedAt?: number }) =>
      api.updateProfile(getToken, updates),
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      await refreshUser();
    },
  });
}

export function useDeleteAccount() {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.deleteAccount(getToken),
    onSuccess: () => qc.clear(),
  });
}

// ==================== Groups ====================

export function useGroups() {
  const getToken = useToken();
  return useQuery({
    queryKey: ['groups'],
    queryFn: () => api.fetchGroups(getToken),
  });
}

export function useAvailableGroups() {
  const getToken = useToken();
  return useQuery({
    queryKey: ['groups', 'available'],
    queryFn: () => api.fetchAvailableGroups(getToken),
  });
}

export function useCreateGroup() {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, description, joinCode }: { name: string; description?: string; joinCode?: string }) =>
      api.createGroup(getToken, name, { description, joinCode }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useJoinGroup() {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (joinCode: string) => api.joinGroup(getToken, joinCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: ['topics'] });
    },
  });
}

export function useUpdateGroup() {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, updates }: { groupId: string; updates: Partial<api.TokenGetter extends never ? never : any> }) =>
      api.updateGroup(getToken, groupId, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useDeleteGroup() {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => api.deleteGroup(getToken, groupId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useAddMember() {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      api.addMember(getToken, groupId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useRemoveMember() {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      api.removeMember(getToken, groupId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useLeaveGroup() {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => api.leaveGroup(getToken, groupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: ['topics'] });
    },
  });
}

// ==================== Topics ====================

export function useTopics() {
  const getToken = useToken();
  return useQuery({
    queryKey: ['topics'],
    queryFn: () => api.fetchTopics(getToken),
  });
}

export function useCreateTopic() {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ title, description, groupIds }: { title: string; description: string; groupIds: string[] }) =>
      api.createTopic(getToken, title, description, groupIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['topics'] }),
  });
}

export function useUpdateTopic() {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ topicId, updates }: { topicId: string; updates: { title?: string; description?: string; groupIds?: string[] } }) =>
      api.updateTopic(getToken, topicId, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['topics'] }),
  });
}

export function useDeleteTopic() {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (topicId: string) => api.deleteTopic(getToken, topicId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['topics'] });
      qc.invalidateQueries({ queryKey: ['materials'] });
    },
  });
}

export function useBatchDeleteTopics() {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (topicIds: string[]) => api.batchDeleteTopics(getToken, topicIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['topics'] });
      qc.invalidateQueries({ queryKey: ['materials'] });
    },
  });
}

// ==================== Materials ====================

export function useAllMaterials(filter: 'all' | 'mine' | 'shared' = 'all') {
  const getToken = useToken();
  return useQuery({
    queryKey: ['materials', filter],
    queryFn: () => api.fetchAllMaterials(getToken, filter),
  });
}

export function useTopicMaterials(topicId: string | undefined) {
  const getToken = useToken();
  return useQuery({
    queryKey: ['materials', 'topic', topicId],
    queryFn: () => api.fetchTopicMaterials(getToken, topicId!),
    enabled: !!topicId,
  });
}

export function useMaterial(materialId: string | undefined) {
  const getToken = useToken();
  return useQuery({
    queryKey: ['material', materialId],
    queryFn: () => api.fetchMaterial(getToken, materialId!),
    enabled: !!materialId,
  });
}

export function useDeleteMaterial() {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (materialId: string) => api.deleteMaterial(getToken, materialId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materials'] });
      qc.invalidateQueries({ queryKey: ['topics'] });
    },
  });
}

export function useBatchDeleteMaterials() {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (materialIds: string[]) => api.batchDeleteMaterials(getToken, materialIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materials'] });
      qc.invalidateQueries({ queryKey: ['topics'] });
    },
  });
}

// ==================== Notes ====================

export function useNote(materialId: string | undefined) {
  const getToken = useToken();
  return useQuery({
    queryKey: ['note', materialId],
    queryFn: () => api.fetchNote(getToken, materialId!),
    enabled: !!materialId,
  });
}

export function useCreateNote() {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ title, topicId, content }: { title: string; topicId: string; content: string }) =>
      api.createNote(getToken, title, topicId, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materials'] });
      qc.invalidateQueries({ queryKey: ['topics'] });
    },
  });
}

export function useUpdateNote() {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ materialId, title, content }: { materialId: string; title: string; content: string }) =>
      api.updateNote(getToken, materialId, title, content),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['note', vars.materialId] });
      qc.invalidateQueries({ queryKey: ['material', vars.materialId] });
      qc.invalidateQueries({ queryKey: ['materials'] });
    },
  });
}

export function useDeleteNote() {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (materialId: string) => api.deleteNote(getToken, materialId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materials'] });
      qc.invalidateQueries({ queryKey: ['topics'] });
    },
  });
}

// ==================== Flashcards ====================

export function useFlashcardSet(materialId: string | undefined) {
  const getToken = useToken();
  return useQuery({
    queryKey: ['flashcard-set', materialId],
    queryFn: () => api.fetchFlashcardSet(getToken, materialId!),
    enabled: !!materialId,
  });
}

export function useFlashcards(setId: string | undefined) {
  const getToken = useToken();
  return useQuery({
    queryKey: ['flashcards', setId],
    queryFn: () => api.fetchFlashcards(getToken, setId!),
    enabled: !!setId,
  });
}

export function useUpdateFlashcard() {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, updates }: { cardId: string; updates: { question?: string; answer?: string; setId?: string } }) =>
      api.updateFlashcard(getToken, cardId, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['flashcards'] }),
  });
}

export function useCreateFlashcardSet() {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ title, topicId, cards }: { title: string; topicId: string; cards: { question: string; answer: string }[] }) =>
      api.createFlashcardSet(getToken, title, topicId, cards),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materials'] });
      qc.invalidateQueries({ queryKey: ['flashcards'] });
    },
  });
}

export function useCreateFlashcard() {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ setId, question, answer }: { setId: string; question: string; answer: string }) =>
      api.createFlashcard(getToken, setId, question, answer),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['flashcards'] }),
  });
}

export function useDeleteFlashcard() {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cardId: string) => api.deleteFlashcard(getToken, cardId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['flashcards'] }),
  });
}

// ==================== AI Jobs ====================

export function useJobs() {
  const getToken = useToken();
  return useQuery({
    queryKey: ['jobs'],
    queryFn: () => api.fetchJobs(getToken),
    refetchInterval: 5000,
  });
}

export function useGenerateFlashcards() {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (materialId: string) => api.generateFlashcards(getToken, materialId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  });
}

export function useGenerateSummary() {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (materialId: string) => api.generateSummary(getToken, materialId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  });
}
