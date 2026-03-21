// MGK Transport Management System - Zustand Store
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AlertData, ModuleName } from '@/types';

// ==================== STORE STATE INTERFACE ====================

interface AppState {
  // Navigation State
  currentModule: ModuleName;
  sidebarOpen: boolean;

  // Alerts State
  alerts: AlertData[];

  // UI State
  isLoading: boolean;

  // Actions
  setCurrentModule: (module: ModuleName) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Alert Actions
  addAlert: (alert: Omit<AlertData, 'id' | 'createdAt'>) => void;
  removeAlert: (id: string) => void;
  markAlertAsRead: (id: string) => void;
  clearAllAlerts: () => void;

  // Loading Actions
  setLoading: (loading: boolean) => void;
}

// ==================== STORE CREATION ====================

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial State
      currentModule: 'dashboard',
      sidebarOpen: true,
      alerts: [],
      isLoading: false,

      // Navigation Actions
      setCurrentModule: (module) => {
        set({ currentModule: module });
      },

      toggleSidebar: () => {
        set((state) => ({ sidebarOpen: !state.sidebarOpen }));
      },

      setSidebarOpen: (open) => {
        set({ sidebarOpen: open });
      },

      // Alert Actions
      addAlert: (alert) => {
        const newAlert: AlertData = {
          ...alert,
          id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          createdAt: new Date(),
          read: alert.read ?? false,
        };

        set((state) => ({
          alerts: [newAlert, ...state.alerts].slice(0, 50), // Keep max 50 alerts
        }));
      },

      removeAlert: (id) => {
        set((state) => ({
          alerts: state.alerts.filter((alert) => alert.id !== id),
        }));
      },

      markAlertAsRead: (id) => {
        set((state) => ({
          alerts: state.alerts.map((alert) =>
            alert.id === id ? { ...alert, read: true } : alert
          ),
        }));
      },

      clearAllAlerts: () => {
        set({ alerts: [] });
      },

      // Loading Actions
      setLoading: (loading) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'mgk-transport-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentModule: state.currentModule,
        sidebarOpen: state.sidebarOpen,
        alerts: state.alerts,
      }),
    }
  )
);

// ==================== SELECTORS ====================

export const useCurrentModule = () => useAppStore((state) => state.currentModule);
export const useSidebarOpen = () => useAppStore((state) => state.sidebarOpen);
export const useAlerts = () => useAppStore((state) => state.alerts);
export const useIsLoading = () => useAppStore((state) => state.isLoading);

// Alert selectors
export const useUnreadAlerts = () =>
  useAppStore((state) => state.alerts.filter((alert) => !alert.read));

export const useUnreadAlertsCount = () =>
  useAppStore((state) => state.alerts.filter((alert) => !alert.read).length);

export const useHighPriorityAlerts = () =>
  useAppStore((state) =>
    state.alerts.filter((alert) => alert.priority === 'HAUTE')
  );

export const useAlertsByType = (type: AlertData['type']) =>
  useAppStore((state) => state.alerts.filter((alert) => alert.type === type));

// ==================== ACTIONS HOOKS ====================

export const useAppActions = () =>
  useAppStore((state) => ({
    setCurrentModule: state.setCurrentModule,
    toggleSidebar: state.toggleSidebar,
    setSidebarOpen: state.setSidebarOpen,
    setLoading: state.setLoading,
  }));

export const useAlertActions = () =>
  useAppStore((state) => ({
    addAlert: state.addAlert,
    removeAlert: state.removeAlert,
    markAlertAsRead: state.markAlertAsRead,
    clearAllAlerts: state.clearAllAlerts,
  }));

// ==================== UTILITY FUNCTIONS ====================

export const formatAlertType = (type: AlertData['type']): string => {
  const labels: Record<AlertData['type'], string> = {
    ASSURANCE_VEHICULE_EXPIREE: 'Assurance véhicule expirée',
    PERMIS_CHAUFFEUR_EXPIRE: 'Permis chauffeur expiré',
    VISITE_TECHNIQUE_PROCHE: 'Visite technique proche',
    ENTRETIEN_A_VENIR: 'Entretien à venir',
    FACTURE_IMPAYEE: 'Facture impayée',
    DOCUMENT_EXPIRE: 'Document expiré',
  };
  return labels[type] || type;
};

export const formatAlertPriority = (priority: AlertData['priority']): string => {
  const labels: Record<AlertData['priority'], string> = {
    HAUTE: 'Haute',
    MOYENNE: 'Moyenne',
    BASSE: 'Basse',
  };
  return labels[priority] || priority;
};

export const getAlertPriorityColor = (priority: AlertData['priority']): string => {
  const colors: Record<AlertData['priority'], string> = {
    HAUTE: 'text-red-600 bg-red-50',
    MOYENNE: 'text-orange-600 bg-orange-50',
    BASSE: 'text-yellow-600 bg-yellow-50',
  };
  return colors[priority] || 'text-gray-600 bg-gray-50';
};
