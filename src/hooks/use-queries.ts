// MGK Transport - React Query Hooks
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  DashboardStats,
  Chauffeur,
  Vehicule,
  Client,
  Facture,
  Alerte,
  Parametre,
  TypeDocumentPersonnalise,
  TypeEntretienPersonnalise,
  ApiResponse,
  PaginatedResponse,
  BulletinPaie,
} from '@/types';

// ==================== QUERY KEYS ====================

export const queryKeys = {
  dashboard: ['dashboard'] as const,
  dashboardStats: () => [...queryKeys.dashboard, 'stats'] as const,
  chauffeurs: ['chauffeurs'] as const,
  chauffeur: (id: string) => [...queryKeys.chauffeurs, id] as const,
  vehicules: ['vehicules'] as const,
  vehicule: (id: string) => [...queryKeys.vehicules, id] as const,
  clients: ['clients'] as const,
  client: (id: string) => [...queryKeys.clients, id] as const,
  factures: ['factures'] as const,
  facture: (id: string) => [...queryKeys.factures, id] as const,
  alertes: ['alertes'] as const,
  alerte: (id: string) => [...queryKeys.alertes, id] as const,
  parametres: ['parametres'] as const,
  typesDocuments: ['typesDocuments'] as const,
  typesEntretien: ['typesEntretien'] as const,
  primes: ['primes'] as const,
  avances: ['avances'] as const,
  salaires: ['salaires'] as const,
  documents: ['documents'] as const,
  bulletinsPaie: ['bulletinsPaie'] as const,
  bulletinPaie: (id: string) => [...queryKeys.bulletinsPaie, id] as const,
};

// ==================== API FETCHER UTILITIES ====================

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      success: false,
      error: 'Une erreur est survenue',
    }));
    throw new Error(error.error || 'Une erreur est survenue');
  }

  return response.json();
}

// ==================== DASHBOARD HOOKS ====================

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: queryKeys.dashboardStats(),
    queryFn: () => fetchApi<DashboardStats>('/dashboard/stats'),
    staleTime: 5 * 60 * 1000,
  });
}

// ==================== CHAUFFEUR HOOKS ====================

export function useChauffeurs(params?: {
  actif?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery<PaginatedResponse<Chauffeur>>({
    queryKey: ['chauffeurs', 'list', params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.actif !== undefined) searchParams.set('actif', String(params.actif));
      if (params?.search) searchParams.set('search', params.search);
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
      return fetchApi<PaginatedResponse<Chauffeur>>(`/chauffeurs?${searchParams.toString()}`);
    },
    staleTime: 30 * 1000,
  });
}

export function useChauffeur(id: string) {
  return useQuery<Chauffeur>({
    queryKey: queryKeys.chauffeur(id),
    queryFn: async () => {
      const response = await fetchApi<ApiResponse<Chauffeur>>(`/chauffeurs/${id}`);
      if (!response.data) throw new Error('Chauffeur non trouvé');
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateChauffeur() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      fetchApi<ApiResponse<Chauffeur>>('/chauffeurs', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chauffeurs });
    },
  });
}

export function useCreateChauffeurWithFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/chauffeurs', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header, let the browser set it with boundary
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la création du chauffeur');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chauffeurs });
    },
  });
}

export function useUpdateChauffeur() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetchApi<ApiResponse<Chauffeur>>(`/chauffeurs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chauffeur(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.chauffeurs });
    },
  });
}

export function useDeleteChauffeur() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<ApiResponse<void>>(`/chauffeurs/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chauffeurs });
    },
  });
}

// ==================== VEHICULE HOOKS ====================

export function useVehicules(params?: { actif?: boolean; search?: string; page?: number }) {
  return useQuery<PaginatedResponse<Vehicule>>({
    queryKey: ['vehicules', 'list', params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.actif !== undefined) searchParams.set('actif', String(params.actif));
      if (params?.search) searchParams.set('search', params.search);
      if (params?.page) searchParams.set('page', String(params.page));
      return fetchApi<PaginatedResponse<Vehicule>>(`/vehicules?${searchParams.toString()}`);
    },
  });
}

export function useVehicule(id: string) {
  return useQuery<Vehicule>({
    queryKey: queryKeys.vehicule(id),
    queryFn: async () => {
      const response = await fetchApi<ApiResponse<Vehicule>>(`/vehicules/${id}`);
      if (!response.data) throw new Error('Véhicule non trouvé');
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateVehicule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      fetchApi<ApiResponse<Vehicule>>('/vehicules', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicules });
    },
  });
}

