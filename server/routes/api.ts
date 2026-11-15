import express from 'express';
import crypto from 'crypto';
import { db, appendLedgerEntry } from '../db/schema.ts';
import {
  requireAuth,
  requireLeader,
  signSessionToken,
  verifyPin,
  SESSION_COOKIE_NAME,
  type AuthenticatedRequest,
} from '../middleware/auth.ts';
import { runIntakeAgent } from '../agents/intakeAgent.ts';
import { runPricingAgent } from '../agents/pricingAgent.ts';
import { runAllocationAgent } from '../agents/allocationAgent.ts';
import { runTrackingQualityAgent } from '../agents/trackingQualityAgent.ts';
import { runPayoutAgentCalculation, runPayoutAudioSummary, buildMemberAudioScript } from '../agents/payoutAgent.ts';
import { getOrchestratorStatus } from '../agents/orchestrator.ts';
import {
  speechToTextService,
  type SupportedLanguage,
} from '../services/speechInterface.ts';

export const apiRouter = express.Router();

// ============================================================================
// 1. AUTHENTICATION & DEMO ACCOUNTS
// ============================================================================

apiRouter.get('/auth/demo-accounts', (_req, res) => {
  const accounts = db
    .prepare(
      `SELECT u.id, u.name, u.phone, u.role, u.preferred_language, u.is_demo, m.id as member_id, m.skills
       FROM users u
       LEFT JOIN members m ON m.user_id = u.id
       WHERE u.is_demo = 1
       ORDER BY CASE WHEN u.role = 'leader' THEN 0 ELSE 1 END, u.name ASC`
    )
    .all();
  res.json({ accounts, demoPinHint: '1234' });
});

apiRouter.post('/auth/login', (req, res) => {
  const { userId, phone, pin } = req.body as { userId?: string; phone?: string; pin?: string };

  let row:
    | {
        id: string;
        group_id: string;
        name: string;
        phone: string;
        role: 'leader' | 'member';
        preferred_language: 'en' | 'te' | 'hi' | 'kn';
        is_demo: number;
        pin_hash: string;
        member_id: string | null;
      }
    | undefined;

  if (userId) {
    row = db
      .prepare(
        `SELECT u.*, m.id as member_id FROM users u LEFT JOIN members m ON m.user_id = u.id WHERE u.id = ?`
      )
      .get(userId) as typeof row;
  } else if (phone) {
    row = db
      .prepare(
        `SELECT u.*, m.id as member_id FROM users u LEFT JOIN members m ON m.user_id = u.id WHERE u.phone = ?`
      )
      .get(phone.trim()) as typeof row;
  }

  if (!row) {
    res.status(401).json({ error: 'Account not found.' });
    return;
  }

  if (!row.is_demo && (!pin || !verifyPin(pin, row.pin_hash))) {
    res.status(401).json({ error: 'Invalid PIN.' });
    return;
  }

  if (row.is_demo && pin && !verifyPin(pin, row.pin_hash)) {
    res.status(401).json({ error: 'Invalid demo PIN (use 1234).' });
    return;
  }

  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const token = signSessionToken(row.id);
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    token,
    user: {
      id: row.id,
      groupId: row.group_id,
      name: row.name,
      phone: row.phone,
      role: row.role,
      memberId: row.member_id,
      preferredLanguage: row.preferred_language,
      isDemo: Boolean(row.is_demo),
    },
  });
});

apiRouter.post('/auth/logout', (req, res) => {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.clearCookie(SESSION_COOKIE_NAME, {
    path: '/',
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
  });
  res.json({ ok: true });
});

apiRouter.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.user!.groupId);
  res.json({ user: req.user, group });
});

// ============================================================================
// 2. SYSTEM / ORCHESTRATOR / SETTINGS
// ============================================================================

apiRouter.get('/system/status', requireAuth, (_req, res) => {
  res.json(getOrchestratorStatus());
});

apiRouter.patch('/settings/preferences', requireAuth, (req: AuthenticatedRequest, res) => {
  const { preferredLanguage, consentGiven } = req.body as {
    preferredLanguage?: SupportedLanguage;
    consentGiven?: boolean;
  };

  if (preferredLanguage && ['en', 'te', 'hi', 'kn'].includes(preferredLanguage)) {
    db.prepare('UPDATE users SET preferred_language = ? WHERE id = ?').run(
      preferredLanguage,
      req.user!.id
    );
    if (req.user!.memberId) {
      db.prepare('UPDATE members SET preferred_language = ? WHERE id = ?').run(
        preferredLanguage,
        req.user!.memberId
      );
    }
  }

  if (typeof consentGiven === 'boolean' && req.user!.memberId) {
    db.prepare('UPDATE members SET consent_given = ?, consent_updated_at = ? WHERE id = ?').run(
      consentGiven ? 1 : 0,
      new Date().toISOString(),
      req.user!.memberId
    );
    appendLedgerEntry({
      actorUserId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      actionType: 'CONSENT_UPDATED',
      entityType: 'member',
      entityId: req.user!.memberId,
      summary: `${req.user!.name} updated data consent preference to ${consentGiven ? 'granted' : 'revoked'}.`,
    });
  }

  res.json({ ok: true });
});

apiRouter.get('/ledger', requireAuth, (req: AuthenticatedRequest, res) => {
  if (req.user!.role === 'leader') {
    const entries = db
      .prepare('SELECT * FROM activity_ledger ORDER BY created_at DESC LIMIT 60')
      .all();
    res.json({ entries });
    return;
  }
  const entries = db
    .prepare(
      `SELECT * FROM activity_ledger
       WHERE actor_user_id = ? OR (entity_type = 'member' AND entity_id = ?)
       ORDER BY created_at DESC LIMIT 30`
    )
    .all(req.user!.id, req.user!.memberId ?? '');
  res.json({ entries });
});

// ============================================================================
// 3. LEADER DASHBOARD & MEMBERS
// ============================================================================

