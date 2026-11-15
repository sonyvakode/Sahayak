export type SupportedLanguage = 'en' | 'te' | 'hi' | 'kn';

export type UserRole = 'leader' | 'member';

export interface AuthUser {
  id: string;
  groupId: string;
  name: string;
  phone: string;
  role: UserRole;
  memberId: string | null;
  preferredLanguage: SupportedLanguage;
  isDemo: boolean;
}

export interface DemoAccount {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  preferred_language: SupportedLanguage;
  is_demo: number;
  member_id: string | null;
  skills: string | null;
}

export interface GroupInfo {
  id: string;
  name: string;
  village: string;
  district: string;
  state: string;
  default_language: SupportedLanguage;
}

export type OrderStatus =
  | 'intake_review'
  | 'pricing_pending'
  | 'allocation_pending'
  | 'in_progress'
  | 'quality_review'
  | 'payout_pending'
  | 'completed';

export interface OrderRecord {
  id: string;
  group_id: string;
  product_id: string | null;
  product_name: string;
  buyer_name: string;
  quantity: number;
  deadline_days: number;
  remaining_days: number;
  due_date: string;
  status: OrderStatus;
  raw_voice_transcript: string | null;
  intake_language: SupportedLanguage;
  sample_image_url?: string | null;
  price_per_unit?: number | null;
  suggested_selling_price?: number | null;
  worker_rate_per_piece?: number | null;
  pricing_status?: string | null;
  completed_qty?: number;
  accepted_qty?: number;
  rework_qty?: number;
  created_at: string;
}

export interface MemberRecord {
  id: string;
  group_id: string;
  user_id: string;
  name: string;
  phone?: string;
  skills: string;
  daily_capacity: number;
  past_workload: number;
  availability: 'available' | 'limited' | 'unavailable';
  preferred_language: SupportedLanguage;
  consent_given: number;
}

export interface OfflineQueuedUpdate {
  clientOfflineId: string;
  orderId: string;
  allocationId: string;
  productName: string;
  quantityReported: number;
  updateMode: 'tap' | 'voice';
  notes: string;
  syncStatus: 'saved_locally' | 'pending_sync' | 'synced';
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  actor_user_id: string;
  actor_name: string;
  actor_role: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  summary: string;
  created_at: string;
}