export function useUpdateVehicule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetchApi<ApiResponse<Vehicule>>(`/vehicules/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicule(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicules });
    },
  });
}

export function useDeleteVehicule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<ApiResponse<void>>(`/vehicules/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicules });
    },
  });
}

// ==================== ALERTE HOOKS ====================

export function useAlertes(params?: { lu?: boolean }) {
  return useQuery<Alerte[]>({
    queryKey: ['alertes', 'list', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.lu !== undefined) searchParams.set('lu', String(params.lu));
      const response = await fetchApi<ApiResponse<Alerte[]>>(`/alertes?${searchParams.toString()}`);
      return response.data || [];
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useMarkAlertAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<ApiResponse<Alerte>>(`/alertes/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ lu: true }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alertes });
    },
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<ApiResponse<Alerte>>(`/alertes/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ resolute: true }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alertes });
    },
  });
}

export function useUpdateAlerte() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { lu?: boolean; resolute?: boolean } }) =>
      fetchApi<ApiResponse<Alerte>>(`/alertes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alertes });
    },
  });
}

export function useDeleteAlerte() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<ApiResponse<void>>(`/alertes/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alertes });
    },
  });
}

export function useCheckDocumentAlerts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchApi<ApiResponse<{ 
        documents: number; 
        factures: number; 
        entretiens: number; 
        contratsCDD: number;
        chauffeursDesactivates: number;
        total: number;
      }>>(
        '/alertes/check-documents',
        { method: 'POST' }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alertes });
      // Also invalidate chauffeurs in case any were deactivated due to expired CDD contracts
      queryClient.invalidateQueries({ queryKey: queryKeys.chauffeurs });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
    },
  });
}

// ==================== PRIMES HOOKS ====================

export function usePrimes(chauffeurId: string) {
  return useQuery({
    queryKey: [...queryKeys.primes, chauffeurId],
    queryFn: async () => {
      const response = await fetchApi<ApiResponse<any[]>>(`/chauffeurs/${chauffeurId}/primes`);
      return response.data || [];
    },
    enabled: !!chauffeurId,
  });
}

export function useCreatePrime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ chauffeurId, ...data }: { chauffeurId: string; motif: string; montant: number; date: string }) =>
      fetchApi<ApiResponse<any>>(`/chauffeurs/${chauffeurId}/primes`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { chauffeurId }) => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.primes, chauffeurId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.chauffeur(chauffeurId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.chauffeurs });
      // Invalider les salaires pour mettre à jour les montants recalculés
      queryClient.invalidateQueries({ queryKey: [...queryKeys.salaires, chauffeurId] });
      // Invalider tous les previews de salaire pour ce chauffeur
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && 
            key[0] === 'salaires' && 
            key[1] === 'preview' && 
            key[2] === chauffeurId;
        }
      });
    },
  });
}

export function useUpdatePrime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, chauffeurId, data }: { id: string; chauffeurId: string; data: any }) =>
      fetchApi<ApiResponse<any>>(`/chauffeurs/${chauffeurId}/primes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { chauffeurId }) => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.primes, chauffeurId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.chauffeur(chauffeurId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.chauffeurs });
      // Invalider les salaires pour mettre à jour les montants recalculés
      queryClient.invalidateQueries({ queryKey: [...queryKeys.salaires, chauffeurId] });
      // Invalider tous les previews de salaire pour ce chauffeur
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && 
            key[0] === 'salaires' && 
            key[1] === 'preview' && 
            key[2] === chauffeurId;
        }
      });
    },
  });
}

export function useDeletePrime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, chauffeurId }: { id: string; chauffeurId: string }) =>
      fetchApi<ApiResponse<void>>(`/chauffeurs/${chauffeurId}/primes/${id}`, { method: 'DELETE' }),
    onSuccess: (_, { chauffeurId }) => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.primes, chauffeurId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.chauffeur(chauffeurId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.chauffeurs });
      // Invalider les salaires pour mettre à jour les montants recalculés
      queryClient.invalidateQueries({ queryKey: [...queryKeys.salaires, chauffeurId] });
      // Invalider tous les previews de salaire pour ce chauffeur
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && 
            key[0] === 'salaires' && 
            key[1] === 'preview' && 
            key[2] === chauffeurId;
        }
      });
    },
  });
}

// ==================== AVANCES HOOKS ====================

export function useAvances(chauffeurId: string) {
  return useQuery({
    queryKey: [...queryKeys.avances, chauffeurId],
    queryFn: async () => {
      const response = await fetchApi<ApiResponse<any[]>>(`/chauffeurs/${chauffeurId}/avances`);
      return response.data || [];
    },
    enabled: !!chauffeurId,
  });
}

export function useCreateAvance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ chauffeurId, ...data }: { chauffeurId: string; montant: number; date: string }) =>
      fetchApi<ApiResponse<any>>(`/chauffeurs/${chauffeurId}/avances`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { chauffeurId }) => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.avances, chauffeurId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.chauffeur(chauffeurId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.chauffeurs });
      // Invalider les salaires pour mettre à jour les montants recalculés
      queryClient.invalidateQueries({ queryKey: [...queryKeys.salaires, chauffeurId] });
      // Invalider tous les previews de salaire pour ce chauffeur
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && 
            key[0] === 'salaires' && 
            key[1] === 'preview' && 
            key[2] === chauffeurId;
        }
      });
    },
  });
}

export function useUpdateAvance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, chauffeurId, data }: { id: string; chauffeurId: string; data: { montant?: number; date?: string; rembourse?: boolean } }) =>
      fetchApi<ApiResponse<any>>(`/chauffeurs/${chauffeurId}/avances/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { chauffeurId }) => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.avances, chauffeurId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.chauffeur(chauffeurId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.chauffeurs });
      // Invalider les salaires pour mettre à jour les montants recalculés
      queryClient.invalidateQueries({ queryKey: [...queryKeys.salaires, chauffeurId] });
      // Invalider tous les previews de salaire pour ce chauffeur
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && 
            key[0] === 'salaires' && 
            key[1] === 'preview' && 
            key[2] === chauffeurId;
        }
      });
    },
  });
}