apiRouter.get('/leader/dashboard', requireAuth, requireLeader, (req: AuthenticatedRequest, res) => {
  const groupId = req.user!.groupId;
  const orders = db
    .prepare(
      `SELECT o.*, p.sample_image_url
       FROM orders o
       LEFT JOIN products p ON p.id = o.product_id
       WHERE o.group_id = ?
       ORDER BY o.created_at DESC`
    )
    .all(groupId) as Array<Record<string, unknown>>;

  const totalActiveOrders = orders.filter((o) => o.status !== 'completed').length;
  const ordersAwaitingApproval = orders.filter((o) =>
    ['intake_review', 'pricing_pending', 'allocation_pending', 'payout_pending'].includes(
      String(o.status)
    )
  ).length;
  const workInProgress = orders.filter((o) => o.status === 'in_progress').length;
  const completedOrders = orders.filter((o) => o.status === 'completed').length;

  const pendingInspectionsRow = db
    .prepare(
      `SELECT COALESCE(SUM(pu.quantity_reported), 0) - COALESCE((SELECT SUM(qi.inspected_qty) FROM quality_inspections qi), 0) as pending_qty
       FROM production_updates pu`
    )
    .get() as { pending_qty: number };

  const payoutTotals = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN approval_status = 'approved_by_group' THEN gross_earnings ELSE 0 END), 0) as approved_payouts,
         COALESCE(SUM(gross_earnings), 0) as total_earnings_recorded
       FROM payouts`
    )
    .get() as { approved_payouts: number; total_earnings_recorded: number };

  const memberActivity = db
    .prepare(
      `SELECT m.id, m.name, m.daily_capacity, m.availability, m.preferred_language,
              COALESCE((SELECT SUM(wa.allocated_qty) FROM work_allocations wa JOIN orders o ON o.id = wa.order_id WHERE wa.member_id = m.id AND o.status != 'completed'), 0) as active_assigned,
              COALESCE((SELECT SUM(pu.quantity_reported) FROM production_updates pu JOIN orders o ON o.id = pu.order_id WHERE pu.member_id = m.id AND o.status != 'completed'), 0) as active_completed,
              COALESCE((SELECT SUM(qi.accepted_qty) FROM quality_inspections qi JOIN orders o ON o.id = qi.order_id WHERE qi.member_id = m.id AND o.status != 'completed'), 0) as active_accepted
       FROM members m
       WHERE m.group_id = ?
       ORDER BY m.name ASC`
    )
    .all(groupId);

  const upcomingDeadlines = orders
    .filter((o) => o.status !== 'completed')
    .sort((a, b) => Number(a.remaining_days) - Number(b.remaining_days));

  res.json({
    metrics: {
      totalActiveOrders,
      ordersAwaitingApproval,
      workInProgress,
      completedOrders,
      pendingQualityInspections: Math.max(0, pendingInspectionsRow?.pending_qty ?? 0),
      totalGroupEarnings: payoutTotals.total_earnings_recorded,
      approvedGroupPayouts: payoutTotals.approved_payouts,
    },
    upcomingDeadlines,
    memberActivity,
    orders,
  });
});

apiRouter.get('/leader/members', requireAuth, requireLeader, (req: AuthenticatedRequest, res) => {
  const members = db
    .prepare(
      `SELECT m.*, u.phone, u.is_demo
       FROM members m
       JOIN users u ON u.id = m.user_id
       WHERE m.group_id = ?
       ORDER BY m.name ASC`
    )
    .all(req.user!.groupId);
  res.json({ members });
});

apiRouter.post('/leader/members', requireAuth, requireLeader, (req: AuthenticatedRequest, res) => {
  const { name, phone, skills, dailyCapacity, preferredLanguage, availability } = req.body as {
    name: string;
    phone: string;
    skills: string;
    dailyCapacity: number;
    preferredLanguage: SupportedLanguage;
    availability?: 'available' | 'limited' | 'unavailable';
  };

  if (!name?.trim() || !phone?.trim()) {
    res.status(400).json({ error: 'Member name and phone number are required.' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone.trim());
  if (existing) {
    res.status(409).json({ error: 'A member with this phone number already exists.' });
    return;
  }

  const now = new Date().toISOString();
  const userId = `USR-MEM-${Date.now().toString().slice(-5)}`;
  const memberId = `MEM-${Date.now().toString().slice(-5)}`;
  const pinHash = crypto.createHash('sha256').update('sahayakshg:1234').digest('hex');

  db.transaction(() => {
    db.prepare(`
      INSERT INTO users (id, group_id, name, phone, role, preferred_language, is_demo, pin_hash, created_at)
      VALUES (?, ?, ?, ?, 'member', ?, 1, ?, ?)
    `).run(userId, req.user!.groupId, name.trim(), phone.trim(), preferredLanguage || 'te', pinHash, now);

    db.prepare(`
      INSERT INTO members (
        id, group_id, user_id, name, skills, daily_capacity, past_workload,
        availability, preferred_language, consent_given, consent_updated_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 1, ?, ?)
    `).run(
      memberId,
      req.user!.groupId,
      userId,
      name.trim(),
      skills?.trim() || 'Cotton stitching',
      Math.max(1, Number(dailyCapacity) || 12),
      availability || 'available',
      preferredLanguage || 'te',
      now,
      now
    );

    appendLedgerEntry({
      actorUserId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      actionType: 'MEMBER_REGISTERED',
      entityType: 'member',
      entityId: memberId,
      summary: `Registered SHG member ${name.trim()} (${preferredLanguage || 'te'}).`,
    });
  })();

  res.status(201).json({ memberId, userId });
});

apiRouter.patch('/leader/members/:memberId', requireAuth, requireLeader, (req: AuthenticatedRequest, res) => {
  const { memberId } = req.params;
  const { skills, dailyCapacity, availability, preferredLanguage } = req.body as {
    skills?: string;
    dailyCapacity?: number;
    availability?: 'available' | 'limited' | 'unavailable';
    preferredLanguage?: SupportedLanguage;
  };

  db.prepare(`
    UPDATE members
    SET skills = COALESCE(?, skills),
        daily_capacity = COALESCE(?, daily_capacity),
        availability = COALESCE(?, availability),
        preferred_language = COALESCE(?, preferred_language)
    WHERE id = ? AND group_id = ?
  `).run(
    skills ?? null,
    dailyCapacity ?? null,
    availability ?? null,
    preferredLanguage ?? null,
    memberId,
    req.user!.groupId
  );

  res.json({ ok: true });
});

// ============================================================================
// 4. ORDERS & STEP 1: VOICE ORDER INTAKE
// ============================================================================

apiRouter.get('/orders', requireAuth, requireLeader, (req: AuthenticatedRequest, res) => {
  const orders = db
    .prepare(
      `SELECT o.*, p.sample_image_url,
              pr.price_per_unit, pr.suggested_selling_price, pr.worker_rate_per_piece, pr.status as pricing_status,
              COALESCE((SELECT SUM(pu.quantity_reported) FROM production_updates pu WHERE pu.order_id = o.id), 0) as completed_qty,
              COALESCE((SELECT SUM(qi.accepted_qty) FROM quality_inspections qi WHERE qi.order_id = o.id), 0) as accepted_qty,
              COALESCE((SELECT SUM(qi.rework_qty) FROM quality_inspections qi WHERE qi.order_id = o.id), 0) as rework_qty
       FROM orders o
       LEFT JOIN products p ON p.id = o.product_id
       LEFT JOIN pricing_records pr ON pr.order_id = o.id
       WHERE o.group_id = ?
       ORDER BY o.created_at DESC`
    )
    .all(req.user!.groupId);
  res.json({ orders });
});

apiRouter.get('/orders/:orderId', requireAuth, requireLeader, (req: AuthenticatedRequest, res) => {
  const order = db
    .prepare(
      `SELECT o.*, p.sample_image_url
       FROM orders o
       LEFT JOIN products p ON p.id = o.product_id
       WHERE o.id = ? AND o.group_id = ?`
    )
    .get(req.params.orderId, req.user!.groupId);

  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  const pricing = db
    .prepare('SELECT * FROM pricing_records WHERE order_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(req.params.orderId);

  const allocations = db
    .prepare(
      `SELECT wa.*, m.name as member_name, m.skills, m.daily_capacity, m.availability, m.past_workload,
              COALESCE((SELECT SUM(pu.quantity_reported) FROM production_updates pu WHERE pu.allocation_id = wa.id), 0) as completed_qty,
              COALESCE((SELECT SUM(qi.accepted_qty) FROM quality_inspections qi WHERE qi.allocation_id = wa.id), 0) as accepted_qty,
              COALESCE((SELECT SUM(qi.rework_qty) FROM quality_inspections qi WHERE qi.allocation_id = wa.id), 0) as rework_qty
       FROM work_allocations wa
       JOIN members m ON m.id = wa.member_id
       WHERE wa.order_id = ?
       ORDER BY m.name ASC`
    )
    .all(req.params.orderId);

  res.json({ order, pricing, allocations });
});

apiRouter.post('/speech/transcribe', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { audioBase64, mimeType, language } = req.body as {
    audioBase64: string;
    mimeType?: string;
    language?: SupportedLanguage;
  };
  if (!audioBase64) {
    res.status(400).json({ error: 'Audio payload is required.' });
    return;
  }
  const result = await speechToTextService.transcribe(
    audioBase64,
    mimeType || 'audio/webm',
    language || 'en'
  );
  res.json(result);
});

apiRouter.post('/agents/intake/extract', requireAuth, requireLeader, async (req: AuthenticatedRequest, res) => {
  const { transcript, language } = req.body as {
    transcript: string;
    language?: SupportedLanguage;
  };
  if (!transcript || !transcript.trim()) {
    res.status(400).json({ error: 'Please provide or record a voice transcript first.' });
    return;
  }
  const extracted = await runIntakeAgent(transcript, language || 'en');
  res.json(extracted);
});

apiRouter.post('/orders', requireAuth, requireLeader, (req: AuthenticatedRequest, res) => {
  const { productName, quantity, deadlineDays, buyerName, rawVoiceTranscript, intakeLanguage } =
    req.body as {
      productName: string;
      quantity: number;
      deadlineDays: number;
      buyerName?: string;
      rawVoiceTranscript?: string;
      intakeLanguage?: SupportedLanguage;
    };

  if (!productName?.trim() || !quantity || quantity <= 0 || !deadlineDays || deadlineDays <= 0) {
    res.status(400).json({ error: 'Product name, positive quantity, and deadline days are required.' });
    return;
  }

  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM orders').get() as { cnt: number };
  const orderNumber = String(13 + countRow.cnt).padStart(4, '0');
  const orderId = `ORD-2026-${orderNumber}`;
  const now = new Date().toISOString();
  const dueDate = new Date(Date.now() + Number(deadlineDays) * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const lower = productName.toLowerCase();
  const productId = lower.includes('jute') ? 'PRD-02' : lower.includes('cotton') ? 'PRD-01' : null;

  db.prepare(`
    INSERT INTO orders (
      id, group_id, product_id, product_name, buyer_name, quantity, deadline_days,
      remaining_days, due_date, status, raw_voice_transcript, intake_language,
      intake_confidence, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pricing_pending', ?, ?, 0.96, ?, ?, ?)
  `).run(
    orderId,
    req.user!.groupId,
    productId,
    productName.trim(),
    buyerName?.trim() || 'Direct Buyer Order',
    Math.floor(quantity),
    Math.floor(deadlineDays),
    Math.floor(deadlineDays),
    dueDate,
    rawVoiceTranscript?.trim() || '',
    intakeLanguage || 'en',
    req.user!.id,
    now,
    now
  );

  appendLedgerEntry({
    actorUserId: req.user!.id,
    actorName: req.user!.name,
    actorRole: req.user!.role,
    actionType: 'ORDER_CREATED',
    entityType: 'order',
    entityId: orderId,
    summary: `Created order ${orderId}: ${Math.floor(quantity)} ${productName.trim()} (${Math.floor(deadlineDays)} days).`,
  });

  res.status(201).json({ orderId });
});

// ============================================================================
// 5. STEP 2: DETERMINISTIC PRICING
// ============================================================================

apiRouter.post('/agents/pricing/calculate', requireAuth, requireLeader, async (req: AuthenticatedRequest, res) => {
  const { orderId, materialCost, laborHours, laborRatePerHour, overheadCost, profitMarginPct } =
    req.body as {
      orderId: string;
      materialCost: number;
      laborHours: number;
      laborRatePerHour: number;
      overheadCost: number;
      profitMarginPct: number;
    };

  const order = db
    .prepare('SELECT * FROM orders WHERE id = ? AND group_id = ?')
    .get(orderId, req.user!.groupId) as { id: string; product_name: string; quantity: number } | undefined;

  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  if (
    materialCost === undefined ||
    laborHours === undefined ||
    laborRatePerHour === undefined ||
    overheadCost === undefined ||
    profitMarginPct === undefined
  ) {
    res.status(400).json({ error: 'All cost inputs must be provided before calculating price.' });
    return;
  }

  const proposal = await runPricingAgent(order.product_name, {
    quantity: order.quantity,
    materialCost: Number(materialCost),
    laborHours: Number(laborHours),
    laborRatePerHour: Number(laborRatePerHour),
    overheadCost: Number(overheadCost),
    profitMarginPct: Number(profitMarginPct),
  });

  res.json(proposal);
});

apiRouter.post('/pricing/approve', requireAuth, requireLeader, async (req: AuthenticatedRequest, res) => {
  const { orderId, materialCost, laborHours, laborRatePerHour, overheadCost, profitMarginPct, isDemoSample } =
    req.body as {
      orderId: string;
      materialCost: number;
      laborHours: number;
      laborRatePerHour: number;
      overheadCost: number;
      profitMarginPct: number;
      isDemoSample?: boolean;
    };

  const order = db
    .prepare('SELECT * FROM orders WHERE id = ? AND group_id = ?')
    .get(orderId, req.user!.groupId) as { id: string; product_name: string; quantity: number; status: string } | undefined;

  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  const proposal = await runPricingAgent(order.product_name, {
    quantity: order.quantity,
    materialCost: Number(materialCost),
    laborHours: Number(laborHours),
    laborRatePerHour: Number(laborRatePerHour),
    overheadCost: Number(overheadCost),
    profitMarginPct: Number(profitMarginPct),
  });

  const c = proposal.calculations;
  const now = new Date().toISOString();
  const pricingId = `PRC-${orderId.slice(-4)}-${Date.now().toString().slice(-4)}`;

  db.transaction(() => {
    db.prepare(`
      INSERT INTO pricing_records (
        id, order_id, material_cost, labor_hours, labor_rate_per_hour, labor_cost,
        overhead_cost, profit_margin_pct, total_production_cost, suggested_selling_price,
        expected_profit, price_per_unit, worker_rate_per_piece, ai_explanation,
        is_demo_sample, status, approved_by, approved_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?, ?)
    `).run(
      pricingId,
      orderId,
      c.materialCost,
      c.laborHours,
      c.laborRatePerHour,
      c.laborCost,
      c.overheadCost,
      c.profitMarginPct,
      c.totalProductionCost,
      c.suggestedSellingPrice,
      c.expectedProfit,
      c.pricePerUnit,
      c.workerRatePerPiece,
      proposal.aiExplanation,
      isDemoSample ? 1 : 0,
      req.user!.id,
      now,
      now
    );

    if (order.status === 'pricing_pending' || order.status === 'intake_review') {
      db.prepare(`UPDATE orders SET status = 'allocation_pending', updated_at = ? WHERE id = ?`).run(
        now,
        orderId
      );
    }

    appendLedgerEntry({
      actorUserId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      actionType: 'PRICING_APPROVED',
      entityType: 'pricing',
      entityId: pricingId,
      summary: `Approved pricing for ${orderId}: ₹${c.suggestedSellingPrice} total (₹${c.pricePerUnit}/unit, ₹${c.workerRatePerPiece}/piece worker rate).`,
    });
  })();

  res.json({ pricingId, proposal });
});

// ============================================================================
// 6. STEP 3: FAIR WORK ALLOCATION
// ============================================================================

apiRouter.post('/agents/allocation/suggest', requireAuth, requireLeader, async (req: AuthenticatedRequest, res) => {
  const { orderId } = req.body as { orderId: string };
  const order = db
    .prepare('SELECT * FROM orders WHERE id = ? AND group_id = ?')
    .get(orderId, req.user!.groupId) as { id: string; product_name: string; quantity: number } | undefined;

  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  const members = db
    .prepare(
      `SELECT m.id, m.name, m.skills, m.daily_capacity, m.past_workload, m.availability,
              COALESCE((SELECT SUM(wa.allocated_qty) FROM work_allocations wa JOIN orders o ON o.id = wa.order_id WHERE wa.member_id = m.id AND o.status != 'completed' AND wa.order_id != ?), 0) as current_assigned_qty
       FROM members m
       WHERE m.group_id = ?`
    )
    .all(orderId, req.user!.groupId) as Array<{
    id: string;
    name: string;
    skills: string;
    daily_capacity: number;
    past_workload: number;
    availability: 'available' | 'limited' | 'unavailable';
    current_assigned_qty: number;
  }>;

  const proposal = await runAllocationAgent(
    order.id,
    order.product_name,
    order.quantity,
    members.map((m) => ({
      id: m.id,
      name: m.name,
      skills: m.skills,
      dailyCapacity: m.daily_capacity,
      pastWorkload: m.past_workload,
      currentAssignedQty: m.current_assigned_qty,
      availability: m.availability,
    }))
  );

  res.json(proposal);
});

apiRouter.post('/allocation/approve', requireAuth, requireLeader, (req: AuthenticatedRequest, res) => {
  const { orderId, allocations } = req.body as {
    orderId: string;
    allocations: Array<{ memberId: string; suggestedQty: number; allocatedQty: number; aiReason: string }>;
  };

  const order = db
    .prepare('SELECT * FROM orders WHERE id = ? AND group_id = ?')
    .get(orderId, req.user!.groupId) as { id: string; product_name: string; quantity: number } | undefined;

  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  const sumAllocated = allocations.reduce((s, a) => s + Math.max(0, Math.floor(a.allocatedQty)), 0);
  if (sumAllocated !== order.quantity) {
    res.status(400).json({
      error: `Allocated total (${sumAllocated}) must equal order quantity (${order.quantity}).`,
    });
    return;
  }

  const now = new Date().toISOString();
  db.transaction(() => {
    for (const a of allocations) {
      const qty = Math.max(0, Math.floor(a.allocatedQty));
      const existing = db
        .prepare('SELECT id FROM work_allocations WHERE order_id = ? AND member_id = ?')
        .get(orderId, a.memberId) as { id: string } | undefined;

      const allocId = existing?.id || `ALC-${orderId.slice(-4)}-${a.memberId.slice(-2)}`;

      if (existing) {
        db.prepare(`
          UPDATE work_allocations
          SET suggested_qty = ?, allocated_qty = ?, ai_reason = ?, status = 'approved',
              approved_by = ?, approved_at = ?, updated_at = ?
          WHERE id = ?
        `).run(a.suggestedQty, qty, a.aiReason, req.user!.id, now, now, allocId);

        db.prepare(`UPDATE tasks SET title = ? WHERE allocation_id = ?`).run(
          `Produce ${qty} ${order.product_name}`,
          allocId
        );
      } else {
        db.prepare(`
          INSERT INTO work_allocations (
            id, order_id, member_id, suggested_qty, allocated_qty, ai_reason,
            status, approved_by, approved_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'approved', ?, ?, ?, ?)
        `).run(allocId, orderId, a.memberId, a.suggestedQty, qty, a.aiReason, req.user!.id, now, now, now);

        db.prepare(`
          INSERT INTO tasks (
            id, order_id, allocation_id, member_id, title,
            instructions_en, instructions_te, instructions_hi, instructions_kn,
            status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'assigned', ?)
        `).run(
          `TSK-${allocId}`,
          orderId,
          allocId,
          a.memberId,
          `Produce ${qty} ${order.product_name}`,
          `Complete ${qty} units of ${order.product_name} following SHG stitch and finishing standards.`,
          `${order.product_name} కోసం ${qty} యూనిట్లు నాణ్యత ప్రమాణాలతో పూర్తి చేయండి.`,
          `${order.product_name} के ${qty} पीस समूह गुणवत्ता मानकों के अनुसार तैयार करें।`,
          `${order.product_name} ಗಾಗಿ ${qty} ಘಟಕಗಳನ್ನು ಗುಂಪಿನ ಗುಣಮಟ್ಟದ ನಿಯಮಗಳಂತೆ ಪೂರ್ಣಗೊಳಿಸಿ.`,
          now
        );
      }
    }

    db.prepare(`UPDATE orders SET status = 'in_progress', updated_at = ? WHERE id = ?`).run(
      now,
      orderId
    );

    appendLedgerEntry({
      actorUserId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      actionType: 'ALLOCATION_APPROVED',
      entityType: 'allocation',
      entityId: orderId,
      summary: `Approved work allocation for ${orderId} totaling ${order.quantity} ${order.product_name}.`,
      details: { allocations: allocations.map((x) => ({ memberId: x.memberId, qty: x.allocatedQty })) },
    });
  })();

  res.json({ ok: true });
});

// ============================================================================
// 7. STEP 4 & 5: PRODUCTION TRACKING, QUALITY, CONSOLIDATION & OFFLINE SYNC
// ============================================================================

apiRouter.get('/orders/:orderId/tracking', requireAuth, requireLeader, async (req: AuthenticatedRequest, res) => {
  const order = db
    .prepare('SELECT * FROM orders WHERE id = ? AND group_id = ?')
    .get(req.params.orderId, req.user!.groupId) as
    | { id: string; product_name: string; quantity: number; remaining_days: number; status: string }
    | undefined;

  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  const memberSnapshots = db
    .prepare(
      `SELECT wa.id as allocation_id, wa.member_id, m.name as member_name, m.daily_capacity,
              wa.allocated_qty,
              COALESCE((SELECT SUM(pu.quantity_reported) FROM production_updates pu WHERE pu.allocation_id = wa.id), 0) as completed_qty,
              COALESCE((SELECT SUM(qi.accepted_qty) FROM quality_inspections qi WHERE qi.allocation_id = wa.id), 0) as accepted_qty,
              COALESCE((SELECT SUM(qi.rework_qty) FROM quality_inspections qi WHERE qi.allocation_id = wa.id), 0) as rework_qty
       FROM work_allocations wa
       JOIN members m ON m.id = wa.member_id
       WHERE wa.order_id = ?
       ORDER BY m.name ASC`
    )
    .all(order.id) as Array<{
    allocation_id: string;
    member_id: string;
    member_name: string;
    daily_capacity: number;
    allocated_qty: number;
    completed_qty: number;
    accepted_qty: number;
    rework_qty: number;
  }>;

  const updates = db
    .prepare(
      `SELECT pu.*, m.name as member_name
       FROM production_updates pu
       JOIN members m ON m.id = pu.member_id
       WHERE pu.order_id = ?
       ORDER BY pu.created_at DESC`
    )
    .all(order.id);

  const inspections = db
    .prepare(
      `SELECT qi.*, m.name as member_name
       FROM quality_inspections qi
       JOIN members m ON m.id = qi.member_id
       WHERE qi.order_id = ?
       ORDER BY qi.decided_at DESC`
    )
    .all(order.id);

  const consolidation = await runTrackingQualityAgent(
    order.id,
    order.product_name,
    order.quantity,
    order.remaining_days,
    memberSnapshots.map((m) => ({
      memberId: m.member_id,
      memberName: m.member_name,
      allocatedQty: m.allocated_qty,
      completedQty: m.completed_qty,
      acceptedQty: m.accepted_qty,
      reworkQty: m.rework_qty,
      dailyCapacity: m.daily_capacity,
    }))
  );

  res.json({ order, memberSnapshots, updates, inspections, consolidation });
});

apiRouter.post('/quality/inspect', requireAuth, requireLeader, (req: AuthenticatedRequest, res) => {
  const { orderId, allocationId, memberId, acceptedQty, reworkQty, notes, samplePhotoUrl } =
    req.body as {
      orderId: string;
      allocationId: string;
      memberId: string;
      acceptedQty: number;
      reworkQty: number;
      notes?: string;
      samplePhotoUrl?: string;
    };

  const accepted = Math.max(0, Math.floor(Number(acceptedQty) || 0));
  const rework = Math.max(0, Math.floor(Number(reworkQty) || 0));
  const inspected = accepted + rework;

  if (!orderId || !allocationId || !memberId || inspected <= 0) {
    res.status(400).json({ error: 'Valid accepted/rework counts are required.' });
    return;
  }

  const now = new Date().toISOString();
  const qcId = `QC-${Date.now().toString().slice(-6)}`;

  db.transaction(() => {
    db.prepare(`
      INSERT INTO quality_inspections (
        id, order_id, allocation_id, member_id, inspected_qty, accepted_qty,
        rework_qty, notes, sample_photo_url, decision_by, decided_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      qcId,
      orderId,
      allocationId,
      memberId,
      inspected,
      accepted,
      rework,
      notes?.trim() || '',
      samplePhotoUrl || null,
      req.user!.id,
      now
    );

    // Automatically recalculate deterministic pending payout for this member & order
    const totalAcceptedRow = db
      .prepare(
        `SELECT COALESCE(SUM(accepted_qty), 0) as total_accepted
         FROM quality_inspections WHERE order_id = ? AND member_id = ?`
      )
      .get(orderId, memberId) as { total_accepted: number };

    const pricingRow = db
      .prepare(
        `SELECT worker_rate_per_piece FROM pricing_records WHERE order_id = ? ORDER BY created_at DESC LIMIT 1`
      )
      .get(orderId) as { worker_rate_per_piece: number } | undefined;

    const rate = pricingRow?.worker_rate_per_piece ?? 25;
    const totalAccepted = totalAcceptedRow.total_accepted;
    const gross = Math.round(totalAccepted * rate * 100) / 100;

    const existingPay = db
      .prepare('SELECT id FROM payouts WHERE order_id = ? AND member_id = ?')
      .get(orderId, memberId) as { id: string } | undefined;

    if (existingPay) {
      db.prepare(`
        UPDATE payouts
        SET accepted_pieces = ?, rate_per_piece = ?, gross_earnings = ?
        WHERE id = ?
      `).run(totalAccepted, rate, gross, existingPay.id);
    } else {
      db.prepare(`
        INSERT INTO payouts (
          id, order_id, member_id, accepted_pieces, rate_per_piece, gross_earnings,
          approval_status, transfer_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending_group_approval', 'awaiting_payment_rail', ?)
      `).run(`PAY-${orderId.slice(-4)}-${memberId.slice(-2)}`, orderId, memberId, totalAccepted, rate, gross, now);
    }

    appendLedgerEntry({
      actorUserId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      actionType: 'QUALITY_DECISION',
      entityType: 'quality',
      entityId: qcId,
      summary: `Leader quality decision for ${orderId}: ${accepted} accepted, ${rework} marked for rework.`,
    });
  })();

  res.status(201).json({ qcId });
});

