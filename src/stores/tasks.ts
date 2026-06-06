import { create } from 'zustand';
import { hostApiFetch } from '@/lib/host-api';
import type { SpatialTask } from '@/types/task';

interface TasksState {
  tasks: SpatialTask[];
  loading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  createTask: (title: string, description?: string, options?: {
    status?: 'todo' | 'in_progress' | 'done';
    agentId?: string;
    planId?: string;
    filePath?: string;
  }) => Promise<void>;
  updateTask: (taskId: string, updates: {
    title?: string;
    description?: string;
    status?: 'todo' | 'in_progress' | 'done';
    agentId?: string | null;
    planId?: string | null;
    filePath?: string | null;
  }) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  clearError: () => void;
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,

  fetchTasks: async () => {
    set({ loading: true, error: null });
    try {
      const response = await hostApiFetch<{ success: boolean; tasks: SpatialTask[] }>('/api/tasks');
      if (response.success && Array.isArray(response.tasks)) {
        set({ tasks: response.tasks, loading: false });
      } else {
        set({ loading: false, error: 'Failed to fetch tasks' });
      }
    } catch (error) {
      set({ loading: false, error: String(error) });
    }
  },

  createTask: async (title: string, description = '', options = {}) => {
    set({ error: null });
    try {
      const response = await hostApiFetch<{ success: boolean; task: SpatialTask; tasks: SpatialTask[] }>('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ title, description, ...options }),
      });
      if (response.success && Array.isArray(response.tasks)) {
        set({ tasks: response.tasks });
      }
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  updateTask: async (taskId: string, updates: Parameters<TasksState['updateTask']>[1]) => {
    set({ error: null });
    
    // Optimistic Update
    const previousTasks = get().tasks;
    const optimisticTasks = previousTasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          ...updates,
          agentId: updates.agentId === null ? undefined : (updates.agentId !== undefined ? updates.agentId : t.agentId),
          planId: updates.planId === null ? undefined : (updates.planId !== undefined ? updates.planId : t.planId),
          filePath: updates.filePath === null ? undefined : (updates.filePath !== undefined ? updates.filePath : t.filePath),
          updatedAt: new Date().toISOString(),
        } as SpatialTask;
      }
      return t;
    });
    set({ tasks: optimisticTasks });

    try {
      const response = await hostApiFetch<{ success: boolean; task: SpatialTask; tasks: SpatialTask[] }>(
        `/api/tasks/${encodeURIComponent(taskId)}`,
        {
          method: 'PUT',
          body: JSON.stringify(updates),
        }
      );
      if (response.success && Array.isArray(response.tasks)) {
        set({ tasks: response.tasks });
      } else {
        // Rollback
        set({ tasks: previousTasks, error: 'Failed to update task' });
      }
    } catch (error) {
      // Rollback
      set({ tasks: previousTasks, error: String(error) });
      throw error;
    }
  },

  deleteTask: async (taskId: string) => {
    set({ error: null });
    const previousTasks = get().tasks;
    set({ tasks: previousTasks.filter((t) => t.id !== taskId) });

    try {
      const response = await hostApiFetch<{ success: boolean; tasks: SpatialTask[] }>(
        `/api/tasks/${encodeURIComponent(taskId)}`,
        { method: 'DELETE' }
      );
      if (response.success && Array.isArray(response.tasks)) {
        set({ tasks: response.tasks });
      } else {
        set({ tasks: previousTasks, error: 'Failed to delete task' });
      }
    } catch (error) {
      set({ tasks: previousTasks, error: String(error) });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