export function useDeleteAvance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, chauffeurId }: { id: string; chauffeurId: string }) =>
      fetchApi<ApiResponse<void>>(`/chauffeurs/${chauffeurId}/avances/${id}`, { method: 'DELETE' }),
    onSuccess: (_, { chauffeurId }) => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.avances, chauffeurId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.chauffeur(chauffeurId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.chauffeurs });
      // Invalider les salaires pour mettre à jour les montants recalculés
      queryClient.invalidateQueries({ queryKey: [...queryKeys.salaires, chauffeurId] });
      // Invalider tous les previews de salaire pour ce chauffeur
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && 
            key[0] === 'salaires' && 
            key[1] === 'preview' && 
            key[2] === chauffeurId;
        }
      });
    },
  });
}

// ==================== SALAIRES HOOKS ====================

export function useSalaires(chauffeurId: string) {
  return useQuery({
    queryKey: [...queryKeys.salaires, chauffeurId],
    queryFn: async () => {
      const response = await fetchApi<ApiResponse<any[]>>(`/chauffeurs/${chauffeurId}/salaires`);
      return response.data || [];
    },
    enabled: !!chauffeurId,
  });
}

export function useSalairePreview(chauffeurId: string, mois: number, annee: number) {
  return useQuery({
    queryKey: [...queryKeys.salaires, 'preview', chauffeurId, mois, annee],
    queryFn: async () => {
      const response = await fetchApi<ApiResponse<{
        montantPrimes: number;
        montantAvances: number;
        primes: Array<{ id: string; motif: string; montant: number; date: string }>;
        avances: Array<{ id: string; montant: number; date: string }>;
      }>>(`/chauffeurs/${chauffeurId}/salaires/preview?mois=${mois}&annee=${annee}`);
      return response.data || { montantPrimes: 0, montantAvances: 0, primes: [], avances: [] };
    },
    enabled: !!chauffeurId && mois > 0 && annee > 0,
  });
}

export function usePayerSalaire() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, chauffeurId }: { id: string; chauffeurId: string }) =>
      fetchApi<ApiResponse<any>>(`/chauffeurs/${chauffeurId}/salaires/${id}/payer`, { method: 'PUT' }),
    onSuccess: (_, { chauffeurId }) => {
      // Invalider les salaires du chauffeur
      queryClient.invalidateQueries({ queryKey: [...queryKeys.salaires, chauffeurId] });
      // Invalider la liste des chauffeurs pour mettre à jour salaireActuel
      queryClient.invalidateQueries({ queryKey: queryKeys.chauffeurs });
      // Invalider le chauffeur individuel
      queryClient.invalidateQueries({ queryKey: queryKeys.chauffeur(chauffeurId) });
      // Invalider les primes pour mettre à jour l'état comptabilise
      queryClient.invalidateQueries({ queryKey: [...queryKeys.primes, chauffeurId] });
      // Invalider les avances pour mettre à jour l'état rembourse
      queryClient.invalidateQueries({ queryKey: [...queryKeys.avances, chauffeurId] });
    },
  });
}