// Leader update of completed production quantity for a member (reconciled with allocation & QC)
apiRouter.post('/orders/:orderId/production/update', requireAuth, requireLeader, (req: AuthenticatedRequest, res) => {
  const { orderId } = req.params;
  const { memberId, allocationId, completedQty, notes } = req.body as {
    memberId: string;
    allocationId?: string;
    completedQty: number;
    notes?: string;
  };

  const targetCompleted = Math.max(0, Math.floor(Number(completedQty) || 0));
  const alloc = db
    .prepare(
      allocationId
        ? 'SELECT * FROM work_allocations WHERE id = ? AND order_id = ? AND member_id = ?'
        : 'SELECT * FROM work_allocations WHERE order_id = ? AND member_id = ?'
    )
    .get(...(allocationId ? [allocationId, orderId, memberId] : [orderId, memberId])) as
    | { id: string; allocated_qty: number }
    | undefined;

  if (!alloc) {
    res.status(404).json({ error: 'Work allocation not found for this member and order.' });
    return;
  }

  if (targetCompleted > alloc.allocated_qty) {
    res.status(400).json({
      error: `Completed quantity (${targetCompleted}) cannot exceed assigned quantity (${alloc.allocated_qty}).`,
    });
    return;
  }

  const currentStats = db
    .prepare(
      `SELECT
         COALESCE((SELECT SUM(quantity_reported) FROM production_updates WHERE allocation_id = ?), 0) as current_completed,
         COALESCE((SELECT SUM(accepted_qty + rework_qty) FROM quality_inspections WHERE allocation_id = ?), 0) as current_inspected`
    )
    .get(alloc.id, alloc.id) as { current_completed: number; current_inspected: number };

  if (targetCompleted < currentStats.current_inspected) {
    res.status(400).json({
      error: `Completed quantity (${targetCompleted}) cannot be less than inspected pieces (${currentStats.current_inspected}).`,
    });
    return;
  }

  const delta = targetCompleted - currentStats.current_completed;
  const now = new Date().toISOString();

  db.transaction(() => {
    if (delta !== 0) {
      db.prepare(`
        INSERT INTO production_updates (
          id, order_id, allocation_id, member_id, quantity_reported, status, notes, sync_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', ?)
      `).run(
        `UPD-${Date.now().toString().slice(-6)}`,
        orderId,
        alloc.id,
        memberId,
        delta,
        targetCompleted >= alloc.allocated_qty ? 'completed' : 'in_progress',
        notes?.trim() || `Leader updated completed count to ${targetCompleted}`,
        now
      );
    }

    appendLedgerEntry({
      actorUserId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      actionType: 'LEADER_PRODUCTION_UPDATE',
      entityType: 'production',
      entityId: alloc.id,
      summary: `Leader set completed quantity for ${memberId} on ${orderId} to ${targetCompleted}.`,
    });
  })();

  res.json({ ok: true, completedQty: targetCompleted });
});

