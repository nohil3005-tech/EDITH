/**
 * EDITH Backend API Hooks
 * React hooks with loading/error/data states for all backend endpoints.
 * Uses the central api.ts client and syncs results to Zustand store.
 */

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { runBackendJobScan, runBackendProductScan, generateBackendProposal, checkBackendHealth } from '@/lib/apiStore';

// ─── Generic async state hook ─────────────────────────────────
export function useAsync<T, A extends unknown[] = []>(
  fn: (...args: A) => Promise<T>,
) {
  const [data, setData]       = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const execute = useCallback(
    async (...args: A): Promise<T | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await fn(...args);
        setData(result);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return { data, loading, error, execute };
}

// ─── Dashboard ────────────────────────────────────────────────
export function useDashboardSummary() {
  return useAsync(() => api.dashboard.summary());
}

export function useRevenueChart(period = '30d') {
  return useAsync(() => api.dashboard.revenueChart(period));
}

// ─── Freelance ────────────────────────────────────────────────
export function useScanJobs() {
  const { loading, error, execute } = useAsync(
    (opts?: { platforms?: string[]; domains?: string[] }) =>
      runBackendJobScan(opts),
  );

  const scan = useCallback(
    async (opts?: { platforms?: string[] }) => {
      const result = await execute(opts);
      if (result && result.newJobs > 0) {
        toast.success(`Found ${result.newJobs} new jobs!`);
      } else if (result) {
        toast.info('Scan complete — no new jobs found');
      }
      return result;
    },
    [execute],
  );

  return { loading, error, scan };
}

export function useGenerateProposal() {
  const { loading, error, execute } = useAsync(
    (jobId: string, jobTitle: string) =>
      generateBackendProposal(jobId, jobTitle),
  );
  return { loading, error, generate: execute };
}

export function useListProposals(status?: string) {
  const { data, loading, error, execute } = useAsync(
    () => api.freelance.listProposals(status),
  );
  useEffect(() => { execute(); }, []);
  return { data, loading, error, refetch: execute };
}

// ─── Dropshipping ─────────────────────────────────────────────
export function useScanProducts() {
  const { loading, error, execute } = useAsync(
    (opts?: { sources?: string[] }) => runBackendProductScan(opts),
  );

  const scan = useCallback(
    async (opts?: { sources?: string[] }) => {
      const result = await execute(opts);
      if (result && result.newProducts > 0) {
        toast.success(`Discovered ${result.newProducts} trending products!`);
      }
      return result;
    },
    [execute],
  );

  return { loading, error, scan };
}

// ─── Invoices ─────────────────────────────────────────────────
export function useListInvoices(params = '') {
  const { data, loading, error, execute } = useAsync(
    () => api.payment.listInvoices(params),
  );
  useEffect(() => { execute(); }, []);
  return { data, loading, error, refetch: execute };
}

export function useGenerateInvoice() {
  return useAsync((body: unknown) => api.payment.generateInvoice(body));
}

// ─── Files ────────────────────────────────────────────────────
export function useListFiles(params = '') {
  const { data, loading, error, execute } = useAsync(
    () => api.files.list(params),
  );
  useEffect(() => { execute(); }, []);
  return { data, loading, error, refetch: execute };
}

export function useUploadFile() {
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(async (file: File, folder = 'general') => {
    setUploading(true);
    try {
      const result = await api.files.upload(file, folder);
      toast.success(`Uploaded ${file.name}`);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      toast.error(msg);
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  return { uploading, upload };
}

// ─── Agents ───────────────────────────────────────────────────
export function useAgentList() {
  const { data, loading, error, execute } = useAsync(
    () => api.agents.list(),
  );
  useEffect(() => { execute(); }, []);
  return { data, loading, error, refetch: execute };
}

export function usePauseAgent() {
  return useAsync((id: string) => api.agents.pause(id));
}

export function useResumeAgent() {
  return useAsync((id: string) => api.agents.resume(id));
}

// ─── Analytics ────────────────────────────────────────────────
export function useProfitLoss(period = '30d') {
  const { data, loading, error, execute } = useAsync(
    () => api.analytics.profitLoss(period),
  );
  useEffect(() => { execute(); }, [period]);
  return { data, loading, error, refetch: execute };
}

export function useTimeSaved() {
  const { data, loading, error, execute } = useAsync(
    () => api.analytics.timeSaved(),
  );
  useEffect(() => { execute(); }, []);
  return { data, loading, error };
}

// ─── Health ───────────────────────────────────────────────────
export function useBackendHealth() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline' | 'degraded'>('checking');
  const [checks, setChecks] = useState<Record<string, unknown>>({});

  const check = useCallback(async () => {
    const result = await checkBackendHealth();
    setStatus(result.healthy ? 'online' : 'degraded');
    setChecks(result.checks);
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [check]);

  return { status, checks, refetch: check };
}

// ─── Chat ─────────────────────────────────────────────────────
export function useChat() {
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(async (
    message: string,
    sessionId?: string,
    contextPage?: string,
  ) => {
    setLoading(true);
    try {
      const result = await api.chat.sendMessage({ message, session_id: sessionId, contextPage }) as any;
      return result?.data ?? null;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Chat failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, sendMessage };
}

// ─── Marketplace ──────────────────────────────────────────────
export function useMarketplacePlugins(params = '') {
  const { data, loading, error, execute } = useAsync(
    () => api.marketplace.list(params),
  );
  useEffect(() => { execute(); }, []);
  return { data, loading, error, refetch: execute };
}

export function useInstalledPlugins() {
  const { data, loading, error, execute } = useAsync(
    () => api.marketplace.installed(),
  );
  useEffect(() => { execute(); }, []);
  return { data, loading, error, refetch: execute };
}

// ─── Referrals ────────────────────────────────────────────────
export function useReferralStats() {
  const { data, loading, error, execute } = useAsync(
    () => api.referrals.stats(),
  );
  useEffect(() => { execute(); }, []);
  return { data, loading, error };
}

// ─── Earnings ─────────────────────────────────────────────────
export function useEarnings(period = '30d') {
  const { data, loading, error, execute } = useAsync(
    () => api.payment.getEarnings(period),
  );
  useEffect(() => { execute(); }, [period]);
  return { data, loading, error };
}