export function useCreateSalaire() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ chauffeurId, data }: { chauffeurId: string; data: any }) =>
      fetchApi<ApiResponse<any>>(`/chauffeurs/${chauffeurId}/salaires`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { chauffeurId }) => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.salaires, chauffeurId] });
      // Invalider la liste des chauffeurs pour mettre à jour salaireActuel
      queryClient.invalidateQueries({ queryKey: queryKeys.chauffeurs });
      queryClient.invalidateQueries({ queryKey: queryKeys.chauffeur(chauffeurId) });
    },
  });
}

export function useUpdateSalaire() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, chauffeurId, data }: { id: string; chauffeurId: string; data: any }) =>
      fetchApi<ApiResponse<any>>(`/chauffeurs/${chauffeurId}/salaires/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { chauffeurId }) => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.salaires, chauffeurId] });
      // Invalider la liste des chauffeurs pour mettre à jour salaireActuel
      queryClient.invalidateQueries({ queryKey: queryKeys.chauffeurs });
      queryClient.invalidateQueries({ queryKey: queryKeys.chauffeur(chauffeurId) });
      // Invalider les primes et avances car elles peuvent avoir été modifiées
      queryClient.invalidateQueries({ queryKey: [...queryKeys.primes, chauffeurId] });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.avances, chauffeurId] });
    },
  });
}

export function useDeleteSalaire() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, chauffeurId }: { id: string; chauffeurId: string }) =>
      fetchApi<ApiResponse<void>>(`/chauffeurs/${chauffeurId}/salaires/${id}`, { method: 'DELETE' }),
    onSuccess: (_, { chauffeurId }) => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.salaires, chauffeurId] });
      // Invalider la liste des chauffeurs pour mettre à jour salaireActuel
      queryClient.invalidateQueries({ queryKey: queryKeys.chauffeurs });
      queryClient.invalidateQueries({ queryKey: queryKeys.chauffeur(chauffeurId) });
    },
  });
}

// ==================== DOCUMENTS HOOKS ====================

export function useDocuments(chauffeurId: string) {
  return useQuery({
    queryKey: [...queryKeys.documents, chauffeurId],
    queryFn: async () => {
      const response = await fetchApi<ApiResponse<any[]>>(`/chauffeurs/${chauffeurId}/documents`);
      return response.data || [];
    },
    enabled: !!chauffeurId,
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ chauffeurId, data }: { chauffeurId: string; data: FormData }) => {
      const response = await fetch(`/api/chauffeurs/${chauffeurId}/documents`, {
        method: 'POST',
        body: data,
      });
      if (!response.ok) throw new Error('Erreur lors de la création');
      return response.json();
    },
    onSuccess: (_, { chauffeurId }) => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.documents, chauffeurId] });
      // Invalider le chauffeur pour mettre à jour _count.documents
      queryClient.invalidateQueries({ queryKey: queryKeys.chauffeur(chauffeurId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.chauffeurs });
      // Vérifier les alertes de documents
      fetch('/api/alertes/check-documents', { method: 'POST' });
      queryClient.invalidateQueries({ queryKey: queryKeys.alertes });
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, chauffeurId, data }: { id: string; chauffeurId: string; data: FormData }) => {
      const response = await fetch(`/api/chauffeurs/${chauffeurId}/documents/${id}`, {
        method: 'PUT',
        body: data,
      });
      if (!response.ok) throw new Error('Erreur lors de la modification');
      return response.json();
    },
    onSuccess: (_, { chauffeurId }) => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.documents, chauffeurId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.chauffeur(chauffeurId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.chauffeurs });
      // Vérifier les alertes de documents
      fetch('/api/alertes/check-documents', { method: 'POST' });
      queryClient.invalidateQueries({ queryKey: queryKeys.alertes });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, chauffeurId }: { id: string; chauffeurId: string }) =>
      fetchApi<ApiResponse<void>>(`/chauffeurs/${chauffeurId}/documents/${id}`, { method: 'DELETE' }),
    onSuccess: (_, { chauffeurId }) => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.documents, chauffeurId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.chauffeur(chauffeurId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.chauffeurs });
      // Vérifier les alertes de documents
      fetch('/api/alertes/check-documents', { method: 'POST' });
      queryClient.invalidateQueries({ queryKey: queryKeys.alertes });
    },
  });
}

// ==================== TYPES DOCUMENTS HOOKS ====================

export function useTypesDocuments(categorie?: string) {
  return useQuery<TypeDocumentPersonnalise[]>({
    queryKey: categorie ? ['typesDocuments', categorie] : ['typesDocuments'],
    queryFn: async () => {
      const params = categorie ? `?categorie=${categorie}` : '';
      const response = await fetchApi<ApiResponse<TypeDocumentPersonnalise[]>>(`/types-documents${params}`);
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateTypeDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      fetchApi<ApiResponse<TypeDocumentPersonnalise>>('/types-documents', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['typesDocuments'] });
    },
  });
}

export function useUpdateTypeDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetchApi<ApiResponse<TypeDocumentPersonnalise>>(`/types-documents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['typesDocuments'] });
    },
  });
}