// Leader set/reconcile member accepted & rework counts (respects completed_qty boundary)
apiRouter.post('/orders/:orderId/quality/set-member', requireAuth, requireLeader, (req: AuthenticatedRequest, res) => {
  const { orderId } = req.params;
  const { memberId, allocationId, acceptedQty, reworkQty, notes } = req.body as {
    memberId: string;
    allocationId: string;
    acceptedQty: number;
    reworkQty: number;
    notes?: string;
  };

  const nextAccepted = Math.max(0, Math.floor(Number(acceptedQty) || 0));
  const nextRework = Math.max(0, Math.floor(Number(reworkQty) || 0));

  const currentStats = db
    .prepare(
      `SELECT
         COALESCE((SELECT SUM(quantity_reported) FROM production_updates WHERE allocation_id = ?), 0) as completed_qty,
         COALESCE((SELECT SUM(accepted_qty) FROM quality_inspections WHERE allocation_id = ?), 0) as cur_accepted,
         COALESCE((SELECT SUM(rework_qty) FROM quality_inspections WHERE allocation_id = ?), 0) as cur_rework`
    )
    .get(allocationId, allocationId, allocationId) as {
    completed_qty: number;
    cur_accepted: number;
    cur_rework: number;
  };

  if (nextAccepted + nextRework > currentStats.completed_qty) {
    res.status(400).json({
      error: `Accepted (${nextAccepted}) + Needs Rework (${nextRework}) cannot exceed completed pieces (${currentStats.completed_qty}).`,
    });
    return;
  }

  const deltaAccepted = nextAccepted - currentStats.cur_accepted;
  const deltaRework = nextRework - currentStats.cur_rework;
  const now = new Date().toISOString();
  const qcId = `QC-${Date.now().toString().slice(-6)}`;

  db.transaction(() => {
    db.prepare(`
      INSERT INTO quality_inspections (
        id, order_id, allocation_id, member_id, inspected_qty, accepted_qty,
        rework_qty, notes, sample_photo_url, decision_by, decided_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
    `).run(
      qcId,
      orderId,
      allocationId,
      memberId,
      deltaAccepted + deltaRework,
      deltaAccepted,
      deltaRework,
      notes?.trim() || `Updated quality totals: ${nextAccepted} accepted, ${nextRework} rework`,
      req.user!.id,
      now
    );

    const pricingRow = db
      .prepare(
        `SELECT worker_rate_per_piece FROM pricing_records WHERE order_id = ? ORDER BY created_at DESC LIMIT 1`
      )
      .get(orderId) as { worker_rate_per_piece: number } | undefined;

    const rate = pricingRow?.worker_rate_per_piece ?? 25;
    const gross = Math.round(nextAccepted * rate * 100) / 100;

    const existingPay = db
      .prepare('SELECT id FROM payouts WHERE order_id = ? AND member_id = ?')
      .get(orderId, memberId) as { id: string } | undefined;

    if (existingPay) {
      db.prepare(`
        UPDATE payouts
        SET accepted_pieces = ?, rate_per_piece = ?, gross_earnings = ?
        WHERE id = ?
      `).run(nextAccepted, rate, gross, existingPay.id);
    } else {
      db.prepare(`
        INSERT INTO payouts (
          id, order_id, member_id, accepted_pieces, rate_per_piece, gross_earnings,
          approval_status, transfer_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending_group_approval', 'awaiting_payment_rail', ?)
      `).run(`PAY-${orderId.slice(-4)}-${memberId.slice(-2)}`, orderId, memberId, nextAccepted, rate, gross, now);
    }

    appendLedgerEntry({
      actorUserId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      actionType: 'QUALITY_DECISION',
      entityType: 'quality',
      entityId: qcId,
      summary: `Leader updated quality for ${memberId} on ${orderId}: ${nextAccepted} accepted, ${nextRework} rework.`,
    });
  })();

  res.json({ ok: true, acceptedQty: nextAccepted, reworkQty: nextRework });
});

