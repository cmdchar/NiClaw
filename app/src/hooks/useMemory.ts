import { useState, useCallback, useEffect } from 'react';
import { hostApiFetch } from '@/lib/host-api';

export interface MemoryProposal {
  id: string;
  sourceAgent: string;
  timestamp: string;
  affectedFile: string;
  proposedContent: string;
  confidence: number;
  status: 'pending' | 'committed' | 'rejected' | 'failed';
  committedAt?: string | null;
  rejectedAt?: string | null;
  error?: string | null;
  metadata?: any;
}

export interface MemorySyncStatus {
  status: 'idle' | 'running' | 'succeeded' | 'failed';
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  lastError: string | null;
  pendingSync: boolean;
  logTail: string[];
}

export function useMemoryProposals(initialStatus: string = 'pending', limit: number = 20) {
  const [proposals, setProposals] = useState<MemoryProposal[]>([]);
  const [status, setStatus] = useState<string>(initialStatus);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProposals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await hostApiFetch<{ proposals: MemoryProposal[] }>(`/api/memory/proposals?status=${status}&limit=${limit}&offset=${(page - 1) * limit}`);
      if (res && res.proposals) {
        setProposals(res.proposals);
      }
    } catch (e) {
      console.error('Failed to fetch memory proposals', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status, limit, page]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const refresh = () => {
    setRefreshing(true);
    fetchProposals();
  };

  return {
    proposals,
    status,
    setStatus,
    page,
    setPage,
    loading,
    refreshing,
    refresh
  };
}

export function useMemorySyncStatus() {
  const [syncStatus, setSyncStatus] = useState<MemorySyncStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await hostApiFetch<MemorySyncStatus>('/api/memory/sync/status');
      if (res) {
        setSyncStatus(res);
      }
    } catch (e) {
      console.error('Failed to fetch sync status', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Poll more frequently if running
    const interval = setInterval(() => {
      fetchStatus();
    }, syncStatus?.status === 'running' ? 2000 : 15000);
    return () => clearInterval(interval);
  }, [fetchStatus, syncStatus?.status]);

  return { syncStatus, loading, refresh: fetchStatus };
}

export function useMemoryMutations(onSuccess?: () => void) {
  const [loading, setLoading] = useState(false);

  const approve = async (id: string) => {
    setLoading(true);
    try {
      await hostApiFetch(`/api/memory/proposals/${id}/approve`, { method: 'POST' });
      onSuccess?.();
    } catch (e) {
      console.error('Failed to approve', e);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const reject = async (id: string) => {
    setLoading(true);
    try {
      await hostApiFetch(`/api/memory/proposals/${id}/reject`, { method: 'POST' });
      onSuccess?.();
    } catch (e) {
      console.error('Failed to reject', e);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const triggerSync = async () => {
    setLoading(true);
    try {
      await hostApiFetch('/api/memory/sync/run', { method: 'POST' });
      onSuccess?.();
    } catch (e) {
      console.error('Failed to run sync', e);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { approve, reject, triggerSync, loading };
}