export function useDeleteTypeDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<ApiResponse<void>>(`/types-documents/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['typesDocuments'] });
    },
  });
}

// ==================== TYPES ENTRETIEN HOOKS ====================

export function useTypesEntretien() {
  return useQuery<TypeEntretienPersonnalise[]>({
    queryKey: ['typesEntretien'],
    queryFn: async () => {
      const response = await fetchApi<ApiResponse<TypeEntretienPersonnalise[]>>('/types-entretien');
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateTypeEntretien() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      fetchApi<ApiResponse<TypeEntretienPersonnalise>>('/types-entretien', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['typesEntretien'] });
    },
  });
}

export function useUpdateTypeEntretien() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetchApi<ApiResponse<TypeEntretienPersonnalise>>(`/types-entretien/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['typesEntretien'] });
    },
  });
}

export function useDeleteTypeEntretien() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<ApiResponse<void>>(`/types-entretien/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['typesEntretien'] });
    },
  });
}

// ==================== PARAMETRES HOOKS ====================

export function useParametres(cle?: string) {
  return useQuery<Parametre[]>({
    queryKey: cle ? ['parametres', 'search', cle] : ['parametres'],
    queryFn: async () => {
      const params = cle ? `?cle=${encodeURIComponent(cle)}` : '';
      const response = await fetchApi<ApiResponse<Parametre[]>>(`/parametres${params}`);
      return response.data || [];
    },
  });
}

export function useParametre(id: string) {
  return useQuery<Parametre>({
    queryKey: ['parametres', id],
    queryFn: async () => {
      const response = await fetchApi<ApiResponse<Parametre>>(`/parametres/${id}`);
      if (!response.data) throw new Error('Paramètre non trouvé');
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateParametre() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { cle: string; valeur: string }) =>
      fetchApi<ApiResponse<Parametre>>('/parametres', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parametres'] });
    },
  });
}

export function useUpdateParametre() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { cle?: string; valeur?: string } }) =>
      fetchApi<ApiResponse<Parametre>>(`/parametres/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parametres'] });
    },
  });
}