apiRouter.post('/consolidation/redistribute', requireAuth, requireLeader, (req: AuthenticatedRequest, res) => {
  const { orderId, fromMemberId, toMemberId, transferQty } = req.body as {
    orderId: string;
    fromMemberId: string;
    toMemberId: string;
    transferQty: number;
  };

  const qty = Math.max(1, Math.floor(Number(transferQty) || 0));
  if (!orderId || !fromMemberId || !toMemberId || fromMemberId === toMemberId) {
    res.status(400).json({ error: 'Valid source and target members are required.' });
    return;
  }

  const fromAlloc = db
    .prepare('SELECT * FROM work_allocations WHERE order_id = ? AND member_id = ?')
    .get(orderId, fromMemberId) as { id: string; allocated_qty: number } | undefined;
  const toAlloc = db
    .prepare('SELECT * FROM work_allocations WHERE order_id = ? AND member_id = ?')
    .get(orderId, toMemberId) as { id: string; allocated_qty: number } | undefined;

  if (!fromAlloc || !toAlloc || fromAlloc.allocated_qty < qty) {
    res.status(400).json({ error: 'Insufficient allocated quantity to transfer.' });
    return;
  }

  const now = new Date().toISOString();
  db.transaction(() => {
    db.prepare('UPDATE work_allocations SET allocated_qty = allocated_qty - ?, updated_at = ? WHERE id = ?').run(
      qty,
      now,
      fromAlloc.id
    );
    db.prepare('UPDATE work_allocations SET allocated_qty = allocated_qty + ?, updated_at = ? WHERE id = ?').run(
      qty,
      now,
      toAlloc.id
    );
    appendLedgerEntry({
      actorUserId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      actionType: 'WORK_REDISTRIBUTED',
      entityType: 'allocation',
      entityId: orderId,
      summary: `Leader approved redistribution of ${qty} pieces in ${orderId} from ${fromMemberId} to ${toMemberId}.`,
    });
  })();

  res.json({ ok: true });
});

