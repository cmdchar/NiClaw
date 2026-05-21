import { create } from 'zustand';
import { hostApiFetch } from '@/lib/host-api';

export interface TokenUsageEntry {
  timestamp: string;
  sessionId: string;
  agentId: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs?: number;
  success?: boolean;
}

interface AnalyticsState {
  history: TokenUsageEntry[];
  loading: boolean;
  error: string | null;
  fetchHistory: (limit?: number) => Promise<void>;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  history: [],
  loading: false,
  error: null,

  fetchHistory: async (limit = 100) => {
    set({ loading: true, error: null });
    try {
      const data = await hostApiFetch<TokenUsageEntry[]>(`/api/usage/recent-token-history?limit=${limit}`);
      set({ history: data, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },
}));