export function useDeleteParametre() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<ApiResponse<void>>(`/parametres/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parametres'] });
    },
  });
}

// ==================== VEHICULE DOCUMENTS HOOKS ====================

export function useDocumentsVehicule(vehiculeId: string) {
  return useQuery({
    queryKey: ['documentsVehicule', vehiculeId],
    queryFn: async () => {
      const response = await fetchApi<ApiResponse<any[]>>(`/vehicules/${vehiculeId}/documents`);
      return response.data || [];
    },
    enabled: !!vehiculeId,
  });
}

export function useCreateDocumentVehicule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ vehiculeId, data }: { vehiculeId: string; data: FormData }) => {
      const response = await fetch(`/api/vehicules/${vehiculeId}/documents`, {
        method: 'POST',
        body: data,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la création');
      }
      return response.json();
    },
    onSuccess: (_, { vehiculeId }) => {
      queryClient.invalidateQueries({ queryKey: ['documentsVehicule', vehiculeId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicule(vehiculeId) });
      // Vérifier les alertes de documents véhicules
      fetch('/api/alertes/check-documents', { method: 'POST' });
      queryClient.invalidateQueries({ queryKey: queryKeys.alertes });
    },
  });
}

export function useUpdateDocumentVehicule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, vehiculeId, data }: { id: string; vehiculeId: string; data: FormData }) => {
      const response = await fetch(`/api/vehicules/${vehiculeId}/documents/${id}`, {
        method: 'PUT',
        body: data,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la modification');
      }
      return response.json();
    },
    onSuccess: (_, { vehiculeId }) => {
      queryClient.invalidateQueries({ queryKey: ['documentsVehicule', vehiculeId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicule(vehiculeId) });
      // Vérifier les alertes de documents véhicules
      fetch('/api/alertes/check-documents', { method: 'POST' });
      queryClient.invalidateQueries({ queryKey: queryKeys.alertes });
    },
  });
}

export function useDeleteDocumentVehicule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, vehiculeId }: { id: string; vehiculeId: string }) =>
      fetchApi<ApiResponse<void>>(`/vehicules/${vehiculeId}/documents/${id}`, { method: 'DELETE' }),
    onSuccess: (_, { vehiculeId }) => {
      queryClient.invalidateQueries({ queryKey: ['documentsVehicule', vehiculeId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicule(vehiculeId) });
      // Vérifier les alertes de documents véhicules
      fetch('/api/alertes/check-documents', { method: 'POST' });
      queryClient.invalidateQueries({ queryKey: queryKeys.alertes });
    },
  });
}

// ==================== CLIENT HOOKS ====================

export function useClients(params?: {
  actif?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery<PaginatedResponse<Client>>({
    queryKey: ['clients', 'list', params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.actif !== undefined) searchParams.set('actif', String(params.actif));
      if (params?.search) searchParams.set('search', params.search);
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
      return fetchApi<PaginatedResponse<Client>>(`/clients?${searchParams.toString()}`);
    },
    staleTime: 30 * 1000,
  });
}

export function useClient(id: string) {
  return useQuery<Client>({
    queryKey: queryKeys.client(id),
    queryFn: async () => {
      const response = await fetchApi<ApiResponse<Client>>(`/clients/${id}`);
      if (!response.data) throw new Error('Client non trouvé');
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      fetchApi<ApiResponse<Client>>('/clients', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetchApi<ApiResponse<Client>>(`/clients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.client(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<ApiResponse<void>>(`/clients/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients });
    },
  });
}

// ==================== FACTURE HOOKS ====================

export function useFactures(params?: {
  statut?: string;
  clientId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery<PaginatedResponse<Facture>>({
    queryKey: ['factures', 'list', params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.statut) searchParams.set('statut', params.statut);
      if (params?.clientId) searchParams.set('clientId', params.clientId);
      if (params?.search) searchParams.set('search', params.search);
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
      return fetchApi<PaginatedResponse<Facture>>(`/factures?${searchParams.toString()}`);
    },
    staleTime: 30 * 1000,
  });
}

export function useFacture(id: string) {
  return useQuery<Facture>({
    queryKey: queryKeys.facture(id),
    queryFn: async () => {
      const response = await fetchApi<ApiResponse<Facture>>(`/factures/${id}`);
      if (!response.data) throw new Error('Facture non trouvée');
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateFacture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      fetchApi<ApiResponse<Facture>>('/factures', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.factures });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
      // Vérifier les alertes de factures impayées
      fetch('/api/alertes/check-documents', { method: 'POST' });
      queryClient.invalidateQueries({ queryKey: queryKeys.alertes });
    },
  });
}

export function useUpdateFacture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetchApi<ApiResponse<Facture>>(`/factures/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.facture(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.factures });
      // Vérifier les alertes de factures impayées
      fetch('/api/alertes/check-documents', { method: 'POST' });
      queryClient.invalidateQueries({ queryKey: queryKeys.alertes });
    },
  });
}