// ============================================================================
// 8. STEP 6: PAYOUTS (GROUP APPROVAL & HISTORY)
// ============================================================================

apiRouter.get('/leader/payouts', requireAuth, requireLeader, async (req: AuthenticatedRequest, res) => {
  const orderId = (req.query.orderId as string) || 'ORD-2026-0012';
  const rows = db
    .prepare(
      `SELECT p.*, m.name as member_name, o.product_name
       FROM payouts p
       JOIN members m ON m.id = p.member_id
       JOIN orders o ON o.id = p.order_id
       WHERE p.order_id = ?
       ORDER BY m.name ASC`
    )
    .all(orderId) as Array<{
    id: string;
    order_id: string;
    member_id: string;
    member_name: string;
    product_name: string;
    accepted_pieces: number;
    rate_per_piece: number;
    gross_earnings: number;
    approval_status: string;
    transfer_status: string;
    approved_at: string | null;
  }>;

  const summary = await runPayoutAgentCalculation(
    rows.map((r) => ({
      memberId: r.member_id,
      memberName: r.member_name,
      acceptedPieces: r.accepted_pieces,
      ratePerPiece: r.rate_per_piece,
    }))
  );

  const history = db
    .prepare(
      `SELECT p.order_id, o.product_name,
              SUM(p.accepted_pieces) as total_accepted,
              SUM(p.gross_earnings) as total_payout,
              MAX(p.approval_status) as approval_status,
              MAX(p.transfer_status) as transfer_status,
              MAX(p.approved_at) as approved_at
       FROM payouts p
       JOIN orders o ON o.id = p.order_id
       GROUP BY p.order_id, o.product_name
       ORDER BY o.created_at DESC`
    )
    .all();

  res.json({ orderId, payouts: rows, summary, history });
});

