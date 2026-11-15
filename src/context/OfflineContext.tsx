import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import type { OfflineQueuedUpdate } from '../types';

interface OfflineContextValue {
  browserOnline: boolean;
  simulatedOffline: boolean;
  isOffline: boolean;
  setSimulatedOffline: (val: boolean) => void;
  queuedItems: OfflineQueuedUpdate[];
  pendingCount: number;
  syncing: boolean;
  lastSyncMessage: string | null;
  submitOrQueueProgress: (input: {
    orderId: string;
    allocationId: string;
    productName: string;
    quantityReported: number;
    updateMode: 'tap' | 'voice';
    notes: string;
  }) => Promise<{ status: 'synced' | 'saved_locally' | 'pending_sync' }>;
  syncNow: () => Promise<number>;
  clearSyncedHistory: () => void;
}

const STORAGE_KEY = 'sahayakshg_offline_queue_v1';
const OfflineContext = createContext<OfflineContextValue | null>(null);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [browserOnline, setBrowserOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [simulatedOffline, setSimulatedOfflineState] = useState(
    () => localStorage.getItem('sahayak_sim_offline') === 'true'
  );
  const [queuedItems, setQueuedItems] = useState<OfflineQueuedUpdate[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as OfflineQueuedUpdate[]) : [];
    } catch {
      return [];
    }
  });
  const [syncing, setSyncing] = useState(false);
  const [lastSyncMessage, setLastSyncMessage] = useState<string | null>(null);

  const isOffline = !browserOnline || simulatedOffline;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queuedItems));
  }, [queuedItems]);

  const setSimulatedOffline = (val: boolean) => {
    setSimulatedOfflineState(val);
    localStorage.setItem('sahayak_sim_offline', val ? 'true' : 'false');
    if (!val) {
      setLastSyncMessage('Connectivity restored. Ready to synchronize queued entries.');
    }
  };

  const syncNow = useCallback(async (): Promise<number> => {
    if (isOffline) return 0;
    const pending = queuedItems.filter((item) => item.syncStatus !== 'synced');
    if (pending.length === 0) return 0;

    setSyncing(true);
    setQueuedItems((prev) =>
      prev.map((i) => (i.syncStatus !== 'synced' ? { ...i, syncStatus: 'pending_sync' } : i))
    );

    try {
      const res = await apiFetch<{ syncedIds: string[]; syncedCount: number }>('/api/sync/queue', {
        method: 'POST',
        body: JSON.stringify({
          items: pending.map((p) => ({
            clientOfflineId: p.clientOfflineId,
            orderId: p.orderId,
            allocationId: p.allocationId,
            quantityReported: p.quantityReported,
            updateMode: p.updateMode,
            notes: p.notes,
          })),
        }),
      });

      const syncedSet = new Set(res.syncedIds);
      setQueuedItems((prev) =>
        prev.map((i) => (syncedSet.has(i.clientOfflineId) ? { ...i, syncStatus: 'synced' } : i))
      );
      setLastSyncMessage(`Synchronized ${res.syncedCount} queued update(s) with SHG ledger.`);
      return res.syncedCount;
    } catch (err) {
      setQueuedItems((prev) =>
        prev.map((i) => (i.syncStatus === 'pending_sync' ? { ...i, syncStatus: 'saved_locally' } : i))
      );
      setLastSyncMessage(
        err instanceof Error ? err.message : 'Sync paused; entries remain saved locally.'
      );
      return 0;
    } finally {
      setSyncing(false);
    }
  }, [isOffline, queuedItems]);

  useEffect(() => {
    const onOnline = () => setBrowserOnline(true);
    const onOffline = () => setBrowserOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Auto-sync when connectivity returns
  useEffect(() => {
    if (!isOffline && queuedItems.some((i) => i.syncStatus !== 'synced')) {
      syncNow();
    }
  }, [isOffline, queuedItems, syncNow]);

  const submitOrQueueProgress = async (input: {
    orderId: string;
    allocationId: string;
    productName: string;
    quantityReported: number;
    updateMode: 'tap' | 'voice';
    notes: string;
  }): Promise<{ status: 'synced' | 'saved_locally' | 'pending_sync' }> => {
    const clientOfflineId = `OFF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    if (isOffline) {
      const localItem: OfflineQueuedUpdate = {
        clientOfflineId,
        orderId: input.orderId,
        allocationId: input.allocationId,
        productName: input.productName,
        quantityReported: input.quantityReported,
        updateMode: input.updateMode,
        notes: input.notes,
        syncStatus: 'saved_locally',
        createdAt: now,
      };
      setQueuedItems((prev) => [localItem, ...prev]);
      return { status: 'saved_locally' };
    }

    try {
      await apiFetch('/api/member/progress', {
        method: 'POST',
        body: JSON.stringify({
          orderId: input.orderId,
          allocationId: input.allocationId,
          quantityReported: input.quantityReported,
          updateMode: input.updateMode,
          notes: input.notes,
          clientOfflineId,
        }),
      });
      return { status: 'synced' };
    } catch {
      const localItem: OfflineQueuedUpdate = {
        clientOfflineId,
        orderId: input.orderId,
        allocationId: input.allocationId,
        productName: input.productName,
        quantityReported: input.quantityReported,
        updateMode: input.updateMode,
        notes: input.notes,
        syncStatus: 'saved_locally',
        createdAt: now,
      };
      setQueuedItems((prev) => [localItem, ...prev]);
      return { status: 'saved_locally' };
    }
  };

  const clearSyncedHistory = () => {
    setQueuedItems((prev) => prev.filter((i) => i.syncStatus !== 'synced'));
  };

  const pendingCount = queuedItems.filter((i) => i.syncStatus !== 'synced').length;

  return (
    <OfflineContext.Provider
      value={{
        browserOnline,
        simulatedOffline,
        isOffline,
        setSimulatedOffline,
        queuedItems,
        pendingCount,
        syncing,
        lastSyncMessage,
        submitOrQueueProgress,
        syncNow,
        clearSyncedHistory,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error('useOffline must be used inside OfflineProvider');
  return ctx;
}