export function useDeleteFacture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<ApiResponse<void>>(`/factures/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.factures });
      // Vérifier les alertes de factures impayées
      fetch('/api/alertes/check-documents', { method: 'POST' });
      queryClient.invalidateQueries({ queryKey: queryKeys.alertes });
    },
  });
}

// ==================== PAIEMENT HOOKS ====================

export function usePaiements(factureId: string) {
  return useQuery({
    queryKey: ['paiements', factureId],
    queryFn: async () => {
      const response = await fetchApi<ApiResponse<any[]>>(`/factures/${factureId}/paiements`);
      return response.data || [];
    },
    enabled: !!factureId,
  });
}

export function useCreatePaiement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ factureId, data }: { factureId: string; data: any }) =>
      fetchApi<ApiResponse<any>>(`/factures/${factureId}/paiements`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { factureId }) => {
      queryClient.invalidateQueries({ queryKey: ['paiements', factureId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.facture(factureId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.factures });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
      // Vérifier les alertes de factures impayées (le paiement peut changer le statut)
      fetch('/api/alertes/check-documents', { method: 'POST' });
      queryClient.invalidateQueries({ queryKey: queryKeys.alertes });
    },
  });
}

// ==================== SERVICE HOOKS ====================

export function useServices(params?: {
  actif?: boolean;
  clientId?: string;
  typeService?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}) {
  return useQuery<PaginatedResponse<any>>({
    queryKey: ['services', 'list', params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.actif !== undefined) searchParams.set('actif', String(params.actif));
      if (params?.clientId) searchParams.set('clientId', params.clientId);
      if (params?.typeService) searchParams.set('typeService', params.typeService);
      if (params?.search) searchParams.set('search', params.search);
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
      return fetchApi<PaginatedResponse<any>>(`/services?${searchParams.toString()}`);
    },
    enabled: params?.enabled !== false,
    staleTime: 30 * 1000,
  });
}

export function useService(id: string) {
  return useQuery<any>({
    queryKey: ['services', id],
    queryFn: async () => {
      const response = await fetchApi<ApiResponse<any>>(`/services/${id}`);
      if (!response.data) throw new Error('Service non trouvé');
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      fetchApi<ApiResponse<any>>('/services', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetchApi<ApiResponse<any>>(`/services/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['services', id] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<ApiResponse<void>>(`/services/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

// ==================== CHARGE HOOKS ====================

export function useCharge(id: string) {
  return useQuery<any>({
    queryKey: ['charge', id],
    queryFn: async () => {
      const response = await fetchApi<ApiResponse<any>>(`/charges/${id}`);
      if (!response.data) throw new Error('Charge non trouvée');
      return response.data;
    },
    enabled: !!id,
  });
}

// ==================== ENTRETIENS HOOKS ====================

export function useEntretiens(vehiculeId: string) {
  return useQuery({
    queryKey: ['entretiens', vehiculeId],
    queryFn: async () => {
      const response = await fetchApi<ApiResponse<any[]>>(`/vehicules/${vehiculeId}/entretiens`);
      return response.data || [];
    },
    enabled: !!vehiculeId,
  });
}

export function useCreateEntretien() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ vehiculeId, data }: { vehiculeId: string; data: any }) =>
      fetchApi<ApiResponse<any>>(`/vehicules/${vehiculeId}/entretiens`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { vehiculeId }) => {
      queryClient.invalidateQueries({ queryKey: ['entretiens', vehiculeId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicule(vehiculeId) });
      // Vérifier les alertes d'entretiens
      fetch('/api/alertes/check-documents', { method: 'POST' });
      queryClient.invalidateQueries({ queryKey: queryKeys.alertes });
    },
  });
}

export function useUpdateEntretien() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, vehiculeId, data }: { id: string; vehiculeId: string; data: any }) =>
      fetchApi<ApiResponse<any>>(`/entretiens/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...data, vehiculeId }),
      }),
    onSuccess: (_, { vehiculeId }) => {
      queryClient.invalidateQueries({ queryKey: ['entretiens', vehiculeId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicule(vehiculeId) });
      // Vérifier les alertes d'entretiens
      fetch('/api/alertes/check-documents', { method: 'POST' });
      queryClient.invalidateQueries({ queryKey: queryKeys.alertes });
    },
  });
}

export function useDeleteEntretien() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, vehiculeId }: { id: string; vehiculeId: string }) =>
      fetchApi<ApiResponse<void>>(`/entretiens/${id}`, { method: 'DELETE' }),
    onSuccess: (_, { vehiculeId }) => {
      queryClient.invalidateQueries({ queryKey: ['entretiens', vehiculeId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicule(vehiculeId) });
      // Vérifier les alertes d'entretiens
      fetch('/api/alertes/check-documents', { method: 'POST' });
      queryClient.invalidateQueries({ queryKey: queryKeys.alertes });
    },
  });
}

// ==================== CARBURANT HOOKS ====================

export function useCarburants(vehiculeId: string) {
  return useQuery({
    queryKey: ['carburants', vehiculeId],
    queryFn: async () => {
      const response = await fetchApi<ApiResponse<any[]>>(`/vehicules/${vehiculeId}/carburant`);
      return response.data || [];
    },
    enabled: !!vehiculeId,
  });
}

export function useCreateCarburant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ vehiculeId, data }: { vehiculeId: string; data: any }) =>
      fetchApi<ApiResponse<any>>(`/vehicules/${vehiculeId}/carburant`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { vehiculeId }) => {
      queryClient.invalidateQueries({ queryKey: ['carburants', vehiculeId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicule(vehiculeId) });
    },
  });
}

export function useDeleteCarburant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, vehiculeId }: { id: string; vehiculeId: string }) =>
      fetchApi<ApiResponse<void>>(`/carburant/${id}`, { method: 'DELETE' }),
    onSuccess: (_, { vehiculeId }) => {
      queryClient.invalidateQueries({ queryKey: ['carburants', vehiculeId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicule(vehiculeId) });
    },
  });
}

// ==================== REINITIALISATION HOOKS ====================

export function useReinitialiser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchApi<ApiResponse<{ results: Array<{ table: string; deleted: number }> }>>('/reinitialiser', {
        method: 'POST',
        body: JSON.stringify({ confirmation: 'REINITIALISER_TOUTES_DONNEES' }),
      }),
    onSuccess: () => {
      // Invalidate all queries to refresh the UI
      queryClient.invalidateQueries();
    },
  });
}