apiRouter.post('/leader/payouts/approve', requireAuth, requireLeader, (req: AuthenticatedRequest, res) => {
  const { orderId } = req.body as { orderId: string };
  if (!orderId) {
    res.status(400).json({ error: 'orderId is required.' });
    return;
  }

  const now = new Date().toISOString();
  db.transaction(() => {
    db.prepare(`
      UPDATE payouts
      SET approval_status = 'approved_by_group',
          approved_by = ?,
          approved_at = ?
      WHERE order_id = ?
    `).run(req.user!.id, now, orderId);

    appendLedgerEntry({
      actorUserId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      actionType: 'GROUP_PAYOUT_APPROVED',
      entityType: 'payout',
      entityId: orderId,
      summary: `Group payout approved for ${orderId}. Transfer remains awaiting confirmed payment rail.`,
    });
  })();

  res.json({ ok: true });
});

// ============================================================================
// 9. MEMBER PORTAL (STRICT SELF-ONLY PRIVACY ISOLATION)
// ============================================================================

apiRouter.get('/member/dashboard', requireAuth, (req: AuthenticatedRequest, res) => {
  if (!req.user!.memberId) {
    res.status(403).json({ error: 'Only SHG member accounts have personal member workspaces.' });
    return;
  }
  const memberId = req.user!.memberId;

  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId);
  const workItems = db
    .prepare(
      `SELECT wa.id as allocation_id, wa.order_id, o.product_name, o.buyer_name, o.due_date, o.remaining_days, o.status as order_status,
              wa.allocated_qty, wa.ai_reason,
              t.title as task_title, t.instructions_en, t.instructions_te, t.instructions_hi, t.instructions_kn,
              COALESCE((SELECT SUM(pu.quantity_reported) FROM production_updates pu WHERE pu.allocation_id = wa.id), 0) as completed_qty,
              COALESCE((SELECT SUM(qi.accepted_qty) FROM quality_inspections qi WHERE qi.allocation_id = wa.id), 0) as accepted_qty,
              COALESCE((SELECT SUM(qi.rework_qty) FROM quality_inspections qi WHERE qi.allocation_id = wa.id), 0) as rework_qty,
              pr.worker_rate_per_piece
       FROM work_allocations wa
       JOIN orders o ON o.id = wa.order_id
       LEFT JOIN tasks t ON t.allocation_id = wa.id
       LEFT JOIN pricing_records pr ON pr.order_id = o.id
       WHERE wa.member_id = ?
       ORDER BY CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END, o.remaining_days ASC`
    )
    .all(memberId);

  const updates = db
    .prepare(
      `SELECT pu.*, o.product_name
       FROM production_updates pu
       JOIN orders o ON o.id = pu.order_id
       WHERE pu.member_id = ?
       ORDER BY pu.created_at DESC
       LIMIT 20`
    )
    .all(memberId);

  const payouts = db
    .prepare(
      `SELECT p.*, o.product_name
       FROM payouts p
       JOIN orders o ON o.id = p.order_id
       WHERE p.member_id = ?
       ORDER BY p.created_at DESC`
    )
    .all(memberId);

  res.json({ member, workItems, updates, payouts });
});

// Explicit privacy guard: members cannot read another member's private earnings
apiRouter.get('/members/:memberId/earnings', requireAuth, (req: AuthenticatedRequest, res) => {
  if (req.user!.role === 'member' && req.user!.memberId !== req.params.memberId) {
    res.status(403).json({
      error: 'Privacy protection: Members can only view their own personal earnings.',
    });
    return;
  }
  const payouts = db
    .prepare(
      `SELECT p.*, o.product_name
       FROM payouts p
       JOIN orders o ON o.id = p.order_id
       WHERE p.member_id = ?`
    )
    .all(req.params.memberId);
  res.json({ payouts });
});

apiRouter.post('/member/progress', requireAuth, (req: AuthenticatedRequest, res) => {
  if (!req.user!.memberId) {
    res.status(403).json({ error: 'Only members can submit personal production updates.' });
    return;
  }
  const { orderId, allocationId, quantityReported, updateMode, notes, clientOfflineId } = req.body as {
    orderId: string;
    allocationId: string;
    quantityReported: number;
    updateMode?: 'tap' | 'voice';
    notes?: string;
    clientOfflineId?: string;
  };

  const qty = Math.floor(Number(quantityReported));
  if (!orderId || !allocationId || !qty || qty <= 0) {
    res.status(400).json({ error: 'Positive quantity is required.' });
    return;
  }

  const alloc = db
    .prepare('SELECT id, member_id FROM work_allocations WHERE id = ? AND order_id = ?')
    .get(allocationId, orderId) as { id: string; member_id: string } | undefined;

  if (!alloc || alloc.member_id !== req.user!.memberId) {
    res.status(403).json({ error: 'You can only update your own assigned work.' });
    return;
  }

  // Idempotent offline sync protection
  if (clientOfflineId) {
    const existing = db
      .prepare('SELECT id FROM production_updates WHERE client_offline_id = ?')
      .get(clientOfflineId) as { id: string } | undefined;
    if (existing) {
      res.json({ updateId: existing.id, syncStatus: 'synced', deduplicated: true });
      return;
    }
  }

  const now = new Date().toISOString();
  const updateId = `PRD-${Date.now().toString().slice(-6)}`;

  db.transaction(() => {
    db.prepare(`
      INSERT INTO production_updates (
        id, order_id, allocation_id, member_id, quantity_reported,
        update_mode, notes, client_offline_id, sync_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)
    `).run(
      updateId,
      orderId,
      allocationId,
      req.user!.memberId,
      qty,
      updateMode || 'tap',
      notes?.trim() || '',
      clientOfflineId || null,
      now
    );

    appendLedgerEntry({
      actorUserId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      actionType: 'PRODUCTION_UPDATED',
      entityType: 'production',
      entityId: orderId,
      summary: `${req.user!.name} reported +${qty} completed pieces for ${orderId} (${updateMode || 'tap'}).`,
    });
  })();

  res.status(201).json({ updateId, syncStatus: 'synced' });
});

