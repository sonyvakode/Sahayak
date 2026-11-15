import { AlertCircle, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import type { OrderStatus } from '../types';

export function OrderStatusText({ status }: { status: OrderStatus | string }) {
  const map: Record<string, { label: string; colorClass: string; icon: 'check' | 'clock' | 'warn' }> = {
    intake_review: { label: 'Intake Review', colorClass: 'text-[#8274A8]', icon: 'clock' },
    pricing_pending: { label: 'Awaiting Pricing Approval', colorClass: 'text-[#B45309]', icon: 'warn' },
    allocation_pending: { label: 'Awaiting Work Allocation', colorClass: 'text-[#B45309]', icon: 'warn' },
    in_progress: { label: 'In Production', colorClass: 'text-[#075B62]', icon: 'clock' },
    quality_review: { label: 'Quality Inspection', colorClass: 'text-[#8274A8]', icon: 'warn' },
    payout_pending: { label: 'Payout Awaiting Group Approval', colorClass: 'text-[#B45309]', icon: 'warn' },
    completed: { label: 'Completed', colorClass: 'text-[#14532D]', icon: 'check' },
  };

  const info = map[status] || { label: status, colorClass: 'text-[#252525]', icon: 'clock' };

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${info.colorClass}`}>
      {info.icon === 'check' && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
      {info.icon === 'clock' && <Clock className="w-3.5 h-3.5 shrink-0" />}
      {info.icon === 'warn' && <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
      <span>{info.label}</span>
    </span>
  );
}

export function SyncStateIndicator({
  syncStatus,
}: {
  syncStatus: 'saved_locally' | 'pending_sync' | 'synced';
}) {
  if (syncStatus === 'synced') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#14532D]">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>Synchronized</span>
      </span>
    );
  }
  if (syncStatus === 'pending_sync') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#075B62]">
        <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
        <span>Pending Sync</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B45309]">
      <Clock className="w-3.5 h-3.5 shrink-0" />
      <span>Saved Locally</span>
    </span>
  );
}