// ==================== BULLETINS DE PAIE HOOKS ====================

export function useBulletinsPaie(params?: {
  chauffeurId?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery<PaginatedResponse<BulletinPaie>>({
    queryKey: ['bulletinsPaie', 'list', params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.chauffeurId) searchParams.set('chauffeurId', params.chauffeurId);
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
      return fetchApi<PaginatedResponse<BulletinPaie>>(`/bulletins-paie?${searchParams.toString()}`);
    },
  });
}

export function useBulletinPaie(id: string) {
  return useQuery<BulletinPaie>({
    queryKey: queryKeys.bulletinPaie(id),
    queryFn: async () => {
      const response = await fetchApi<ApiResponse<BulletinPaie>>(`/bulletins-paie/${id}`);
      if (!response.data) throw new Error('Bulletin non trouvé');
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateBulletinPaie() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      fetchApi<ApiResponse<BulletinPaie>>('/bulletins-paie', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bulletinsPaie });
    },
  });
}

export function useUpdateBulletinPaie() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetchApi<ApiResponse<BulletinPaie>>(`/bulletins-paie/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bulletinPaie(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bulletinsPaie });
    },
  });
}

export function useDeleteBulletinPaie() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<ApiResponse<void>>(`/bulletins-paie/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bulletinsPaie });
    },
  });
}

// ==================== EXPLOITATION SERVICES HOOKS ====================

export function useExploitations(params?: {
  completed?: boolean;
  clientId?: string;
  chauffeurId?: string;
  vehiculeId?: string;
  dateFrom?: string;
  dateTo?: string;
  mois?: string;
  annee?: string;
  etatPaiement?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery<PaginatedResponse<any>>({
    queryKey: ['exploitations', 'list', params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.completed !== undefined) searchParams.set('completed', String(params.completed));
      if (params?.clientId) searchParams.set('clientId', params.clientId);
      if (params?.chauffeurId) searchParams.set('chauffeurId', params.chauffeurId);
      if (params?.vehiculeId) searchParams.set('vehiculeId', params.vehiculeId);
      if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom);
      if (params?.dateTo) searchParams.set('dateTo', params.dateTo);
      if (params?.mois) searchParams.set('mois', params.mois);
      if (params?.annee) searchParams.set('annee', params.annee);
      if (params?.etatPaiement) searchParams.set('etatPaiement', params.etatPaiement);
      if (params?.search) searchParams.set('search', params.search);
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
      return fetchApi<PaginatedResponse<any>>(`/exploitations?${searchParams.toString()}`);
    },
    staleTime: 30 * 1000,
  });
}

export function useExploitation(id: string) {
  return useQuery<any>({
    queryKey: ['exploitations', id],
    queryFn: async () => {
      const response = await fetchApi<ApiResponse<any>>(`/exploitations/${id}`);
      if (!response.data) throw new Error('Exploitation non trouvée');
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateExploitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      fetchApi<ApiResponse<any>>('/exploitations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exploitations'] });
    },
  });
}

export function useUpdateExploitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetchApi<ApiResponse<any>>(`/exploitations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['exploitations', id] });
      queryClient.invalidateQueries({ queryKey: ['exploitations'] });
    },
  });
}

export function useDeleteExploitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<ApiResponse<void>>(`/exploitations/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exploitations'] });
    },
  });
}

export function useConfirmExploitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<ApiResponse<any>>(`/exploitations/${id}/confirm`, {
        method: 'PUT',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exploitations'] });
    },
  });
}

// ==================== UTILISATEURS HOOKS ====================

export interface Utilisateur {
  id: string
  email: string
  nom: string
  prenom: string
  role: string
  actif: boolean
  createdAt: Date
  updatedAt: Date
}

export function useUtilisateurs() {
  return useQuery<Utilisateur[]>({
    queryKey: ['utilisateurs'],
    queryFn: async () => {
      const response = await fetchApi<ApiResponse<Utilisateur[]>>('/utilisateurs');
      return response.data || [];
    },
  });
}

export function useCreateUtilisateur() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; motDePasse: string; nom: string; prenom: string; role?: string }) =>
      fetchApi<ApiResponse<Utilisateur>>('/utilisateurs', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utilisateurs'] });
    },
  });
}

export function useUpdateUtilisateur() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { email?: string; nom?: string; prenom?: string; role?: string; actif?: boolean; motDePasse?: string } }) =>
      fetchApi<ApiResponse<Utilisateur>>(`/utilisateurs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utilisateurs'] });
    },
  });
}

export function useDeleteUtilisateur() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<ApiResponse<void>>(`/utilisateurs/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utilisateurs'] });
    },
  });
}