// Batch sync endpoint for queued offline updates
apiRouter.post('/sync/queue', requireAuth, (req: AuthenticatedRequest, res) => {
  if (!req.user!.memberId) {
    res.status(403).json({ error: 'Member account required for offline production sync.' });
    return;
  }
  const { items } = req.body as {
    items: Array<{
      clientOfflineId: string;
      orderId: string;
      allocationId: string;
      quantityReported: number;
      updateMode: 'tap' | 'voice';
      notes?: string;
    }>;
  };

  if (!Array.isArray(items)) {
    res.status(400).json({ error: 'Items array is required.' });
    return;
  }

  const syncedIds: string[] = [];
  const now = new Date().toISOString();

  db.transaction(() => {
    for (const item of items) {
      const existing = db
        .prepare('SELECT id FROM production_updates WHERE client_offline_id = ?')
        .get(item.clientOfflineId);
      if (existing) {
        syncedIds.push(item.clientOfflineId);
        continue;
      }

      const alloc = db
        .prepare('SELECT id FROM work_allocations WHERE id = ? AND order_id = ? AND member_id = ?')
        .get(item.allocationId, item.orderId, req.user!.memberId);
      if (!alloc) continue;

      const updateId = `PRD-${Date.now().toString().slice(-5)}-${crypto.randomBytes(2).toString('hex')}`;
      db.prepare(`
        INSERT INTO production_updates (
          id, order_id, allocation_id, member_id, quantity_reported,
          update_mode, notes, client_offline_id, sync_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)
      `).run(
        updateId,
        item.orderId,
        item.allocationId,
        req.user!.memberId,
        Math.max(1, Math.floor(item.quantityReported)),
        item.updateMode || 'tap',
        item.notes || 'Synced from offline queue',
        item.clientOfflineId,
        now
      );

      appendLedgerEntry({
        actorUserId: req.user!.id,
        actorName: req.user!.name,
        actorRole: req.user!.role,
        actionType: 'OFFLINE_UPDATE_SYNCED',
        entityType: 'production',
        entityId: item.orderId,
        summary: `Synced queued offline update (+${item.quantityReported} pcs) for ${req.user!.name}.`,
      });
      syncedIds.push(item.clientOfflineId);
    }
  })();

  res.json({ syncedIds, syncedCount: syncedIds.length });
});

// Dedicated Member Audio Playback endpoint — strictly scoped to logged-in member!
apiRouter.post('/member/audio-summary', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.user!.memberId) {
    res.status(403).json({
      error: 'Audio earnings playback is strictly scoped to a logged-in SHG member.',
    });
    return;
  }

  const { orderId, language, requestedMemberId } = req.body as {
    orderId?: string;
    language?: SupportedLanguage;
    requestedMemberId?: string;
  };

  if (requestedMemberId && requestedMemberId !== req.user!.memberId) {
    res.status(403).json({
      error: 'Privacy boundary: You cannot play another member’s private earnings audio.',
    });
    return;
  }

  const targetOrderId = orderId || 'ORD-2026-0012';
  const lang: SupportedLanguage = language || req.user!.preferredLanguage || 'te';

  const payoutRow = db
    .prepare(
      `SELECT p.*, m.name as member_name, o.product_name,
              COALESCE((SELECT SUM(pu.quantity_reported) FROM production_updates pu WHERE pu.order_id = p.order_id AND pu.member_id = p.member_id), p.accepted_pieces) as completed_pieces
       FROM payouts p
       JOIN members m ON m.id = p.member_id
       JOIN orders o ON o.id = p.order_id
       WHERE p.member_id = ? AND p.order_id = ?`
    )
    .get(req.user!.memberId, targetOrderId) as
    | {
        member_name: string;
        order_id: string;
        product_name: string;
        completed_pieces: number;
        accepted_pieces: number;
        rate_per_piece: number;
        gross_earnings: number;
        approval_status: string;
      }
    | undefined;

  if (!payoutRow) {
    res.status(404).json({ error: 'No payout summary found for your account on this order.' });
    return;
  }

  const ttsResult = await runPayoutAudioSummary({
    memberName: payoutRow.member_name,
    orderId: payoutRow.order_id,
    productName: payoutRow.product_name,
    completedPieces: payoutRow.completed_pieces,
    acceptedPieces: payoutRow.accepted_pieces,
    ratePerPiece: payoutRow.rate_per_piece,
    grossEarnings: payoutRow.gross_earnings,
    approvalStatus: payoutRow.approval_status,
    language: lang,
  });

  db.prepare(`
    INSERT INTO audio_summaries (id, member_id, order_id, language, script_text, audio_provider, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    `AUD-${Date.now().toString().slice(-6)}`,
    req.user!.memberId,
    payoutRow.order_id,
    lang,
    ttsResult.scriptText,
    ttsResult.provider,
    new Date().toISOString()
  );

  res.json({
    payout: payoutRow,
    audio: ttsResult,
  });
});

// Preview script without calling TTS
apiRouter.get('/member/audio-preview', requireAuth, (req: AuthenticatedRequest, res) => {
  if (!req.user!.memberId) {
    res.status(403).json({ error: 'Member account required.' });
    return;
  }
  const targetOrderId = (req.query.orderId as string) || 'ORD-2026-0012';
  const lang = ((req.query.language as string) || req.user!.preferredLanguage || 'te') as SupportedLanguage;

  const payoutRow = db
    .prepare(
      `SELECT p.*, m.name as member_name, o.product_name,
              COALESCE((SELECT SUM(pu.quantity_reported) FROM production_updates pu WHERE pu.order_id = p.order_id AND pu.member_id = p.member_id), p.accepted_pieces) as completed_pieces
       FROM payouts p
       JOIN members m ON m.id = p.member_id
       JOIN orders o ON o.id = p.order_id
       WHERE p.member_id = ? AND p.order_id = ?`
    )
    .get(req.user!.memberId, targetOrderId) as
    | {
        member_name: string;
        order_id: string;
        product_name: string;
        completed_pieces: number;
        accepted_pieces: number;
        rate_per_piece: number;
        gross_earnings: number;
        approval_status: string;
      }
    | undefined;

  if (!payoutRow) {
    res.status(404).json({ error: 'No earnings record for this order.' });
    return;
  }

  const scriptText = buildMemberAudioScript({
    memberName: payoutRow.member_name,
    orderId: payoutRow.order_id,
    productName: payoutRow.product_name,
    completedPieces: payoutRow.completed_pieces,
    acceptedPieces: payoutRow.accepted_pieces,
    ratePerPiece: payoutRow.rate_per_piece,
    grossEarnings: payoutRow.gross_earnings,
    approvalStatus: payoutRow.approval_status,
    language: lang,
  });

  res.json({ payout: payoutRow, scriptText, language: lang });
});
